/**
 * REGION E: GAP/OVERLAP ANALYZER
 */
import { vec } from '../../utils/math';
import { registerRule, logRuleExecution } from '../ruleRegistry';

[
  "R-GAP-01", "R-GAP-02", "R-GAP-03", "R-GAP-04", "R-GAP-05", "R-GAP-06", "R-GAP-07", "R-GAP-08",
  "R-OVR-01", "R-OVR-02", "R-OVR-03", "R-OVR-04", "R-OVR-05", "R-OVR-06"
].forEach(ruleId => registerRule(ruleId));

export function analyzeGap(gapVector, context, current, next, config, log) {
  const cfg = config.smartFixer || {};
  const negligible = cfg.negligibleGap ?? 1.0;
  const autoFillMax = cfg.autoFillMaxGap ?? 25.0;
  const reviewMax = cfg.reviewGapMax ?? 100.0;
  const silentSnap = cfg.silentSnapThreshold ?? 2.0;

  const gapMag = vec.mag(gapVector);

  if (gapMag < negligible) {
    if (gapMag > 0.1) {
      logRuleExecution("R-GAP-01", current._rowIndex);
      return { type: "SNAP", ruleId: "R-GAP-01", tier: 1,
        description: `SNAP [R-GAP-01]: Close ${gapMag.toFixed(2)}mm micro-gap by snapping endpoints.`,
        gapVector, current, next };
    }
    return null;
  }

  const axes = decomposeGap(gapVector, cfg.offAxisThreshold ?? 0.5);
  const alongTravel = axes.find(a => a.axis === context.travelAxis);
  const lateral = axes.filter(a => a.axis !== context.travelAxis);
  const totalLateral = lateral.reduce((s, a) => s + Math.abs(a.delta), 0);
  const alongDelta = alongTravel ? alongTravel.delta : 0;
  const isOverlap = alongDelta * context.travelDirection < 0;

  if (isOverlap && axes.length === 1 && axes[0].axis === context.travelAxis) {
    return analyzeOverlap(Math.abs(alongDelta), context, current, next, cfg, log);
  }

  if (axes.length === 1 && axes[0].axis === context.travelAxis) {
    const gapAmt = Math.abs(alongDelta);
    const dir = directionLabel(context.travelAxis, context.travelDirection);

    if (gapAmt <= autoFillMax) {
      logRuleExecution("R-GAP-02", current._rowIndex);
      return { type: "INSERT", ruleId: "R-GAP-02", tier: 2,
        description: `INSERT [R-GAP-02]: Fill ${gapAmt.toFixed(1)}mm gap along ${dir}.`,
        gapAmount: gapAmt, fillAxis: context.travelAxis, fillDir: context.travelDirection,
        current, next };
    }
    if (gapAmt <= reviewMax) {
      logRuleExecution("R-GAP-03", current._rowIndex);
      return { type: "REVIEW", ruleId: "R-GAP-03", tier: 3,
        description: `REVIEW [R-GAP-03]: ${gapAmt.toFixed(1)}mm gap along ${dir}. Exceeds auto-fill threshold.`,
        current, next };
    }
    logRuleExecution("R-GAP-03", current._rowIndex);
    return { type: "ERROR", ruleId: "R-GAP-03", tier: 4,
      description: `ERROR [R-GAP-03]: ${gapAmt.toFixed(1)}mm major gap along ${dir}.`,
      current, next };
  }

  if (axes.length === 1 && axes[0].axis !== context.travelAxis) {
    const latAmt = Math.abs(axes[0].delta);
    if (latAmt < silentSnap) {
      logRuleExecution("R-GAP-04", current._rowIndex);
      return { type: "SNAP", ruleId: "R-GAP-04", tier: 2,
        description: `SNAP [R-GAP-04]: Lateral offset ${latAmt.toFixed(1)}mm on ${axes[0].axis}. Snapping.`,
        current, next };
    }
    logRuleExecution("R-GAP-04", current._rowIndex);
    return { type: "ERROR", ruleId: "R-GAP-04", tier: 4,
      description: `ERROR [R-GAP-04]: Lateral offset ${latAmt.toFixed(1)}mm on ${axes[0].axis}. Manual review.`,
      current, next };
  }

  if (axes.length >= 2 && totalLateral < silentSnap && Math.abs(alongDelta) <= autoFillMax) {
    logRuleExecution("R-GAP-05", current._rowIndex);
    const gapAmt = Math.abs(alongDelta);
    return { type: "INSERT", ruleId: "R-GAP-05", tier: 2,
      description: `INSERT [R-GAP-05]: Multi-axis gap (axial=${gapAmt.toFixed(1)}mm, lateral=${totalLateral.toFixed(1)}mm). Lateral snapped.`,
      gapAmount: gapAmt, fillAxis: context.travelAxis, fillDir: context.travelDirection,
      current, next };
  }

  logRuleExecution("R-GAP-06", current._rowIndex);
  return { type: "ERROR", ruleId: "R-GAP-06", tier: 4,
    description: `ERROR [R-GAP-06]: Multi-axis gap (${formatGapAxes(axes)}). Cannot auto-fill.`,
    current, next };
}

