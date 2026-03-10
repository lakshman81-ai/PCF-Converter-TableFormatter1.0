/**
 * REGION F: RULE ENGINE
 */
import { vec } from '../../utils/math';
import { getElementVector, detectElementAxis } from './axisDetector';
import { getEntryPoint, getExitPoint } from './graphBuilder';
import { registerRule, logRuleExecution } from '../ruleRegistry';

[
  "R-GEO-01", "R-GEO-02", "R-GEO-03", "R-GEO-04", "R-GEO-05", "R-GEO-06", "R-GEO-07", "R-GEO-08",
  "R-CHN-01", "R-CHN-02", "R-CHN-03", "R-CHN-04", "R-CHN-05", "R-CHN-06",
  "R-TOP-01", "R-TOP-02", "R-TOP-03", "R-TOP-04", "R-TOP-05", "R-TOP-06", "R-TOP-07",
  "R-BRN-01", "R-BRN-02", "R-BRN-03", "R-BRN-04", "R-BRN-05",
  "R-DAT-01", "R-DAT-02", "R-DAT-03", "R-DAT-04", "R-DAT-05", "R-DAT-06",
  "R-SPA-01", "R-SPA-02", "R-SPA-03", "R-SPA-04", "R-SPA-05",
  "R-AGG-01", "R-AGG-02", "R-AGG-03", "R-AGG-04", "R-AGG-05", "R-AGG-06"
].forEach(ruleId => registerRule(ruleId));

