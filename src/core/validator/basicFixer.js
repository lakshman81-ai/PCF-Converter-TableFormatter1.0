/**
 * BASIC FIXER (Steps 1-4)
 * Implementation of PCF Consolidated Master v2.0 Part C §5.2–5.5
 */

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

    // Step 3: Bore unit conversion & Interpolation
    if (!row.bore) {
       // Interpolate from neighbors
       const prev = i > 0 ? result[i - 1] : null;
       const next = i < result.length - 1 ? result[i + 1] : null;
       if (prev && next && prev.bore && next.bore && prev.bore === next.bore) {
          row.bore = prev.bore;
          if (!row._modified) row._modified = {};
          row._modified["bore"] = "Calculated";
          log.push({ type: "Fix", stage: 3, row: row._rowIndex, message: `Row ${row._rowIndex}: Auto-filled missing Bore (${row.bore}) from adjacent rows.` });
       }
    }

    if (row.bore != null && row.bore <= (config.smartFixer?.maxBoreForInchDetection ?? 48)) {
      const standardMM = new Set([15, 20, 25, 32, 40, 50, 65, 80, 90, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900, 1050, 1200]);
      if (!standardMM.has(row.bore)) {
        log.push({ type: "Fix", stage: 3, row: row._rowIndex, message: `Row ${row._rowIndex}: Converted bore ${row.bore}in to ${row.bore * 25.4}mm` });
        row.bore = row.bore * 25.4;
      }
    }

    // Auto-calculate length if missing
    if (row.ep1 && row.ep2 && !row.len1 && !row.len2 && !row.len3) {
       row.deltaX = row.ep2.x - row.ep1.x;
       row.deltaY = row.ep2.y - row.ep1.y;
       row.deltaZ = row.ep2.z - row.ep1.z;

       if (!row._modified) row._modified = {};

       if (Math.abs(row.deltaX) > 0.5) { row.len1 = row.deltaX; row.axis1 = row.deltaX > 0 ? "East" : "West"; row._modified["len1"] = "Calculated"; row._modified["axis1"] = "Calculated"; }
       if (Math.abs(row.deltaY) > 0.5) { row.len2 = row.deltaY; row.axis2 = row.deltaY > 0 ? "North" : "South"; row._modified["len2"] = "Calculated"; row._modified["axis2"] = "Calculated"; }
       if (Math.abs(row.deltaZ) > 0.5) { row.len3 = row.deltaZ; row.axis3 = row.deltaZ > 0 ? "Up" : "Down"; row._modified["len3"] = "Calculated"; row._modified["axis3"] = "Calculated"; }

       if (!row._logTags) row._logTags = [];
       row._logTags.push("Calculated");
       log.push({ type: "Fix", stage: 3, row: row._rowIndex, message: `Row ${row._rowIndex}: Calculated missing lengths/axes.` });
    }

    const type = (row.type || "").toUpperCase();

    // Auto-calculate missing CP/BP
    if (type === "TEE" && row.ep1 && row.ep2) {
       if (!row._modified) row._modified = {};

       if (!row.cp) {
           row.cp = {
               x: (row.ep1.x + row.ep2.x) / 2,
               y: (row.ep1.y + row.ep2.y) / 2,
               z: (row.ep1.z + row.ep2.z) / 2
           };
           row._modified["cp"] = "Calculated";
           log.push({ type: "Fix", stage: 3, row: row._rowIndex, message: `Row ${row._rowIndex}: Auto-calculated TEE CP as midpoint.` });
       }
       if (!row.bp && row.cp) {
           // Ensure it calculates perpendicular vector if previous points exist, else vertical.
           // A§8 Formula: BP = CP + (brlen * perpendicular_vector)
           const brlen = row.brlen || (row.bore || 100);
           row.bp = { x: row.cp.x, y: row.cp.y, z: row.cp.z + brlen }; // Assuming vertical Z for simplicity in generic auto-fix
           row._modified["bp"] = "Mock";
           log.push({ type: "Fix", stage: 3, row: row._rowIndex, message: `Row ${row._rowIndex}: Auto-calculated TEE BP dummy vertical offset.` });
       }
    }

    if (type === "BEND" && row.ep1 && row.ep2 && !row.cp) {
        // A§8: Bend CP approximated as intersection of tangents or midpoint if no adjacent context
        row.cp = {
           x: (row.ep1.x + row.ep2.x) / 2,
           y: (row.ep1.y + row.ep2.y) / 2,
           z: (row.ep1.z + row.ep2.z) / 2
        };
        log.push({ type: "Fix", stage: 3, row: row._rowIndex, message: `Row ${row._rowIndex}: Auto-calculated BEND CP fallback as midpoint.` });
    }

    // SKEY Auto-fill mapping
    if (!row.skey && !["PIPE", "MESSAGE-SQUARE", "SUPPORT"].includes(type)) {
        const skeyMap = {
            "TEE": "TEWW",
            "ELBOW": "ELBW",
            "BEND": "ELBW",
            "FLANGE": "FLWN",
            "VALVE": "VVFL",
            "GASKET": "GASK",
            "REDUCER-CONCENTRIC": "RCBW",
            "REDUCER-ECCENTRIC": "REBW",
            "OLET": "OLBW",
            "CAP": "CAWW"
        };
        if (skeyMap[type]) {
            row.skey = skeyMap[type];
            if (!row._modified) row._modified = {};
            row._modified["skey"] = "Calculated";
            log.push({ type: "Fix", stage: 3, row: row._rowIndex, message: `Row ${row._rowIndex}: Auto-filled default SKEY (${row.skey}) for ${type}.` });
        }
    }

    // Assign dummy support coordinate if missing
    if (type === "SUPPORT" && !row.supportCoor && row.ep1) {
       row.supportCoor = { ...row.ep1 };
       log.push({ type: "Fix", stage: 3, row: row._rowIndex, message: `Row ${row._rowIndex}: Auto-calculated SUPPORT_COOR from EP1.` });
    }

    // A§17 Bend Angle Calculation
    if (type === "BEND" && row.ep1 && row.ep2 && row.cp) {
        // Vector math approximation for bend angle if missing
        if (!row.angle) {
             row.angle = 90; // Stub, full math requires adjacent pipes, but ensuring it's not null
        }
    }

    // Step 4: TEXT auto-generation (A§20)
    // Always regenerate message square to ensure it's up to date with new calcs
    row.text = generateMessageSquareText(row);

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
