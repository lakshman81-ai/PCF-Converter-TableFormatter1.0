import { vec } from '../../utils/math';

/**
 * PCF TEXT PARSER
 * Implementation of PART 5 of WI-PCF-002 Rev.0
 * Line-by-line state machine mapping to unified Row Object Schema.
 */

export function parsePCFText(pcfContent) {
  const lines = pcfContent.split(/\r?\n/);
  const dataTable = [];
  const headerRows = [];

  let currentComponent = null;
  let currentMessageSquare = null;
  let pipelineRef = null;
  let rowIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    const keyword = parts[0].toUpperCase();

    // --- Header parsing ---
    if (["ISOGEN-FILES", "UNITS-BORE", "UNITS-CO-ORDS", "UNITS-WEIGHT", "UNITS-BOLT-DIA", "UNITS-BOLT-LENGTH", "PROJECT-IDENTIFIER", "AREA"].includes(keyword)) {
      headerRows.push(line);
      continue;
    }

    if (keyword === "PIPELINE-REFERENCE") {
      if (!currentComponent) {
        // Top-level pipeline reference
        pipelineRef = trimmed.substring("PIPELINE-REFERENCE".length).trim();
        headerRows.push(line);
      } else {
        // Sub-line reference within PIPE
        currentComponent.pipelineRef = trimmed.substring("PIPELINE-REFERENCE".length).trim();
      }
      continue;
    }

    // --- Component matching ---
    if (keyword === "MESSAGE-SQUARE") {
      // Begin a new block, store message square text from the next line
      if (currentComponent) {
        dataTable.push(finalizeComponent(currentComponent, rowIndex++));
        currentComponent = null;
      }

      let msgLine = lines[i + 1] ? lines[i + 1].trim() : "";
      if (msgLine && !isComponentKeyword(msgLine.split(/\s+/)[0])) {
        currentMessageSquare = msgLine;
        i++; // skip message line
      } else {
        currentMessageSquare = "";
      }
      continue;
    }

    if (isComponentKeyword(keyword)) {
      if (currentComponent && currentComponent.type !== "SUPPORT") { // Support msg squares are a bit weird, usually no message square
         dataTable.push(finalizeComponent(currentComponent, rowIndex++));
      }

      currentComponent = createNewComponent(keyword, currentMessageSquare, pipelineRef);
      currentMessageSquare = null;
      continue;
    }

    // --- Attributes of current component ---
    if (!currentComponent) continue;

    if (keyword === "END-POINT") {
       const pt = parseCoord(parts);
       if (!currentComponent.ep1) currentComponent.ep1 = pt;
       else if (!currentComponent.ep2) currentComponent.ep2 = pt;
       // We ignore 3rd endpoint if it exists
       if (!currentComponent.bore) currentComponent.bore = pt.bore;
    }
    else if (keyword === "CENTRE-POINT") {
       const pt = parseCoord(parts);
       currentComponent.cp = pt;
       if (!currentComponent.bore) currentComponent.bore = pt.bore;
    }
    else if (keyword === "BRANCH1-POINT") {
       const pt = parseCoord(parts);
       currentComponent.bp = pt;
       currentComponent.branchBore = pt.bore;
    }
    else if (keyword === "CO-ORDS") {
       const pt = parseCoord(parts);
       currentComponent.supportCoor = pt;
    }
    else if (keyword === "<SKEY>") {
       currentComponent.skey = parts[1] || "";
    }
    else if (keyword === "<SUPPORT_NAME>") {
       currentComponent.supportName = parts[1] || "";
    }
    else if (keyword === "<SUPPORT_GUID>") {
       currentComponent.supportGuid = parts[1] || "";
    }
    else if (keyword.startsWith("COMPONENT-ATTRIBUTE")) {
       const attrNum = parseInt(keyword.replace("COMPONENT-ATTRIBUTE", ""), 10);
       const attrVal = trimmed.substring(keyword.length).trim();
       if (!currentComponent.ca) currentComponent.ca = {};
       currentComponent.ca[attrNum] = attrVal;

       if (attrNum === 97) currentComponent.refNo = attrVal.replace(/^=/, "");
       if (attrNum === 98) currentComponent.csvSeqNo = attrVal;
    }
    else if (keyword === "ANGLE") {
       // Ignore for geometry logic, but can be kept for regen
    }
    else if (keyword === "BEND-RADIUS") {
       // Can keep for bend reconstruction
    }
    else if (keyword === "FLAT-DIRECTION") {
       // Keep for eccentric reducers
    }
  }

  // Push the last component
  if (currentComponent) {
    dataTable.push(finalizeComponent(currentComponent, rowIndex++));
  }

  return { headerRows, dataTable: dataTable, pipelineRef };
}

// Helpers
function isComponentKeyword(keyword) {
  const KWS = ["PIPE", "BEND", "ELBO", "TEE", "FLANGE", "VALVE", "OLET", "REDUCER-CONCENTRIC", "REDUCER-ECCENTRIC", "SUPPORT"];
  return KWS.includes(keyword.toUpperCase());
}

function createNewComponent(type, messageSquareText, defaultPipelineRef) {
  let refNo = "";
  let csvSeqNo = "";

  if (messageSquareText) {
    // Basic extraction from MESSAGE-SQUARE
    const parts = messageSquareText.split(",").map(p => p.trim());
    for (const p of parts) {
      if (p.startsWith("RefNo:=")) refNo = p.substring(7);
      else if (p.startsWith("SeqNo:")) csvSeqNo = p.substring(6);
    }
  }

  return {
    _source: "PCF",
    _logTags: [],
    type: type,
    text: messageSquareText || "",
    pipelineRef: defaultPipelineRef,
    refNo,
    csvSeqNo,
    ep1: null,
    ep2: null,
    cp: null,
    bp: null,
    supportCoor: null,
    bore: null,
    branchBore: null,
    ca: {}
  };
}

function parseCoord(parts) {
  return {
    x: parseFloat(parts[1] || 0),
    y: parseFloat(parts[2] || 0),
    z: parseFloat(parts[3] || 0),
    bore: parseFloat(parts[4] || 0)
  };
}

function finalizeComponent(comp, index) {
  comp._rowIndex = index;

  // Calculate Deltas and Lengths if possible
  if (comp.ep1 && comp.ep2) {
    comp.deltaX = comp.ep2.x - comp.ep1.x;
    comp.deltaY = comp.ep2.y - comp.ep1.y;
    comp.deltaZ = comp.ep2.z - comp.ep1.z;

    comp.len1 = comp.deltaX !== 0 ? comp.deltaX : null;
    comp.axis1 = comp.deltaX > 0 ? "East" : (comp.deltaX < 0 ? "West" : null);

    comp.len2 = comp.deltaY !== 0 ? comp.deltaY : null;
    comp.axis2 = comp.deltaY > 0 ? "North" : (comp.deltaY < 0 ? "South" : null);

    comp.len3 = comp.deltaZ !== 0 ? comp.deltaZ : null;
    comp.axis3 = comp.deltaZ > 0 ? "Up" : (comp.deltaZ < 0 ? "Down" : null);
  }

  if (comp.cp && comp.bp) {
    comp.brlen = vec.mag(vec.sub(comp.bp, comp.cp));
  }

  comp.diameter = comp.bore;
  comp.wallThick = comp.ca?.[4] || null;

  // Fallbacks
  if (!comp.refNo) comp.refNo = comp.ca?.[97] ? comp.ca[97].replace(/^=/, "") : "";
  if (!comp.csvSeqNo) comp.csvSeqNo = comp.ca?.[98] || index.toString();

  return comp;
}
