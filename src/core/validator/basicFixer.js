/**
 * BASIC FIXER (Steps 1-4)
 * Implementation of PCF Consolidated Master v2.0 Part C §5.2–5.5
 */

import { vec } from '../../utils/math';

export function runBasicFixes(dataTable, config, log) {
  const result = [...dataTable];

  for (let i = 0; i < result.length; i++) {
    const row = { ...result[i] };

    // Step 2: Fill missing identifiers
    if (!row.refNo) {
      row.refNo = row.ca?.[97] ? row.ca[97].replace(/^=/, "") : `ROW_${row._rowIndex}`;
    }
    if (!row.csvSeqNo) {
      row.csvSeqNo = row.ca?.[98] || row._rowIndex.toString();
    }

    // Step 3: Bore unit conversion
    if (row.bore != null && row.bore <= (config.smartFixer?.maxBoreForInchDetection ?? 48)) {
      const standardMM = new Set([15, 20, 25, 32, 40, 50, 65, 80, 90, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900, 1050, 1200]);
      if (!standardMM.has(row.bore)) {
        log.push({ type: "Fix", message: `Row ${row._rowIndex}: Converted bore ${row.bore}in to ${row.bore * 25.4}mm` });
        row.bore = row.bore * 25.4;
      }
    }

    // Auto-calculate length if missing
    if (row.ep1 && row.ep2 && !row.len1 && !row.len2 && !row.len3) {
       row.deltaX = row.ep2.x - row.ep1.x;
       row.deltaY = row.ep2.y - row.ep1.y;
       row.deltaZ = row.ep2.z - row.ep1.z;

       if (Math.abs(row.deltaX) > 0.5) { row.len1 = row.deltaX; row.axis1 = row.deltaX > 0 ? "East" : "West"; }
       if (Math.abs(row.deltaY) > 0.5) { row.len2 = row.deltaY; row.axis2 = row.deltaY > 0 ? "North" : "South"; }
       if (Math.abs(row.deltaZ) > 0.5) { row.len3 = row.deltaZ; row.axis3 = row.deltaZ > 0 ? "Up" : "Down"; }
    }

    // Step 4: TEXT auto-generation
    if (!row.text) {
      row.text = generateMessageSquareText(row);
    }

    result[i] = row;
  }

  return result;
}

function generateMessageSquareText(row) {
  const tokens = [];
  const compType = (row.type || "UNKNOWN").toUpperCase();
  tokens.push(compType);

  if (compType === "SUPPORT") {
    if (row.refNo) tokens.push(`RefNo:=${row.refNo}`);
    if (row.csvSeqNo) tokens.push(`SeqNo:${row.csvSeqNo}`);
    if (row.supportName) tokens.push(row.supportName);
    if (row.supportGuid) tokens.push(row.supportGuid);
    return tokens.join(", ");
  }

  if (row.ca?.[3]) tokens.push(row.ca[3]); // Material

  const length = Math.abs(row.len1 || row.len2 || row.len3 || 0);
  const axis = row.axis1 || row.axis2 || row.axis3 || "";

  if (length > 0) tokens.push(`LENGTH=${Math.round(length)}MM`);
  if (axis) tokens.push(axis.toUpperCase());

  if (row.refNo) tokens.push(`RefNo:=${row.refNo}`);
  if (row.csvSeqNo) tokens.push(`SeqNo:${row.csvSeqNo}`);

  if (row.brlen) tokens.push(`BrLen=${Math.round(row.brlen)}MM`);

  if (compType.includes("REDUCER") && row.bore && row.branchBore) {
    tokens.push(`Bore=${row.bore}/${row.branchBore}`);
  }

  if (row.ca?.[8]) tokens.push(`Wt=${row.ca[8]}`);

  return tokens.join(", ");
}
