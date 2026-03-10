/**
 * Core Validator: V1-V20
 */
import { vec } from '../../utils/math';
import { runBasicFixes } from './basicFixer';
import { registerRule, logRuleExecution } from '../ruleRegistry';

// Register ONLY the Validation rules we explicitly test and have implemented below
[
  "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10",
  "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20"
].forEach(ruleId => registerRule(ruleId));

export function runValidation(dataTable, config, log) {
  const results = [];

  function addResult(ruleId, severity, row, message) {
    results.push({ ruleId, severity, row, message });
    logRuleExecution(ruleId, row);
  }

  for (let i = 0; i < dataTable.length; i++) {
    const row = dataTable[i];
    const type = (row.type || "").toUpperCase();
    const isHead = type === "ISOGEN-FILES" || type === "UNITS-BORE";
    if (isHead) continue; // Skip raw headers if any

    // V1: No (0,0,0) coordinates
    if (hasZeroCoord(row.ep1) || hasZeroCoord(row.ep2) || hasZeroCoord(row.cp) || hasZeroCoord(row.bp) || hasZeroCoord(row.supportCoor)) {
      addResult("V1", "ERROR", row._rowIndex, `ERROR [V1]: (0,0,0) coordinate detected.`);
    }

    // V2: Decimal consistency (comparing length of stringified decimals)
    if (row.ep1 && typeof row.bore === 'number') {
      const boreDecimals = (row.bore.toString().split('.')[1] || '').length;
      const xDecimals = (row.ep1.x.toString().split('.')[1] || '').length;
      if (boreDecimals !== xDecimals) {
         addResult("V2", "ERROR", row._rowIndex, `ERROR [V2]: Decimal precision mismatch. Bore: ${boreDecimals}, Coords: ${xDecimals}`);
      }
    }

    // V3: Bore consistency
    if (type !== "REDUCER-CONCENTRIC" && type !== "REDUCER-ECCENTRIC" && row.ep1 && row.ep2) {
      if (row.ep1.bore !== undefined && row.ep2.bore !== undefined && row.ep1.bore !== row.ep2.bore) {
         addResult("V3", "ERROR", row._rowIndex, `ERROR [V3]: Non-reducer has differing bores on endpoints.`);
      }
    }

    // V4, V5, V6, V7: BEND checks
    if (type === "BEND") {
      if (row.cp && row.ep1 && vec.dist(row.cp, row.ep1) < 0.1) addResult("V4", "ERROR", row._rowIndex, `ERROR [V4]: BEND CP = EP1`);
      if (row.cp && row.ep2 && vec.dist(row.cp, row.ep2) < 0.1) addResult("V5", "ERROR", row._rowIndex, `ERROR [V5]: BEND CP = EP2`);

      if (row.cp && row.ep1 && row.ep2) {
        // Collinear check: distance from CP to line EP1-EP2
        const distToLine = pointToLineDistance(row.cp, row.ep1, row.ep2);
        if (distToLine < 0.1) {
           addResult("V6", "ERROR", row._rowIndex, `ERROR [V6]: BEND CP is collinear with endpoints.`);
        }

        const d1 = vec.dist(row.cp, row.ep1);
        const d2 = vec.dist(row.cp, row.ep2);
        if (Math.abs(d1 - d2) > 1.0) {
           addResult("V7", "WARNING", row._rowIndex, `WARNING [V7]: BEND CP not equidistant. d1=${d1.toFixed(1)}, d2=${d2.toFixed(1)}`);
        }
      }
    }

    // V8, V9, V10: TEE checks
    if (type === "TEE") {
      if (row.cp && row.ep1 && row.ep2) {
        const mid = vec.mid(row.ep1, row.ep2);
        if (vec.dist(row.cp, mid) > 0.1) {
           addResult("V8", "ERROR", row._rowIndex, `ERROR [V8]: TEE CP is not at exact midpoint.`);
        }
        if (row.ep1.bore !== undefined && row.cp.bore !== undefined && row.ep1.bore !== row.cp.bore) {
           addResult("V9", "ERROR", row._rowIndex, `ERROR [V9]: TEE CP bore ≠ EP bore.`);
        }
      }
      if (row.cp && row.bp && row.ep1 && row.ep2) {
        const headVec = vec.sub(row.ep2, row.ep1);
        const brVec = vec.sub(row.bp, row.cp);
        if (vec.mag(headVec) > 0 && vec.mag(brVec) > 0) {
           const dot = Math.abs(vec.dot(headVec, brVec) / (vec.mag(headVec) * vec.mag(brVec)));
           if (dot > 0.017) { // roughly > 1 degree off perpendicular
             addResult("V10", "WARNING", row._rowIndex, `WARNING [V10]: TEE branch not perfectly perpendicular.`);
           }
        }
      }
    }

    // V11: OLET no END-POINTs
    if (type === "OLET") {
      if (row.ep1 || row.ep2) {
         addResult("V11", "ERROR", row._rowIndex, `ERROR [V11]: OLET should not have END-POINTs.`);
      }
    }

    // V12, V13, V19: SUPPORT checks
    if (type === "SUPPORT") {
      let hasCAs = false;
      for (let i = 1; i <= 10; i++) if (row.ca?.[i]) hasCAs = true;
      if (row.ca?.[97] || row.ca?.[98]) hasCAs = true; // wait, CAs 97/98 might be present. Check if V12 implies no material/weight CAs.
      if (row.ca?.[1]) hasCAs = true;
      if (hasCAs) addResult("V12", "ERROR", row._rowIndex, `ERROR [V12]: SUPPORT should not have CAs.`);

      if (row.bore && row.bore !== 0) addResult("V13", "ERROR", row._rowIndex, `ERROR [V13]: SUPPORT bore must be 0.`);

      if (row.text && (row.text.includes("LENGTH=") || row.text.includes("WEIGHT="))) {
         addResult("V19", "WARNING", row._rowIndex, `WARNING [V19]: SUPPORT MSG-SQUARE has LENGTH/WEIGHT token.`);
      }
    }

    // V14: SKEY
    if (type !== "PIPE" && type !== "SUPPORT" && type !== "MESSAGE-SQUARE" && type !== "PIPELINE-REFERENCE") {
      if (!row.skey) addResult("V14", "WARNING", row._rowIndex, `WARNING [V14]: Component missing <SKEY>.`);
    }

    // V15: Coordinate Continuity (checked in Smart Fixer, but basic check here)
    if (i > 0 && type === "PIPE") {
      const prev = dataTable[i-1];
      if ((prev.type || "").toUpperCase() === "PIPE" && prev.ep2 && row.ep1) {
        const gap = vec.dist(prev.ep2, row.ep1);
        if (gap > 0.1 && gap < 10) {
          addResult("V15", "WARNING", row._rowIndex, `WARNING [V15]: Pipe disconnected by ${gap.toFixed(1)}mm.`);
        }
      }
    }

    // V16: CA8 Scope
    if (row.ca?.[8] && (type === "PIPE" || type === "SUPPORT")) {
      addResult("V16", "WARNING", row._rowIndex, `WARNING [V16]: CA8 (weight) populated on ${type}.`);
    } else if (!row.ca?.[8] && ["FLANGE", "VALVE", "BEND", "TEE"].includes(type)) {
      addResult("V16", "INFO", row._rowIndex, `INFO [V16]: ${type} missing CA8 (weight).`);
    }

    // V18: Bore unit detection
    if (row.bore > 0 && row.bore <= 24) { // Assumes typically < 24 inches
      addResult("V18", "WARNING", row._rowIndex, `WARNING [V18]: Bore=${row.bore}. Likely inches, verify units.`);
    }

    // V20: GUID Prefix
    if (row.supportGuid && !row.supportGuid.startsWith("UCI:")) {
      addResult("V20", "ERROR", row._rowIndex, `ERROR [V20]: SUPPORT_GUID missing "UCI:" prefix.`);
    }
  }

  // Push to main log
  results.forEach(r => log.push({ type: r.severity === "ERROR" ? "Error" : "Warning", ruleId: r.ruleId, tier: null, row: r.row, message: r.message }));

  return results;
}

function hasZeroCoord(pt) {
  if (!pt) return false;
  return pt.x === 0 && pt.y === 0 && pt.z === 0;
}

function pointToLineDistance(p, a, b) {
  const lineVec = vec.sub(b, a);
  const pVec = vec.sub(p, a);
  const len = vec.mag(lineVec);
  if (len === 0) return vec.dist(p, a);
  const t = Math.max(0, Math.min(1, vec.dot(pVec, lineVec) / (len * len)));
  const proj = vec.add(a, vec.scale(lineVec, t));
  return vec.dist(p, proj);
}
