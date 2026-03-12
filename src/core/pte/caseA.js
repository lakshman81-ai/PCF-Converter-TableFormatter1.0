/**
 * PTE CASE A: Enrich with Real_Type
 * Implementation of PCF-PTE-002 §2
 */

export function enrichWithRealType(rows) {
  const result = [...rows];

  for (let i = 0; i < result.length; i++) {
    const row = result[i];

    if (row.Point === 1) {
      row.Real_Type = row.Type;
    }
    else if (row.Point === 2) {
      const nextHead = findNextRowWithPoint1(result, i);
      row.Real_Type = nextHead ? nextHead.Type : "END";
    }
    else if (row.Point === 0) {
      row.Real_Type = row.Type;
      if (["ANCI", "RSTR", "SUPPORT"].includes(row.Type.toUpperCase())) {
        const next = findNextNonZeroPoint(result, i);
        row.Real_Type = next ? next.Type : row.Type;
      }
    }
    else if (row.Point === 3) {
      row.Real_Type = row.Type;
    }
  }

  return result;
}

function findNextRowWithPoint1(rows, startIdx) {
  for (let i = startIdx + 1; i < rows.length; i++) {
    if (rows[i].Point === 1) return rows[i];
  }
  return null;
}

function findNextNonZeroPoint(rows, startIdx) {
  for (let i = startIdx + 1; i < rows.length; i++) {
    if (rows[i].Point !== 0) return rows[i];
  }
  return null;
}