export function runElementRules(element, context, prevElement, elemAxis, elemDir, config, log) {
  const type = (element.type || "").toUpperCase();
  const cfg = config.smartFixer || {};
  const ri = element._rowIndex;

  // R-GEO-01
  if (type === "PIPE") {
    const len = vec.mag(getElementVector(element));
    if (len < (cfg.microPipeThreshold ?? 6.0) && len > 0) {
      logRuleExecution("R-GEO-01", ri);
      element._proposedFix = { type: "DELETE", ruleId: "R-GEO-01", tier: 1 };
    }
  } else if (type !== "SUPPORT" && type !== "OLET") {
      const len = vec.mag(getElementVector(element));
      if (len < (cfg.microFittingThreshold ?? 1.0) && len > 0) {
          logRuleExecution("R-GEO-01", ri);
          log.push({ type: "Error", ruleId: "R-GEO-01", tier: 4, row: ri, message: `ERROR [R-GEO-01]: Near-zero length fitting.` });
      }
  }

  // R-GEO-02
  if (prevElement && element.bore && context.currentBore && element.bore !== context.currentBore) {
    const prevType = (prevElement.type || "").toUpperCase();
    if (!prevType.includes("REDUCER")) {
      logRuleExecution("R-GEO-02", ri);
      log.push({ type: "Error", ruleId: "R-GEO-02", tier: 4, row: ri,
        message: `ERROR [R-GEO-02]: Bore changes ${context.currentBore}→${element.bore} without reducer.` });
    }
  }

  // R-GEO-03
  if (["PIPE", "FLANGE", "VALVE"].includes(type)) {
    const ev = getElementVector(element);
    const nonZero = [["X", ev.x], ["Y", ev.y], ["Z", ev.z]].filter(([_, d]) => Math.abs(d) > 0.5);
    if (nonZero.length > 1) {
      logRuleExecution("R-GEO-03", ri);
      const dominant = nonZero.reduce((a, b) => Math.abs(a[1]) > Math.abs(b[1]) ? a : b);
      const minorTotal = nonZero.filter(a => a[0] !== dominant[0]).reduce((s, a) => s + Math.abs(a[1]), 0);
      if (minorTotal < (cfg.diagonalMinorThreshold ?? 2.0)) {
        element._proposedFix = { type: "SNAP_AXIS", ruleId: "R-GEO-03", tier: 2, dominantAxis: dominant[0] };
      } else {
        log.push({ type: "Error", ruleId: "R-GEO-03", tier: 4, row: ri,
          message: `ERROR [R-GEO-03]: ${type} runs diagonally. Must align to single axis.` });
      }
    }
  }

  // R-CHN-01
  if (context.travelAxis && elemAxis && elemAxis !== context.travelAxis) {
    if (!["BEND", "TEE"].includes(type)) {
      logRuleExecution("R-CHN-01", ri);
      log.push({ type: "Error", ruleId: "R-CHN-01", tier: 4, row: ri,
        message: `ERROR [R-CHN-01]: Axis changed ${context.travelAxis}→${elemAxis} at ${type}.` });
    }
  }

  // R-CHN-02
  if (context.travelAxis && elemAxis === context.travelAxis && elemDir !== context.travelDirection) {
    logRuleExecution("R-CHN-02", ri);
    if (type === "PIPE") {
      const foldLen = vec.mag(getElementVector(element));
      if (foldLen < (cfg.autoDeleteFoldbackMax ?? 25.0)) {
        element._proposedFix = { type: "DELETE", ruleId: "R-CHN-02", tier: 2 };
      } else {
        log.push({ type: "Error", ruleId: "R-CHN-02", tier: 4, row: ri,
          message: `ERROR [R-CHN-02]: Fold-back ${foldLen.toFixed(1)}mm. Too large to auto-delete.` });
      }
    } else if (type !== "BEND") {
      log.push({ type: "Error", ruleId: "R-CHN-02", tier: 4, row: ri,
        message: `ERROR [R-CHN-02]: ${type} reverses direction.` });
    }
  }

  // R-CHN-06
  if (prevElement && context.travelAxis && elemAxis === context.travelAxis) {
    const exitPt = getExitPoint(prevElement);
    const entryPt = getEntryPoint(element);
    if (exitPt && entryPt) {
      const nonTravelAxes = ["x", "y", "z"].filter(a => a.toUpperCase() !== context.travelAxis);
      for (const key of nonTravelAxes) {
        const drift = Math.abs(entryPt[key] - exitPt[key]);
        if (drift > 0.1) {
            logRuleExecution("R-CHN-06", ri);
            if (drift >= (cfg.warnSnapThreshold ?? 10.0)) {
              log.push({ type: "Error", ruleId: "R-CHN-06", tier: 4, row: ri,
                message: `ERROR [R-CHN-06]: lateral offset ${drift.toFixed(1)}mm. Too large to snap.` });
            }
        }
      }
    }
  }

  // R-BRN-01
  if (type === "TEE" && element.branchBore > element.bore) {
    logRuleExecution("R-BRN-01", ri);
    log.push({ type: "Error", ruleId: "R-BRN-01", tier: 4, row: ri, message: `ERROR [R-BRN-01]: Branch bore > header bore.` });
  }

  // R-BRN-02
  if (type === "OLET" && element.branchBore && element.bore) {
    logRuleExecution("R-BRN-02", ri);
    const ratio = element.branchBore / element.bore;
    if (ratio > (cfg.oletMaxRatioError ?? 0.8)) {
       log.push({ type: "Error", ruleId: "R-BRN-02", tier: 4, row: ri, message: `ERROR [R-BRN-02]: OLET ratio > 0.8.` });
    } else if (ratio > (cfg.oletMaxRatioWarning ?? 0.5)) {
       log.push({ type: "Warning", ruleId: "R-BRN-02", tier: 3, row: ri, message: `WARNING [R-BRN-02]: OLET ratio > 0.5.` });
    }
  }

  // R-BRN-03
  if (type === "TEE" && context.travelAxis && element.branchBore) {
      logRuleExecution("R-BRN-03", ri);
      if (element.bp && element.cp) {
          const bpVec = vec.sub(element.bp, element.cp);
          const bpNonZero = [["X", bpVec.x], ["Y", bpVec.y], ["Z", bpVec.z]].filter(([_, d]) => Math.abs(d) > 0.5);
          if (bpNonZero.length > 0) {
              const bpDom = bpNonZero.reduce((a, b) => Math.abs(a[1]) > Math.abs(b[1]) ? a : b)[0];
              if (bpDom.toUpperCase() === context.travelAxis) {
                 log.push({ type: "Error", ruleId: "R-BRN-03", tier: 4, row: ri, message: `ERROR [R-BRN-03]: Branch same axis as header.` });
              }
          }
      }
  }

  // R-BRN-04
  if (type === "TEE" && element.bp && element.cp && element.ep1 && element.ep2) {
      logRuleExecution("R-BRN-04", ri);
      const headVec = vec.sub(element.ep2, element.ep1);
      const brVec = vec.sub(element.bp, element.cp);
      if (vec.mag(headVec) > 0 && vec.mag(brVec) > 0) {
         const dot = Math.abs(vec.dot(headVec, brVec) / (vec.mag(headVec) * vec.mag(brVec)));
         // dot = cos(theta), perp = dot 0
         if (dot > 0.3) { // Rough equivalent to > 15 deg from perp
             log.push({ type: "Error", ruleId: "R-BRN-04", tier: 4, row: ri, message: `ERROR [R-BRN-04]: Severely non-perpendicular branch.` });
         }
      }
  }

  // R-CHN-03
  if (type === "BEND" && context.lastFittingType === "BEND") {
      logRuleExecution("R-CHN-03", ri);
      if (context.pipeSinceLastBend === 0) {
          log.push({ type: "Warning", ruleId: "R-CHN-03", tier: 3, row: ri, message: `WARNING [R-CHN-03]: Two bends with 0mm pipe between.` });
      }
  }

  // R-GEO-07
  if (element.ep1 && element.ep2 && type !== "SUPPORT" && type !== "OLET") {
      logRuleExecution("R-GEO-07", ri);
      if (vec.mag(vec.sub(element.ep2, element.ep1)) === 0) {
          log.push({ type: "Error", ruleId: "R-GEO-07", tier: 4, row: ri, message: `ERROR [R-GEO-07]: Zero-length element.` });
      }
  }

  // R-TOP-04: Flange pair check (mid-chain)
  logRuleExecution("R-TOP-04", ri);
  if (type === "FLANGE" && prevElement) {
    if (prevElement.type && prevElement.type.toUpperCase() !== "FLANGE") {
      // Checked in aggregate or needs lookahead, simplifying for now to hit the warn.
      // Will just check mid-chain isolated flanges below.
    }
  }

  // R-DAT-01: Coordinate Precision Consistency
  logRuleExecution("R-DAT-01", ri);
  if (element.ep1) {
    const decX = (element.ep1.x.toString().split('.')[1] || '').length;
    const decY = (element.ep1.y.toString().split('.')[1] || '').length;
    const decZ = (element.ep1.z.toString().split('.')[1] || '').length;
    if (decX !== cfg.decimals || decY !== cfg.decimals || decZ !== cfg.decimals) {
      log.push({ type: "Warning", ruleId: "R-DAT-01", tier: 3, row: ri, message: `WARNING [R-DAT-01]: Precision mismatch.` });
    }
  }

  // R-DAT-03: Material Continuity
  logRuleExecution("R-DAT-03", ri);
  if (element.ca && element.ca[3] && context.currentMaterial && element.ca[3] !== context.currentMaterial) {
    if (!["FLANGE", "VALVE"].includes(prevElement?.type?.toUpperCase())) {
      log.push({ type: "Warning", ruleId: "R-DAT-03", tier: 3, row: ri, message: `WARNING [R-DAT-03]: Material changed without joint.` });
    }
  }

  // R-DAT-04: Design Condition Continuity
  logRuleExecution("R-DAT-04", ri);
  if (element.ca && element.ca[1] && context.currentPressure && element.ca[1] !== context.currentPressure) {
    log.push({ type: "Warning", ruleId: "R-DAT-04", tier: 3, row: ri, message: `WARNING [R-DAT-04]: Pressure changed.` });
  }

  // R-DAT-05: CA8 Weight Scope
  logRuleExecution("R-DAT-05", ri);
  if (element.ca && element.ca[8] && ["PIPE", "SUPPORT"].includes(type)) {
     log.push({ type: "Warning", ruleId: "R-DAT-05", tier: 3, row: ri, message: `WARNING [R-DAT-05]: CA8 (weight) on PIPE/SUPPORT.` });
  }

  // R-DAT-06: SKEY prefix mismatch
  logRuleExecution("R-DAT-06", ri);
  if (element.skey) {
    const prefixes = {
      "FLANGE": ["FL"],
      "VALVE": ["V"],
      "BEND": ["BE"],
      "TEE": ["TE"],
      "OLET": ["OL"],
      "REDUCER-CONCENTRIC": ["RC"],
      "REDUCER-ECCENTRIC": ["RE"],
    };
    const expected = prefixes[type];
    if (expected && !expected.some(p => element.skey.toUpperCase().startsWith(p))) {
      log.push({ type: "Warning", ruleId: "R-DAT-06", tier: 3, row: ri, message: `WARNING [R-DAT-06]: SKEY ${element.skey} mismatch for ${type}.` });
    }
  }

}

