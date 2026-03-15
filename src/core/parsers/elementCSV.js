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

export function parseElementCSV(firstRows, columnMap) {
  if (!firstRows || firstRows.length === 0) return [];

  const dataTable = [];

  // Helper to extract value using the columnMap
  const getVal = (row, canonicalKey) => {
    // columnMap is { csvHeader: canonicalKey }
    const origHeader = Object.keys(columnMap || {}).find(h => columnMap[h] === canonicalKey);
    return origHeader && row[origHeader] ? row[origHeader] : null;
  };

  for (let i = 0; i < firstRows.length; i++) {
    const row = firstRows[i];

    const type = getVal(row, 'COMPONENT') || getVal(row, 'Type') || "UNKNOWN";

    const boreStr = getVal(row, 'BORE');
    const bore = parseBore(boreStr);

    const rowObj = {
      _source: "CSV",
      _logTags: [],
      _rowIndex: i + 1,

      csvSeqNo: getVal(row, 'CSV SEQ NO') || getVal(row, 'Sequence') || (i + 1).toString(),
      type: type.toUpperCase(),
      text: getVal(row, 'TEXT') || "",
      pipelineRef: getVal(row, 'PIPELINE-REFERENCE') || getVal(row, 'PIPELINE') || "",
      refNo: getVal(row, 'REF NO.') || getVal(row, 'RefNo') || "",
      bore: bore,

      ep1: parseCoordinateCell(getVal(row, 'EP1 COORDS')),
      ep2: parseCoordinateCell(getVal(row, 'EP2 COORDS')),
      cp: parseCoordinateCell(getVal(row, 'CP COORDS')),
      bp: parseCoordinateCell(getVal(row, 'BP COORDS')),

      skey: getVal(row, 'SKEY') || "",

      supportCoor: parseCoordinateCell(getVal(row, 'SUPPORT COORDS')),
      supportName: "",
      supportGuid: getVal(row, 'SUPPORT GUID') || "",

      ca: {
        1: getVal(row, 'CA1') || getVal(row, 'CA 1') || null,
        2: getVal(row, 'CA2') || getVal(row, 'CA 2') || null,
        3: getVal(row, 'CA3') || getVal(row, 'CA 3') || null,
        4: getVal(row, 'CA4') || getVal(row, 'CA 4') || null,
        8: getVal(row, 'CA8') || getVal(row, 'CA 8') || null,
        97: getVal(row, 'CA97') || getVal(row, 'CA 97') || null,
        98: getVal(row, 'CA98') || getVal(row, 'CA 98') || null,
      },

      brlen: parseFloat(getVal(row, 'BRLEN')) || null,
    };

    // Explicitly map itemCode properly
    rowObj.itemCode = rowObj.refNo;

    // Fallback logic mapping
    if (rowObj.type === "SUPPORT" && rowObj.ep1 && !rowObj.supportCoor) {
       rowObj.supportCoor = rowObj.ep1;
    }

    if (rowObj.type === "OLET") {
       if (i > 0) {
          const prevRow = dataTable[i - 1];
          if (prevRow && prevRow.bore) {
             rowObj.branchBore = rowObj.bore;
             rowObj.bore = prevRow.bore; // inherit header bore
          }
       } else {
           rowObj.branchBore = rowObj.bore;
       }
    } else if (["TEE"].includes(rowObj.type)) {
       rowObj.branchBore = rowObj.bore;
    }

    dataTable.push(rowObj);
  }

  return dataTable; // Removed validation step entirely as requested
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
