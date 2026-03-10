import { fuzzyMatchHeader } from '../../utils/fuzzy';

/**
 * POINT CSV PARSER (Initial Ingestion)
 * Implementation of PART 3 of WI-PCF-002 Rev.0
 * Parses the CSV into intermediate rows before PTE conversion.
 */

const POINT_ALIASES = {
  seqNo: ["Sequence", "Seq", "Row", "RowNo", "Item"],
  type: ["Type", "Real_Type", "Component"],
  refNo: ["RefNo", "Ref", "Tag"],
  point: ["Point", "Pt"],
  ppoint: ["PPoint", "PPt"],
  lineKey: ["Line No", "Line_Key", "LineNumber", "Pipeline"],
  east: ["East", "X Coordinate", "X"],
  north: ["North", "Y Coordinate", "Y"],
  up: ["Up", "Z Coordinate", "Z"],
  bore: ["Bore", "NPS", "Size", "Dia"],
  skey: ["SKEY", "Skey", "Component Key"]
};

export function parsePointCSV(parsedData, config) {
  if (!parsedData || parsedData.length < 2) return [];

  const headers = parsedData[0];
  const rows = parsedData.slice(1);

  // Map columns
  const colMap = {};
  for (const [key, aliases] of Object.entries(POINT_ALIASES)) {
    const aliasObj = {};
    aliasObj[key] = aliases;
    const colIdx = headers.findIndex(h => fuzzyMatchHeader(h, aliasObj) === key);
    if (colIdx !== -1) colMap[key] = colIdx;
  }

  // Apply lineKey override from config if provided
  if (config?.pte?.lineKeyEnabled && config?.pte?.lineKeyColumn) {
      const colIdx = headers.findIndex(h => h.trim() === config.pte.lineKeyColumn);
      if (colIdx !== -1) colMap.lineKey = colIdx;
  }

  const intermediateRows = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some(cell => cell)) continue;

    const east = parseFloat(row[colMap.east]);
    const north = parseFloat(row[colMap.north]);
    const up = parseFloat(row[colMap.up]);

    // Parse Bore
    const boreStr = row[colMap.bore];
    const bore = parseBore(boreStr);

    const pointRow = {
      _rowIndex: i + 1,
      Sequence: row[colMap.seqNo] || (i + 1).toString(),
      Type: row[colMap.type] || "UNKNOWN",
      RefNo: row[colMap.refNo] || null,
      Point: row[colMap.point] ? parseInt(row[colMap.point], 10) : null,
      PPoint: row[colMap.ppoint] ? parseInt(row[colMap.ppoint], 10) : null,
      Line_Key: row[colMap.lineKey] || null,
      coord: (!isNaN(east) && !isNaN(north) && !isNaN(up)) ? { x: east, y: north, z: up } : null,
      bore: bore,
      skey: row[colMap.skey] || null,
    };

    intermediateRows.push(pointRow);
  }

  return intermediateRows;
}

function parseBore(boreStr) {
  if (!boreStr) return null;
  const str = boreStr.toString().toLowerCase().trim();

  if (str.includes("in")) {
    const val = parseFloat(str);
    return isNaN(val) ? null : val * 25.4;
  }
  if (str.includes("mm")) {
    const val = parseFloat(str);
    return isNaN(val) ? null : val;
  }

  const val = parseFloat(str);
  if (isNaN(val)) return null;

  const standardMM = new Set([15, 20, 25, 32, 40, 50, 65, 80, 90, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900, 1050, 1200]);
  if (val <= 48 && !standardMM.has(val)) {
    return val * 25.4;
  }

  return val;
}
