import { fuzzyMatchHeader } from '../../utils/fuzzy';
import { validateDataTable } from '../schema';

/**
 * ELEMENT CSV PARSER
 * Implementation of PART 4 of WI-PCF-002 Rev.0
 */

const ALIASES = {
  seqNo: ["CSV SEQ NO", "SEQ NO", "Seq No", "SL.NO", "Sl No", "SL NO", "SeqNo", "Seq", "Sequence", "Sequence No", "Item No", "#", "Row", "Row No", "RowNo", "Row Number", "SN", "S.N.", "S.No", "S No"],
  type: ["Type", "Component", "Comp Type", "CompType", "Component Type", "Fitting", "Item"],
  text: ["TEXT", "Text", "Description", "Desc", "Comment", "MSG"],
  pipelineRef: ["PIPELINE-REFERENCE", "Pipeline Ref", "Line No", "Line Number", "Line No.", "LineNo", "PIPE", "Pipe Line"],
  refNo: ["REF NO.", "Ref No", "RefNo", "Reference No", "Reference Number", "Ref", "Tag No", "TagNo"],
  bore: ["BORE", "Bore", "NPS", "Nominal Bore", "Dia", "Diameter", "Size", "Pipe Size", "DN"],
  ep1: ["EP1 COORDS", "EP1", "Start Point", "From", "From Coord", "Start Coord", "EP1_X EP1_Y EP1_Z"],
  ep2: ["EP2 COORDS", "EP2", "End Point", "To", "To Coord", "End Coord", "EP2_X EP2_Y EP2_Z"],
  cp: ["CP COORDS", "CP", "Centre Point", "Center Point", "Centre", "Center", "CenterPt"],
  bp: ["BP COORDS", "BP", "Branch Point", "Branch", "Branch1", "BranchPt"],
  skey: ["SKEY", "Skey", "S-Key", "Component Key", "Fitting Key"],
  supportCoor: ["SUPPORT COOR", "Support Coord", "Support Point", "Restraint Coord", "RestPt"],
  supportGuid: ["SUPPORT GUID", "Support GUID", "GUID", "Node Name", "NodeName", "UCI"],
  ca1: ["CA1", "CA 1", "Attr1", "Attribute 1", "Attribute1"],
  ca2: ["CA2", "CA 2", "Attr2", "Attribute 2", "Attribute2"],
  ca3: ["CA3", "CA 3", "Attr3", "Attribute 3", "Attribute3", "Material", "Matl"],
  ca4: ["CA4", "CA 4", "Attr4", "Attribute 4", "Attribute4", "WT", "Wall Thick"],
  ca8: ["CA8", "CA 8", "Attr8", "Attribute 8", "Attribute8", "Weight", "Wt"],
  ca97: ["CA97", "CA 97", "Ref No Attr", "RefAttr"],
  ca98: ["CA98", "CA 98", "Seq No Attr", "SeqAttr"],
  brlen: ["BRLEN", "BrLen", "Branch Length", "Branch Len", "Br Len"]
};

export function parseElementCSV(parsedData) {
  // `parsedData` is expected to be an array of arrays [ [header1, header2], [val1, val2] ]
  if (!parsedData || parsedData.length < 2) return [];

  const headers = parsedData[0];
  const rows = parsedData.slice(1);

  // Map columns to their indices
  const colMap = {};
  for (const [key, aliases] of Object.entries(ALIASES)) {
    const aliasObj = {};
    aliasObj[key] = aliases;

    // Find the column index
    const colIdx = headers.findIndex(h => fuzzyMatchHeader(h, aliasObj) === key);
    if (colIdx !== -1) {
      colMap[key] = colIdx;
    }
  }

  const dataTable = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some(cell => cell)) continue; // skip empty rows

    // Base type is mandatory
    const type = row[colMap.type] || "UNKNOWN";

    // Parse Bore
    const boreStr = row[colMap.bore];
    const bore = parseBore(boreStr);

    // Build Row Object
    const rowObj = {
      _source: "CSV",
      _logTags: [],
      _rowIndex: i + 1,

      csvSeqNo: row[colMap.seqNo] || (i + 1).toString(),
      type: type.toUpperCase(),
      text: row[colMap.text] || "",
      pipelineRef: row[colMap.pipelineRef] || "",
      refNo: row[colMap.refNo] || row[colMap.ca97] || "",
      bore: bore,

      ep1: parseCoordinateCell(row[colMap.ep1]),
      ep2: parseCoordinateCell(row[colMap.ep2]),
      cp: parseCoordinateCell(row[colMap.cp]),
      bp: parseCoordinateCell(row[colMap.bp]),

      skey: row[colMap.skey] || "",

      supportCoor: parseCoordinateCell(row[colMap.supportCoor]),
      supportName: "", // Derived later or if explicit col added
      supportGuid: row[colMap.supportGuid] || "",

      ca: {
        1: row[colMap.ca1] || null,
        2: row[colMap.ca2] || null,
        3: row[colMap.ca3] || null,
        4: row[colMap.ca4] || null,
        8: row[colMap.ca8] || null,
        97: row[colMap.ca97] || null,
        98: row[colMap.ca98] || null,
      },

      brlen: parseFloat(row[colMap.brlen]) || null,
    };

    // Fallback logic mapping
    if (rowObj.type === "SUPPORT" && rowObj.ep1 && !rowObj.supportCoor) {
       rowObj.supportCoor = rowObj.ep1;
    }

    dataTable.push(rowObj);
  }

  return validateDataTable(dataTable);
}

function parseCoordinateCell(cellText) {
  if (!cellText || typeof cellText !== 'string') return null;
  // Matches typical format: "96400.0, 17986.4, 101968.0" or "96400.0 17986.4 101968.0"
  const parts = cellText.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    return {
      x: parseFloat(parts[0]),
      y: parseFloat(parts[1]),
      z: parseFloat(parts[2]),
    };
  }
  return null;
}

function parseBore(boreStr) {
  if (!boreStr) return null;
  const str = boreStr.toString().toLowerCase().trim();

  // Basic unit conversion
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

  // Implicit inch detection (typically sizes like 2, 4, 6, 8)
  const standardMM = new Set([15, 20, 25, 32, 40, 50, 65, 80, 90, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900, 1050, 1200]);
  if (val <= 48 && !standardMM.has(val)) {
    return val * 25.4;
  }

  return val;
}