function analyzeOverlap(overlapAmt, context, current, next, cfg, log) {
  const autoTrimMax = cfg.autoTrimMaxOverlap ?? 25.0;
  const currType = (current.type || "").toUpperCase();
  const nextType = (next.type || "").toUpperCase();

  if (currType !== "PIPE" && nextType !== "PIPE") {
    logRuleExecution("R-OVR-03", current._rowIndex);
    return { type: "ERROR", ruleId: "R-OVR-03", tier: 4,
      description: `ERROR [R-OVR-03]: ${currType} overlaps ${nextType} by ${overlapAmt.toFixed(1)}mm. Rigid-on-rigid.`,
      current, next };
  }

  if (currType === "PIPE" && overlapAmt <= autoTrimMax) {
    logRuleExecution("R-OVR-01", current._rowIndex);
    return { type: "TRIM", ruleId: "R-OVR-01", tier: 2,
      description: `TRIM [R-OVR-01]: Reduce PIPE EP2 by ${overlapAmt.toFixed(1)}mm.`,
      trimAmount: overlapAmt, trimTarget: "current", current, next };
  }

  if (currType !== "PIPE" && nextType === "PIPE" && overlapAmt <= autoTrimMax) {
    logRuleExecution("R-OVR-02", current._rowIndex);
    return { type: "TRIM", ruleId: "R-OVR-02", tier: 2,
      description: `TRIM [R-OVR-02]: Reduce next PIPE EP1 by ${overlapAmt.toFixed(1)}mm.`,
      trimAmount: overlapAmt, trimTarget: "next", current, next };
  }

  logRuleExecution("R-OVR-01", current._rowIndex);
  return { type: "REVIEW", ruleId: "R-OVR-01", tier: 3,
    description: `REVIEW [R-OVR-01]: ${overlapAmt.toFixed(1)}mm overlap. Exceeds auto-trim threshold.`,
    current, next };
}

function decomposeGap(gapVec, threshold) {
  const result = [];
  if (Math.abs(gapVec.x) > threshold) result.push({ axis: "X", delta: gapVec.x });
  if (Math.abs(gapVec.y) > threshold) result.push({ axis: "Y", delta: gapVec.y });
  if (Math.abs(gapVec.z) > threshold) result.push({ axis: "Z", delta: gapVec.z });
  return result;
}

function directionLabel(axis, dir) {
  const map = { X: ["+X(East)", "-X(West)"], Y: ["+Y(North)", "-Y(South)"], Z: ["+Z(Up)", "-Z(Down)"] };
  return axis ? (dir > 0 ? map[axis][0] : map[axis][1]) : "unknown";
}

function formatGapAxes(axes) {
  return axes.map(a => `${a.axis}=${a.delta.toFixed(1)}mm`).join(", ");
}
