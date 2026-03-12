/**
 * Data Table Schema Enforcer (Manual Validation to avoid Zod minification crashes)
 */

function cleanCoord(coord) {
  if (!coord) return null;
  return {
    x: Number(coord.x) || 0,
    y: Number(coord.y) || 0,
    z: Number(coord.z) || 0
  };
}

export function enforceDataTableSchema(table) {
  if (!Array.isArray(table)) throw new Error("Data table must be an array.");

  return table.map((row, idx) => {
    // Return a strictly mapped 42-column object.
    return {
      _rowIndex: row._rowIndex ?? idx + 1,
      _source: row._source ?? "UNKNOWN",
      _modified: row._modified ?? {},
      _logTags: Array.isArray(row._logTags) ? row._logTags : [],

      csvSeqNo: row.csvSeqNo ?? null,
      pipelineRef: row.pipelineRef ?? null,
      type: String(row.type || "").toUpperCase(),
      text: row.text ?? "",
      refNo: row.refNo ?? "",
      bore: row.bore !== undefined && row.bore !== null ? Number(row.bore) : null,
      branchBore: row.branchBore !== undefined && row.branchBore !== null ? Number(row.branchBore) : null,

      ep1: cleanCoord(row.ep1),
      ep2: cleanCoord(row.ep2),
      cp: cleanCoord(row.cp),
      bp: cleanCoord(row.bp),

      skey: row.skey ?? "",

      supportCoor: cleanCoord(row.supportCoor),
      supportName: row.supportName ?? "",
      supportGuid: row.supportGuid ?? "",

      ca: typeof row.ca === 'object' && row.ca !== null ? row.ca : {
        1: null, 2: null, 3: null, 4: null, 5: null,
        6: null, 7: null, 8: null, 9: null, 10: null,
        97: null, 98: null
      },

      len1: row.len1 !== undefined && row.len1 !== null ? Number(row.len1) : null,
      len2: row.len2 !== undefined && row.len2 !== null ? Number(row.len2) : null,
      len3: row.len3 !== undefined && row.len3 !== null ? Number(row.len3) : null,

      axis1: row.axis1 ?? null,
      axis2: row.axis2 ?? null,
      axis3: row.axis3 ?? null,

      fixingAction: row.fixingAction ?? null,
      fixingActionTier: row.fixingActionTier ?? null,
      fixingActionRuleId: row.fixingActionRuleId ?? null,

      // Preserve everything else just in case (passthrough)
      ...row
    };
  });
}
