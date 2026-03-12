/**
 * REGION G: FIX APPLICATION ENGINE
 */
import { vec } from '../../utils/math';
import { getEntryPoint, getExitPoint } from './graphBuilder';
import { getElementVector } from './axisDetector';
import { logRuleExecution } from '../ruleRegistry';

export function applyFixes(dataTable, chains, config, log) {
  const applied = [];
  const newRows = [];
  const deleteRows = new Set();

  for (const chain of chains) {
    for (const link of chain) {
      const elem = link.element;

      // If AutoMultiPassMode is ON, only apply fixes explicitly approved by the user
      // If OFF, apply all Tier 1 and 2 fixes.
      const isApproved = config.autoMultiPassMode ? elem._fixApproved === true : elem._proposedFix?.tier <= 2;

      // DELETE fixes
      if (elem._proposedFix?.type === "DELETE" && isApproved) {
        deleteRows.add(elem._rowIndex);
        applied.push({ ruleId: elem._proposedFix.ruleId, row: elem._rowIndex, action: "DELETE" });
      }

      // SNAP_AXIS fixes
      if (elem._proposedFix?.type === "SNAP_AXIS" && isApproved) {
        snapToSingleAxis(elem, elem._proposedFix.dominantAxis);
        markModified(elem, "ep1", `SmartFix:${elem._proposedFix.ruleId}`);
        markModified(elem, "ep2", `SmartFix:${elem._proposedFix.ruleId}`);
        invalidateGeometry(elem);
        applied.push({ ruleId: elem._proposedFix.ruleId, row: elem._rowIndex, action: "SNAP_AXIS" });
      }

      // Gap/Overlap fixes
      const isGapApproved = config.autoMultiPassMode ? elem._fixApproved === true : link.fixAction?.tier <= 2;
      if (link.fixAction && isGapApproved) {
        const fix = link.fixAction;

        if (fix.type === "SNAP") {
          snapEndpoints(link.element, link.nextElement);
          markModified(link.element, "ep2", `SmartFix:${fix.ruleId}`);
          markModified(link.nextElement, "ep1", `SmartFix:${fix.ruleId}`);
          invalidateGeometry(link.element);
          invalidateGeometry(link.nextElement);
          applied.push({ ruleId: fix.ruleId, row: link.element._rowIndex, action: "SNAP" });
        }
        else if (fix.type === "TRIM") {
          const target = fix.trimTarget === "current" ? link.element : link.nextElement;
          if ((target.type || "").toUpperCase() === "PIPE") {
            trimPipe(target, fix.trimAmount, link.travelAxis, link.travelDirection, fix.trimTarget);
            markModified(target, fix.trimTarget === "current" ? "ep2" : "ep1", `SmartFix:${fix.ruleId}`);
            invalidateGeometry(target);
            applied.push({ ruleId: fix.ruleId, row: target._rowIndex, action: "TRIM" });

            // Check if trim creates micro-pipe (R-OVR-06)
            const remaining = vec.mag(getElementVector(target));
            if (remaining < (config.smartFixer?.microPipeThreshold ?? 6.0)) {
              deleteRows.add(target._rowIndex);
              logRuleExecution("R-OVR-06", target._rowIndex);
            }
          }
        }
        else if (fix.type === "INSERT") {
          const fillerPipe = createFillerPipe(link, config);
          newRows.push({ insertAfterRow: link.element._rowIndex, pipe: fillerPipe });
          applied.push({ ruleId: fix.ruleId, row: link.element._rowIndex, action: "INSERT" });
        }
      }

      // Branch fixes (recursive)
      if (link.branchChain) {
        const subFixes = applyFixes(dataTable, [link.branchChain], config, log);
        applied.push(...subFixes.applied);
        newRows.push(...subFixes.newRows);
        for (const dr of subFixes.deleteRows) deleteRows.add(dr);
      }
    }
  }

  // Ensure unique elements before mutation
  let updatedTable = dataTable.filter(row => !deleteRows.has(row._rowIndex));

  for (const insertion of newRows.sort((a, b) => b.insertAfterRow - a.insertAfterRow)) {
    const idx = updatedTable.findIndex(r => r._rowIndex === insertion.insertAfterRow);
    if (idx >= 0) {
      updatedTable.splice(idx + 1, 0, insertion.pipe);
    } else {
      updatedTable.push(insertion.pipe);
    }
  }

  updatedTable.forEach((row, i) => {
    row._rowIndex = i + 1;
    row.fixingAction = null;
    row.fixingActionTier = null;
    row.fixingActionRuleId = null;
  });

  return { updatedTable, applied, deleteRows, newRows };
}

function snapEndpoints(elemA, elemB) {
  const mid = vec.mid(getExitPoint(elemA), getEntryPoint(elemB));
  if (elemA.ep2) elemA.ep2 = { ...mid, bore: elemA.ep2.bore };
  if (elemB.ep1) elemB.ep1 = { ...mid, bore: elemB.ep1.bore };
}

function snapToSingleAxis(element, dominantAxis) {
  if (!element.ep1 || !element.ep2) return;
  const axes = ["x", "y", "z"];
  const domKey = dominantAxis.toLowerCase();
  for (const key of axes) {
    if (key !== domKey) element.ep2[key] = element.ep1[key];
  }
}

function trimPipe(pipe, amount, travelAxis, travelDir, which) {
  if (!travelAxis) return;
  const axisKey = travelAxis.toLowerCase();
  if (which === "current") {
    pipe.ep2[axisKey] -= amount * travelDir;
  } else {
    pipe.ep1[axisKey] += amount * travelDir;
  }
}

function createFillerPipe(chainLink, config) {
  const upstream = chainLink.element;
  const downstream = chainLink.nextElement;
  const exitPt = getExitPoint(upstream);
  const entryPt = getEntryPoint(downstream);

  return {
    _rowIndex: -1,
    _source: "SmartFix",
    _modified: { ep1: "SmartFix:GapFill", ep2: "SmartFix:GapFill", type: "SmartFix:GapFill" },
    _logTags: ["Calculated"],
    csvSeqNo: `${upstream.csvSeqNo || 0}.GF`,
    type: "PIPE",
    text: "",
    refNo: `${upstream.refNo || "UNKNOWN"}_GapFill`,
    bore: upstream.bore || 0,
    ep1: { ...exitPt },
    ep2: { ...entryPt },
    cp: null, bp: null, branchBore: null,
    skey: "",
    supportCoor: null, supportName: "", supportGuid: "",
    ca: { ...upstream.ca, 8: null, 97: null, 98: null },
    fixingAction: "GAPFILLING",
    fixingActionTier: null,
    fixingActionRuleId: null,
    len1: null, axis1: null, len2: null, axis2: null, len3: null, axis3: null,
    brlen: null, deltaX: null, deltaY: null, deltaZ: null,
    diameter: upstream.bore, wallThick: upstream.ca?.[4] || null,
    bendPtr: null, rigidPtr: null, intPtr: null,
  };
}

function markModified(row, field, reason) {
  if (!row._modified) row._modified = {};
  row._modified[field] = reason;
}

function invalidateGeometry(row) {
  row.len1 = null;
  row.len2 = null;
  row.len3 = null;
  row.axis1 = null;
  row.axis2 = null;
  row.axis3 = null;
}
