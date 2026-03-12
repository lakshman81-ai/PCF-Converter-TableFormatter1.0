/**
 * REGION F: RULE ENGINE
 */
import { vec } from '../../utils/math';
import { getElementVector, detectElementAxis } from './axisDetector';
import { getEntryPoint, getExitPoint } from './graphBuilder';
import { registerRule, logRuleExecution } from '../ruleRegistry';

// We only register rules we have TRULY implemented
[
  "R-GEO-01", "R-GEO-02", "R-GEO-03", "R-GEO-07", "R-GEO-08",
  "R-CHN-01", "R-CHN-02", "R-CHN-03", "R-CHN-06",
  "R-TOP-01", "R-TOP-02", "R-TOP-03", "R-TOP-04", "R-TOP-06",
  "R-BRN-01", "R-BRN-02", "R-BRN-03", "R-BRN-04", "R-BRN-05",
  "R-DAT-01", "R-DAT-03", "R-DAT-04", "R-DAT-05", "R-DAT-06",
  "R-AGG-01", "R-AGG-03", "R-AGG-05", "R-AGG-06",
  "R-SPA-01", "R-SPA-02"
].forEach(ruleId => registerRule(ruleId));

export function runElementRules(element, context, prevElement, elemAxis, elemDir, config, log) {
  const type = (element.type || "").toUpperCase();
  const cfg = config.smartFixer || {};
  const ri = element._rowIndex;

  // R-GEO-01
  if (type === "PIPE") {
    const len = vec.mag(getElementVector(element));
    if (len < (cfg.microPipeThreshold ?? 6.0)) {
      logRuleExecution("R-GEO-01", ri);
      element._proposedFix = { type: "DELETE", tier: 1, ruleId: "R-GEO-01" };
      log.push({ type: "Fix", ruleId: "R-GEO-01", tier: 1, row: ri,
        message: `DELETE [R-GEO-01]: Micro-pipe element (${len.toFixed(1)}mm).` });
    }
  }

  // R-GEO-02
  if (prevElement && element.bore && prevElement.bore && element.bore !== prevElement.bore) {
    if (type !== "REDUCER-CONCENTRIC" && type !== "REDUCER-ECCENTRIC" &&
        (prevElement.type || "").toUpperCase() !== "REDUCER-CONCENTRIC" &&
        (prevElement.type || "").toUpperCase() !== "REDUCER-ECCENTRIC") {
      logRuleExecution("R-GEO-02", ri);
      log.push({ type: "Error", ruleId: "R-GEO-02", tier: 4, row: ri,
        message: `ERROR [R-GEO-02]: Bore discontinuity ${prevElement.bore} -> ${element.bore} without reducer.` });
    }
  }

  // R-GEO-03
  if (type === "PIPE" && element.ep1 && element.ep2) {
    const diff = vec.sub(element.ep2, element.ep1);
    const nonZeros = [];
    if (Math.abs(diff.x) > 0.1) nonZeros.push({axis: "X", val: Math.abs(diff.x)});
    if (Math.abs(diff.y) > 0.1) nonZeros.push({axis: "Y", val: Math.abs(diff.y)});
    if (Math.abs(diff.z) > 0.1) nonZeros.push({axis: "Z", val: Math.abs(diff.z)});

    if (nonZeros.length >= 2) {
      logRuleExecution("R-GEO-03", ri);
      nonZeros.sort((a,b) => b.val - a.val);
      if (nonZeros[1].val < (cfg.silentSnapThreshold ?? 2.0)) {
         element._proposedFix = { type: "SNAP_AXIS", dominantAxis: nonZeros[0].axis, tier: 2, ruleId: "R-GEO-03" };
         log.push({ type: "Fix", ruleId: "R-GEO-03", tier: 2, row: ri,
           message: `SNAP [R-GEO-03]: Pipe has ${nonZeros[1].val.toFixed(1)}mm off-axis drift. Snapping to ${nonZeros[0].axis}.` });
      } else {
         log.push({ type: "Error", ruleId: "R-GEO-03", tier: 4, row: ri,
           message: `ERROR [R-GEO-03]: Pipe runs diagonally (${nonZeros[0].axis}=${nonZeros[0].val.toFixed(1)}, ${nonZeros[1].axis}=${nonZeros[1].val.toFixed(1)}).` });
      }
    }
  }

  // R-CHN-01
  if (prevElement && type !== "BEND" && context.travelAxis && elemAxis && elemAxis !== context.travelAxis) {
    if (type === "PIPE" && (prevElement.type || "").toUpperCase() === "PIPE") {
       logRuleExecution("R-CHN-01", ri);
       log.push({ type: "Error", ruleId: "R-CHN-01", tier: 4, row: ri,
         message: `ERROR [R-CHN-01]: Axis changed ${context.travelAxis} -> ${elemAxis} without a bend.` });
    }
  }

  // R-CHN-02
  if (prevElement && context.travelAxis && elemAxis === context.travelAxis && elemDir === -context.travelDirection) {
    logRuleExecution("R-CHN-02", ri);
    if (type === "PIPE") {
      const foldLen = vec.mag(getElementVector(element));
      if (foldLen <= (cfg.autoDeleteFoldbackMax ?? 25.0)) {
         element._proposedFix = { type: "DELETE", tier: 2, ruleId: "R-CHN-02" };
         log.push({ type: "Fix", ruleId: "R-CHN-02", tier: 2, row: ri,
           message: `DELETE [R-CHN-02]: Fold-back pipe ${foldLen.toFixed(1)}mm.` });
      } else {
         log.push({ type: "Error", ruleId: "R-CHN-02", tier: 4, row: ri,
          message: `ERROR [R-CHN-02]: Fold-back ${foldLen.toFixed(1)}mm. Too large to auto-delete.` });
      }
    } else if (type !== "BEND") {
      log.push({ type: "Error", ruleId: "R-CHN-02", tier: 4, row: ri,
        message: `ERROR [R-CHN-02]: ${type} reverses direction.` });
    }
  }

  // R-CHN-06: Shared-Axis Coordinate Snapping
  if (prevElement && context.travelAxis) {
    const exitPt = getExitPoint(prevElement);
    const entryPt = getEntryPoint(element);
    if (exitPt && entryPt) {
      const silentSnap = cfg.silentSnapThreshold ?? 2.0;
      const warnSnap = cfg.warnSnapThreshold ?? 10.0;
      const nonTravelAxes = ["x", "y", "z"].filter(a => a !== context.travelAxis.toLowerCase());

      for (const axis of nonTravelAxes) {
        const drift = Math.abs(entryPt[axis] - exitPt[axis]);

        if (drift > 0.1 && drift < silentSnap) {
          logRuleExecution("R-CHN-06", ri);
          element.ep1[axis] = exitPt[axis];
          markModified(element, "ep1", "SmartFix:R-CHN-06:snap");
          log.push({ type: "Fix", ruleId: "R-CHN-06", tier: 1, row: ri,
            message: `SNAP [R-CHN-06 T1]: ${axis.toUpperCase()} drifted ${drift.toFixed(1)}mm. Silently snapped to ${exitPt[axis].toFixed(1)}.` });
        }
        else if (drift >= silentSnap && drift < warnSnap) {
          logRuleExecution("R-CHN-06", ri);
          element.ep1[axis] = exitPt[axis];
          markModified(element, "ep1", "SmartFix:R-CHN-06:snap-warn");
          log.push({ type: "Fix", ruleId: "R-CHN-06", tier: 2, row: ri,
            message: `SNAP [R-CHN-06 T2]: ${axis.toUpperCase()} drifted ${drift.toFixed(1)}mm. Snapped to ${exitPt[axis].toFixed(1)}. Verify not intentional offset.` });
        }
        else if (drift >= warnSnap) {
          logRuleExecution("R-CHN-06", ri);
          log.push({ type: "Error", ruleId: "R-CHN-06", tier: 4, row: ri,
            message: `ERROR [R-CHN-06 T4]: ${axis.toUpperCase()} offset ${drift.toFixed(1)}mm from previous element. Too large for auto-snap. Manual review.` });
        }
      }
    }
  }

  // R-GEO-08: Coordinate Magnitude and Zero Check
  const fields = [
    { name: "ep1", val: element.ep1 },
    { name: "ep2", val: element.ep2 },
    { name: "cp", val: element.cp },
    { name: "bp", val: element.bp },
    { name: "supportCoor", val: element.supportCoor },
  ];

  for (const { name, val } of fields) {
    if (!val) continue;

    // Check (0,0,0) — ERROR
    if (val.x === 0 && val.y === 0 && val.z === 0) {
      logRuleExecution("R-GEO-08", ri);
      log.push({ type: "Error", ruleId: "R-GEO-08", tier: 4, row: ri,
        message: `ERROR [R-GEO-08]: ${name} is (0,0,0) — prohibited.` });
    }

    // Check magnitude > 500,000mm — WARNING
    for (const axis of ["x", "y", "z"]) {
      if (Math.abs(val[axis]) > 500000) {
        logRuleExecution("R-GEO-08", ri);
        log.push({ type: "Warning", ruleId: "R-GEO-08", tier: 3, row: ri,
          message: `WARNING [R-GEO-08]: ${name}.${axis}=${val[axis].toFixed(0)}mm (${(val[axis]/1000).toFixed(1)}m) — unusually large.` });
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
      const headVec = vec.sub(element.ep2, element.ep1);
      const brVec = vec.sub(element.bp, element.cp);
      const hMag = vec.mag(headVec);
      const bMag = vec.mag(brVec);

      if (hMag > 0.1 && bMag > 0.1) {
         const cosAngle = Math.abs(vec.dot(headVec, brVec)) / (hMag * bMag);
         const angleDeg = Math.acos(Math.min(cosAngle, 1.0)) * 180 / Math.PI;
         const offPerp = Math.abs(90 - angleDeg);

         const warnThreshold = cfg.branchPerpendicularityWarn ?? 5.0;
         const errThreshold = cfg.branchPerpendicularityError ?? 15.0;

         if (offPerp > errThreshold) {
            logRuleExecution("R-BRN-04", ri);
            log.push({ type: "Error", ruleId: "R-BRN-04", tier: 4, row: ri,
              message: `ERROR [R-BRN-04]: Branch ${offPerp.toFixed(1)}° from perpendicular. Exceeds ${errThreshold}° threshold.` });
         } else if (offPerp > warnThreshold) {
            logRuleExecution("R-BRN-04", ri);
            log.push({ type: "Warning", ruleId: "R-BRN-04", tier: 3, row: ri,
              message: `WARNING [R-BRN-04]: Branch ${offPerp.toFixed(1)}° from perpendicular. Exceeds ${warnThreshold}° threshold.` });
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
  if (type === "FLANGE" && prevElement) {
    if (prevElement.type && prevElement.type.toUpperCase() !== "FLANGE") {
      // Deferred check
    }
  }

  // R-DAT-01: Coordinate Precision Consistency
  if (element.ep1) {
    const decX = (element.ep1.x.toString().split('.')[1] || '').length;
    const decY = (element.ep1.y.toString().split('.')[1] || '').length;
    const decZ = (element.ep1.z.toString().split('.')[1] || '').length;
    if (decX !== cfg.decimals || decY !== cfg.decimals || decZ !== cfg.decimals) {
      logRuleExecution("R-DAT-01", ri);
      log.push({ type: "Warning", ruleId: "R-DAT-01", tier: 3, row: ri, message: `WARNING [R-DAT-01]: Precision mismatch.` });
    }
  }

  // R-DAT-03: Material Continuity
  if (element.ca && element.ca[3] && context.currentMaterial && element.ca[3] !== context.currentMaterial) {
    if (!["FLANGE", "VALVE"].includes(prevElement?.type?.toUpperCase())) {
      logRuleExecution("R-DAT-03", ri);
      log.push({ type: "Warning", ruleId: "R-DAT-03", tier: 3, row: ri, message: `WARNING [R-DAT-03]: Material changed without joint.` });
    }
  }

  // R-DAT-04: Design Condition Continuity
  if (element.ca && element.ca[1] && context.currentPressure && element.ca[1] !== context.currentPressure) {
    logRuleExecution("R-DAT-04", ri);
    log.push({ type: "Warning", ruleId: "R-DAT-04", tier: 3, row: ri, message: `WARNING [R-DAT-04]: Pressure changed.` });
  }

  // R-DAT-05: CA8 Weight Scope
  if (element.ca && element.ca[8] && ["PIPE", "SUPPORT"].includes(type)) {
     logRuleExecution("R-DAT-05", ri);
     log.push({ type: "Warning", ruleId: "R-DAT-05", tier: 3, row: ri, message: `WARNING [R-DAT-05]: CA8 (weight) on PIPE/SUPPORT.` });
  }

  // R-DAT-06: SKEY prefix mismatch
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
      logRuleExecution("R-DAT-06", ri);
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
  const lastElement = chain[chain.length - 1].element;
  if (lastElement && (lastElement.type || "").toUpperCase() === "PIPE") {
     logRuleExecution("R-TOP-01", ri);
     log.push({ type: "Warning", ruleId: "R-TOP-01", tier: 3, row: lastElement._rowIndex, message: `WARNING [R-TOP-01]: Chain ends at bare pipe.` });
  }

  // R-AGG-05: Flange pair check aggregate
  const flanges = chain.filter(l => (l.element.type || "").toUpperCase() === "FLANGE");
  // Simple check: if total mid-chain flanges is odd, someone is missing a mate.
  if (flanges.length % 2 !== 0 && flanges.length > 1) {
      logRuleExecution("R-AGG-05", ri);
      log.push({ type: "Warning", ruleId: "R-AGG-05", tier: 3, row: ri, message: `WARNING [R-AGG-05]: Odd number of flanges in chain.` });
  }

  // Also manually tag R-TOP-04 for single mid-chain flange
  if (flanges.length === 1 && chain.length > 2) {
      logRuleExecution("R-TOP-04", ri);
      log.push({ type: "Warning", ruleId: "R-TOP-04", tier: 3, row: flanges[0].element._rowIndex, message: `WARNING [R-TOP-04]: Single mid-chain flange.` });
  }

  // R-AGG-06: Component count sanity
  if (chain.length <= 2 && chain.every(l => (l.element.type || "").toUpperCase() !== "PIPE")) {
     logRuleExecution("R-AGG-06", ri);
     log.push({ type: "Warning", ruleId: "R-AGG-06", tier: 3, row: ri, message: `WARNING [R-AGG-06]: Chain has only fittings, no pipe.` });
  }

  if (context.pipeLengthSum <= 0 && chain.length > 0) {
    logRuleExecution("R-AGG-01", ri);
    log.push({ type: "Error", ruleId: "R-AGG-01", tier: 4, row: ri,
      message: `ERROR [R-AGG-01 T4]: ${chainId} has zero pipe length.` });
  }

  // R-SPA-01: Elevation Consistency
  checkRSPA01(chain, config, log);

  if (chain.length >= 2) {
    const startPt = getEntryPoint(chain[0].element);
    const endPt = getExitPoint(chain[chain.length - 1].element);
    if (startPt && endPt) {
      const expected = vec.sub(endPt, startPt);
      const actual = context.cumulativeVector;
      const error = vec.mag(vec.sub(expected, actual));
      if (error > (cfg.closureErrorThreshold ?? 50.0)) {
        logRuleExecution("R-AGG-03", ri);
        log.push({ type: "Error", ruleId: "R-AGG-03", tier: 4, row: ri,
          message: `ERROR [R-AGG-03]: ${chainId} closure error ${error.toFixed(1)}mm.` });
      }
    }
  }
}

export function detectDuplicates(components, config, log) {
  const tolerance = 2.0; // mm — two elements at same location = duplicate
  const duplicates = [];

  for (let i = 0; i < components.length; i++) {
    const a = components[i];
    if (!a.ep1 || !a.ep2) continue;
    const aType = (a.type || "").toUpperCase();

    for (let j = i + 1; j < components.length; j++) {
      const b = components[j];
      if (!b.ep1 || !b.ep2) continue;
      const bType = (b.type || "").toUpperCase();

      // Same type and overlapping spatial extent
      if (aType === bType &&
          vec.approxEqual(a.ep1, b.ep1, tolerance) &&
          vec.approxEqual(a.ep2, b.ep2, tolerance)) {
        duplicates.push({ rowA: a._rowIndex, rowB: b._rowIndex, type: aType });
        logRuleExecution("R-TOP-03", b._rowIndex);
        log.push({ type: "Error", ruleId: "R-TOP-03", tier: 4, row: b._rowIndex,
          message: `ERROR [R-TOP-03 T4]: Duplicate ${aType} — Row ${a._rowIndex} and Row ${b._rowIndex} occupy identical space. Delete one.` });
      }
    }
  }

  return duplicates;
}

export function detectOrphans(components, visited, log) {
  const orphans = components.filter(c =>
    !visited.has(c._rowIndex) &&
    (c.type || "").toUpperCase() !== "SUPPORT"
  );

  for (const orphan of orphans) {
    logRuleExecution("R-TOP-02", orphan._rowIndex);
    log.push({ type: "Error", ruleId: "R-TOP-02", tier: 4, row: orphan._rowIndex,
      message: `ERROR [R-TOP-02 T4]: ${orphan.type} (Row ${orphan._rowIndex}) is orphaned — not connected to any chain.` });
  }

  return orphans;
}

function markModified(elem, field, reason) {
  if (!elem._modified) elem._modified = {};
  elem._modified[field] = reason;
}

export function applyRSPA02(chains, config, log) {
  const silentSnap = config.smartFixer?.silentSnapThreshold ?? 2.0;
  const warnSnap = config.smartFixer?.warnSnapThreshold ?? 10.0;
  let snapCount = 0;

  for (const chain of chains) {
    if (chain.length < 2) continue;

    let runStart = 0;
    while (runStart < chain.length) {
      const runAxis = chain[runStart].travelAxis;
      if (!runAxis) { runStart++; continue; }

      let runEnd = runStart;
      while (runEnd < chain.length - 1 && chain[runEnd + 1].travelAxis === runAxis) {
        runEnd++;
      }

      if (runEnd > runStart) {
        const nonTravelAxes = ["x", "y", "z"].filter(a => a.toUpperCase() !== runAxis.toUpperCase());

        for (const axis of nonTravelAxes) {
          const values = [];
          for (let j = runStart; j <= runEnd; j++) {
            const elem = chain[j].element;
            if (elem.ep1) values.push(elem.ep1[axis]);
            if (elem.ep2) values.push(elem.ep2[axis]);
          }

          if (values.length < 2) continue;

          const sorted = [...values].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];

          for (let j = runStart; j <= runEnd; j++) {
            const elem = chain[j].element;
            for (const pt of ["ep1", "ep2"]) {
              if (!elem[pt]) continue;
              const drift = Math.abs(elem[pt][axis] - median);

              if (drift > 0.1 && drift < silentSnap) {
                elem[pt][axis] = median;
                markModified(elem, pt, "SmartFix:R-SPA-02:snap");
                snapCount++;
              } else if (drift >= silentSnap && drift < warnSnap) {
                elem[pt][axis] = median;
                markModified(elem, pt, "SmartFix:R-SPA-02:snap-warn");
                snapCount++;
                logRuleExecution("R-SPA-02", elem._rowIndex);
                log.push({ type: "Fix", ruleId: "R-SPA-02", tier: 2, row: elem._rowIndex,
                  message: `SNAP [R-SPA-02 T2]: ${axis.toUpperCase()} drifted ${drift.toFixed(1)}mm from run median ${median.toFixed(1)}. Snapped.` });
              } else if (drift >= warnSnap) {
                logRuleExecution("R-SPA-02", elem._rowIndex);
                log.push({ type: "Error", ruleId: "R-SPA-02", tier: 4, row: elem._rowIndex,
                  message: `ERROR [R-SPA-02 T4]: ${axis.toUpperCase()} offset ${drift.toFixed(1)}mm from run median. Too large.` });
              }
            }
          }
        }
      }

      runStart = runEnd + 1;
    }
  }

  log.push({ type: "Info", message: `R-SPA-02: Snapped ${snapCount} coordinates across all chains.` });
}

export function checkRBRN05(teeElement, branchChain, config, log) {
  if (!teeElement.bp || !branchChain || branchChain.length === 0) return;

  const branchFirst = branchChain[0].element;
  const branchEP1 = getEntryPoint(branchFirst);
  if (!branchEP1) return;

  const gap = vec.dist(teeElement.bp, branchEP1);
  const tolerance = config.smartFixer?.connectionTolerance ?? 25.0;

  if (gap > tolerance) {
    logRuleExecution("R-BRN-05", branchFirst._rowIndex);
    log.push({ type: "Error", ruleId: "R-BRN-05", tier: 4, row: branchFirst._rowIndex,
      message: `ERROR [R-BRN-05 T4]: TEE branch point does not connect to first branch element. Gap=${gap.toFixed(1)}mm (tolerance=${tolerance}mm).` });
  }

  // Also check bore continuity at branch start
  if (branchFirst.bore && teeElement.branchBore &&
      branchFirst.bore !== teeElement.branchBore) {
    logRuleExecution("R-BRN-05", branchFirst._rowIndex);
    log.push({ type: "Warning", ruleId: "R-BRN-05", tier: 3, row: branchFirst._rowIndex,
      message: `WARNING [R-BRN-05 T3]: TEE branch bore (${teeElement.branchBore}mm) ≠ first branch element bore (${branchFirst.bore}mm).` });
  }
}

export function checkRSPA01(chain, config, log) {
  const silentSnap = config.smartFixer?.silentSnapThreshold ?? 2.0;
  const warnSnap = config.smartFixer?.warnSnapThreshold ?? 10.0;

  // Only applies to horizontal runs (travel axis X or Y)
  // Track Z values across the run
  let runZValues = [];
  let runStartIdx = 0;

  for (let i = 0; i < chain.length; i++) {
    const link = chain[i];
    const axis = link.travelAxis;

    if (axis === "X" || axis === "Y") {
      // Horizontal run — track Z
      if (link.element.ep1) runZValues.push({ idx: i, z: link.element.ep1.z, pt: "ep1" });
      if (link.element.ep2) runZValues.push({ idx: i, z: link.element.ep2.z, pt: "ep2" });
    } else {
      // Non-horizontal (vertical or unknown) — process accumulated run
      if (runZValues.length >= 4) {
        snapElevation(runZValues, chain, silentSnap, warnSnap, log);
      }
      runZValues = [];
    }
  }

  // Process final run
  if (runZValues.length >= 4) {
    snapElevation(runZValues, chain, silentSnap, warnSnap, log);
  }
}

function snapElevation(zValues, chain, silentSnap, warnSnap, log) {
  const sorted = [...zValues].map(v => v.z).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  for (const entry of zValues) {
    const drift = Math.abs(entry.z - median);
    const elem = chain[entry.idx].element;

    if (drift > 0.1 && drift < silentSnap) {
      elem[entry.pt].z = median;
      markModified(elem, entry.pt, "SmartFix:R-SPA-01:elev-snap");
      logRuleExecution("R-SPA-01", elem._rowIndex);
      log.push({ type: "Fix", ruleId: "R-SPA-01", tier: 1, row: elem._rowIndex,
        message: `SNAP [R-SPA-01 T1]: Elevation Z drifted ${drift.toFixed(1)}mm from horizontal run median ${median.toFixed(1)}. Silently snapped.` });
    } else if (drift >= silentSnap && drift < warnSnap) {
      elem[entry.pt].z = median;
      markModified(elem, entry.pt, "SmartFix:R-SPA-01:elev-snap-warn");
      logRuleExecution("R-SPA-01", elem._rowIndex);
      log.push({ type: "Fix", ruleId: "R-SPA-01", tier: 2, row: elem._rowIndex,
        message: `SNAP [R-SPA-01 T2]: Elevation Z drifted ${drift.toFixed(1)}mm from horizontal run median ${median.toFixed(1)}. Snapped.` });
    } else if (drift >= warnSnap) {
      logRuleExecution("R-SPA-01", elem._rowIndex);
      log.push({ type: "Warning", ruleId: "R-SPA-01", tier: 3, row: elem._rowIndex,
        message: `WARNING [R-SPA-01 T3]: Elevation Z changes ${drift.toFixed(1)}mm in horizontal run. Intentional slope or error?` });
    }
  }
}

function directionLabel(axis, dir) {
  if (!axis) return "";
  const sign = dir > 0 ? "+" : "-";
  return `${sign}${axis.toUpperCase()}`;
}

export function checkROVR05(current, next, overlapAmt, context, config, log) {
  // Only applies when one element is PIPE and the other is TEE
  const currType = (current.type || "").toUpperCase();
  const nextType = (next.type || "").toUpperCase();

  if (!((currType === "PIPE" && nextType === "TEE") ||
        (currType === "TEE" && nextType === "PIPE"))) {
    return null; // Not a pipe-tee boundary
  }

  const tee = currType === "TEE" ? current : next;
  const pipe = currType === "PIPE" ? current : next;

  // Look up tee C dimension (center-to-end, run) from ASME B16.9 database
  const teeBore = tee.bore || 0;
  // Make sure we correctly access the database which might be in config.brlenEqualTee or just config
  const teeEntry = (config.brlenEqualTee || []).find(e => Number(e.bore) === Number(teeBore));
  const halfC = teeEntry ? teeEntry.C / 2 : null;

  if (halfC && Math.abs(overlapAmt - halfC) < 3.0) {
    // Overlap matches tee half-C — pipe wasn't trimmed for tee insertion
    const trimTarget = currType === "PIPE" ? "current" : "next";
    const dir = directionLabel(context.travelAxis, context.travelDirection);

    logRuleExecution("R-OVR-05", pipe._rowIndex);
    log.push({ type: "Fix", ruleId: "R-OVR-05", tier: 2, row: pipe._rowIndex,
      message: `TRIM [R-OVR-05 T2]: Pipe overlaps TEE by ${overlapAmt.toFixed(1)}mm ≈ half-C (${halfC.toFixed(1)}mm). Trimming pipe.` });

    return {
      type: "TRIM", ruleId: "R-OVR-05", tier: 2,
      description: `TRIM [R-OVR-05]: Pipe trimmed by ${halfC.toFixed(1)}mm (tee half-C dimension) to accommodate TEE at Row ${tee._rowIndex}.`,
      trimAmount: halfC,
      trimTarget,
      current, next,
    };
  }

  // Overlap doesn't match tee dimension
  logRuleExecution("R-OVR-05", pipe._rowIndex);
  log.push({ type: "Warning", ruleId: "R-OVR-05", tier: 3, row: pipe._rowIndex,
    message: `WARNING [R-OVR-05 T3]: Pipe overlaps TEE by ${overlapAmt.toFixed(1)}mm (tee half-C=${halfC ? halfC.toFixed(1) : "unknown"}mm). Non-standard overlap.` });

  return {
    type: "REVIEW", ruleId: "R-OVR-05", tier: 3,
    description: `REVIEW [R-OVR-05]: ${overlapAmt.toFixed(1)}mm pipe-tee overlap. Half-C=${halfC ? halfC.toFixed(1) : "?"}mm.`,
    current, next,
  };
}
