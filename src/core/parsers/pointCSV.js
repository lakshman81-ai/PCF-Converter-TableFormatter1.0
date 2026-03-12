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

import { runPTEConversion } from '../pte/index.js';

export function parsePointCSV(firstRows, columnMap, config) {
  if (!firstRows || firstRows.length === 0) return [];

  // Helper to extract value using the columnMap
  const getVal = (row, expectedCol) => {
    // Find the original header that was mapped to 'expectedCol'
    const origHeader = Object.keys(columnMap).find(h => columnMap[h] === expectedCol);
    return origHeader ? row[origHeader] : null;
  };

  const intermediateRows = [];

  for (let i = 0; i < firstRows.length; i++) {
    const row = firstRows[i];

    const east = parseFloat(getVal(row, 'East'));
    const north = parseFloat(getVal(row, 'North'));
    const up = parseFloat(getVal(row, 'Up'));

    const obj = {
      Sequence: getVal(row, 'Sequence') || i + 1,
      Type: (getVal(row, 'Type') || "UNKNOWN").toUpperCase(),
      RefNo: getVal(row, 'RefNo') || null,
      Point: parseInt(getVal(row, 'Point')),
      PPoint: parseInt(getVal(row, 'PPoint')),
      Line_Key: getVal(row, 'Line_Key') || null,
      East: isNaN(east) ? null : east,
      North: isNaN(north) ? null : north,
      Up: isNaN(up) ? null : up,
      Bore: parseBore(getVal(row, 'Bore')) || null,
      Skey: getVal(row, 'SKEY') || null,

      coord: null,

      // Preserve full row for CA/support fallback
      _raw: row
    };

    if (obj.East !== null && obj.North !== null && obj.Up !== null) {
      obj.coord = { x: obj.East, y: obj.North, z: obj.Up };
    }

    intermediateRows.push(obj);
  }

  // Then immediately run PTE conversion
  return runPTEConversion(intermediateRows, config, []);
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