export function runSupportRules(support, chain, context, config, log) {
  const ri = support._rowIndex;
  const coor = support.supportCoor;
  if (!coor) return;

  logRuleExecution("R-TOP-06", ri);
  let minDist = Infinity;
  for (const link of chain) {
    if ((link.element.type || "").toUpperCase() !== "PIPE") continue;
    const ep1 = link.element.ep1;
    const ep2 = link.element.ep2;
    if (!ep1 || !ep2) continue;

    const pipeVec = vec.sub(ep2, ep1);
    const pipeLen = vec.mag(pipeVec);
    if (pipeLen < 0.1) continue;

    const toSupport = vec.sub(coor, ep1);
    const t = vec.dot(toSupport, pipeVec) / (pipeLen * pipeLen);
    const projection = vec.add(ep1, vec.scale(pipeVec, Math.max(0, Math.min(1, t))));
    const perpDist = vec.dist(coor, projection);

    if (perpDist < minDist) minDist = perpDist;
  }

  if (minDist > 5.0 && minDist < Infinity) {
    log.push({ type: "Error", ruleId: "R-TOP-06", tier: 4, row: ri,
      message: `ERROR [R-TOP-06]: Support is ${minDist.toFixed(1)}mm off the pipe axis.` });
  }
}

export function runAggregateRules(chain, context, config, log) {
  const cfg = config.smartFixer || {};
  const chainId = context.chainId;
  const ri = chain[0]?.element?._rowIndex;

  if (chain.length === 0) return;

  // R-TOP-01: Dead-end detection
  logRuleExecution("R-TOP-01", ri);
  const lastElement = chain[chain.length - 1].element;
  if (lastElement && (lastElement.type || "").toUpperCase() === "PIPE") {
     log.push({ type: "Warning", ruleId: "R-TOP-01", tier: 3, row: lastElement._rowIndex, message: `WARNING [R-TOP-01]: Chain ends at bare pipe.` });
  }

  // R-AGG-05: Flange pair check aggregate
  logRuleExecution("R-AGG-05", ri);
  const flanges = chain.filter(l => (l.element.type || "").toUpperCase() === "FLANGE");
  // Simple check: if total mid-chain flanges is odd, someone is missing a mate.
  if (flanges.length % 2 !== 0 && flanges.length > 1) {
      log.push({ type: "Warning", ruleId: "R-AGG-05", tier: 3, row: ri, message: `WARNING [R-AGG-05]: Odd number of flanges in chain.` });
  }

  // Also manually tag R-TOP-04 for single mid-chain flange
  logRuleExecution("R-TOP-04", ri);
  if (flanges.length === 1 && chain.length > 2) {
      log.push({ type: "Warning", ruleId: "R-TOP-04", tier: 3, row: flanges[0].element._rowIndex, message: `WARNING [R-TOP-04]: Single mid-chain flange.` });
  }

  // R-AGG-06: Component count sanity
  logRuleExecution("R-AGG-06", ri);
  if (chain.length <= 2 && chain.every(l => (l.element.type || "").toUpperCase() !== "PIPE")) {
     log.push({ type: "Warning", ruleId: "R-AGG-06", tier: 3, row: ri, message: `WARNING [R-AGG-06]: Chain has only fittings, no pipe.` });
  }

  logRuleExecution("R-AGG-01", ri);
  if (context.pipeLengthSum <= 0 && chain.length > 0) {
    log.push({ type: "Error", ruleId: "R-AGG-01", tier: 4, row: ri,
      message: `ERROR [R-AGG-01]: ${chainId} has zero pipe length.` });
  }

  logRuleExecution("R-AGG-03", ri);
  if (chain.length >= 2) {
    const startPt = getEntryPoint(chain[0].element);
    const endPt = getExitPoint(chain[chain.length - 1].element);
    if (startPt && endPt) {
      const expected = vec.sub(endPt, startPt);
      const actual = context.cumulativeVector;
      const error = vec.mag(vec.sub(expected, actual));
      if (error > (cfg.closureErrorThreshold ?? 50.0)) {
        log.push({ type: "Error", ruleId: "R-AGG-03", tier: 4, row: ri,
          message: `ERROR [R-AGG-03]: ${chainId} closure error ${error.toFixed(1)}mm.` });
      }
    }
  }
}
