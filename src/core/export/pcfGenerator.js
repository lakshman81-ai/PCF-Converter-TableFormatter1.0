/**
 * PCF GENERATOR
 * Implementation of PCF Syntax Master v1.0
 */

import { enforceDataTableSchema } from '../schema.js';

export function generatePcf(dataTable, config) {
  const lines = [];
  const dec = config.decimals !== undefined ? config.decimals : (config.strictIsogen ? 1 : 4);

  // Enforce rigid schema before export
  const validatedTable = enforceDataTableSchema(dataTable);

  let globalPipelineRef = config.pipelineRef;
  if (!globalPipelineRef) {
    const pipeRow = dataTable.find(r => r.pipelineRef);
    globalPipelineRef = pipeRow ? pipeRow.pipelineRef : "export sys-1";
  }

  // === HEADER ===
  if (config.strictIsogen) {
    let addedPipelineRef = false;
    const hasStandardHeaders = validatedTable.some(r => ["ISOGEN-FILES", "UNITS-BORE"].includes(r.type));

    if (!hasStandardHeaders) {
      lines.push("ISOGEN-FILES ISOGEN.FLS");
      lines.push("UNITS-BORE MM");
      lines.push("UNITS-CO-ORDS MM");
      lines.push("UNITS-WEIGHT KGS");
      lines.push(`PIPELINE-REFERENCE ${globalPipelineRef}`);
      addedPipelineRef = true;
    } else {
      for (const row of validatedTable) {
        if (["ISOGEN-FILES", "UNITS-BORE", "UNITS-CO-ORDS", "UNITS-WEIGHT", "UNITS-BOLT-DIA", "UNITS-BOLT-LENGTH", "PROJECT-IDENTIFIER", "AREA", "PIPELINE-REFERENCE", "REVISION"].includes(row.type)) {
           let val = row.text || row.pipelineRef || globalPipelineRef;
           if (row.type !== "PIPELINE-REFERENCE") val = row.text;
           if (row.type === "PIPELINE-REFERENCE") addedPipelineRef = true;
           lines.push(`${row.type} ${val}`);
        }
      }
    }
    if (!addedPipelineRef) {
        lines.push(`PIPELINE-REFERENCE ${globalPipelineRef}`);
    }
    lines.push("");
  } else {
    // Legacy header formatting
    lines.push("ISOGEN-FILES ISOGEN.FLS");
    lines.push("UNITS-BORE MM");
    lines.push("UNITS-CO-ORDS MM");
    lines.push("UNITS-WEIGHT KGS");
    lines.push("UNITS-BOLT-DIA MM");
    lines.push("UNITS-BOLT-LENGTH MM");
    lines.push(`PIPELINE-REFERENCE ${globalPipelineRef}`);
    lines.push("    PROJECT-IDENTIFIER P1");
    lines.push("    AREA A1");
    lines.push("");
  }

  for (const row of validatedTable) {
    if (["ISOGEN-FILES", "UNITS-BORE", "UNITS-CO-ORDS", "UNITS-WEIGHT", "UNITS-BOLT-DIA", "UNITS-BOLT-LENGTH", "PROJECT-IDENTIFIER", "AREA", "REVISION"].includes(row.type)) {
      continue; // Skip header lines parsed from source
    }

    if (row.type === "PIPELINE-REFERENCE") {
      // Both strict and legacy headers generated PIPELINE-REFERENCE already.
      // Do not duplicate it here.
      continue;
    }

    // Output Message squares as well
    if (row.type === "MESSAGE-SQUARE") {
      lines.push(`MESSAGE-SQUARE ${row.text || ""}`);
      continue;
    }

    const compType = (row.type || "UNKNOWN").toUpperCase();

    const msg = row.text || buildMessageSquare(row, config.strictIsogen);
    if (msg) {
      lines.push("MESSAGE-SQUARE");
      lines.push(`    ${msg}`);
    }

    // SUPPORT block logic
    if (compType === "SUPPORT") {
      lines.push("SUPPORT");
      if (config.strictIsogen) {
          lines.push(`    CO-ORDS  ${fmtCoordWithoutBore(row.supportCoor, dec, true)}`);
          if (row.supportName) lines.push(`    <SUPPORT_NAME>  ${row.supportName}`);

          let itemCode = row.itemCode;
          if (itemCode) lines.push(`    ITEM-CODE ${itemCode}`);

          const val = row.ca?.[1];
          if (val !== null && val !== undefined && val !== "") {
              lines.push(`    COMPONENT-ATTRIBUTE1 ${val}`);
          }

          let guid = row.supportGuid || "";
          if (guid && !guid.startsWith("UCI:")) guid = `UCI:${guid}`;
          if (guid) lines.push(`    MESSAGE-SQUARE ${guid}`);
      } else {
          lines.push(`    CO-ORDS    ${fmtCoord(row.supportCoor, 0, dec)}`);
          if (row.supportName) lines.push(`    <SUPPORT_NAME>    ${row.supportName}`);
          let guid = row.supportGuid || "";
          if (guid && !guid.startsWith("UCI:")) guid = `UCI:${guid}`;
          if (guid) lines.push(`    <SUPPORT_GUID>    ${guid}`);
      }
      lines.push("");
      continue;
    }

    lines.push(compType);

    if (config.strictIsogen) {
        // Standard ISOGEN Order:
        // END-POINTs -> CENTRE-POINT -> BRANCH1-POINT -> SKEY -> ITEM-CODE -> COMPONENT-ATTRIBUTES

        // 1. END-POINTs
        if (compType === "OLET") {
          lines.push(`    END-POINT  ${fmtCoord(row.ep1, row.bore, dec, true)}`);
        } else if (compType === "REDUCER-CONCENTRIC" || compType === "REDUCER-ECCENTRIC") {
          lines.push(`    END-POINT  ${fmtCoord(row.ep1, row.bore || row.ep1?.bore, dec, true)}`);
          lines.push(`    END-POINT  ${fmtCoord(row.ep2, row.ep2?.bore || row.bore, dec, true)}`);
        } else {
          lines.push(`    END-POINT  ${fmtCoord(row.ep1, row.bore, dec, true)}`);
          lines.push(`    END-POINT  ${fmtCoord(row.ep2, row.bore, dec, true)}`);
        }

        // 2. CENTRE-POINT
        if (["BEND", "TEE", "OLET", "ELBOW"].includes(compType)) {
          if (row.cp) {
              lines.push(`    CENTRE-POINT  ${fmtCoordWithoutBore(row.cp, dec, true)}`);
          }
        }

        // 3. BRANCH1-POINT
        if (["TEE", "OLET"].includes(compType)) {
          if (row.bp) {
              lines.push(`    BRANCH1-POINT  ${fmtCoord(row.bp, row.branchBore || row.bore, dec, true)}`);
          }
        }

        // FABRICATION-ITEM
        if (row.fabricationItem) {
            lines.push(`    FABRICATION-ITEM`);
        }

        // 4. SKEY
        if (row.skey) {
          lines.push(`    SKEY ${row.skey}`);
        }

        // 5. ITEM-CODE
        let itemCode = row.itemCode;
        if (itemCode) {
          lines.push(`    ITEM-CODE ${itemCode}`);
        }

        if (compType === "PIPE" && row.pipelineRef && row.pipelineRef !== globalPipelineRef) {
          lines.push(`    PIPELINE-REFERENCE ${row.pipelineRef}`);
        }

        if (compType === "BEND" && row.angle) {
          const angleVal = config.angleFormat === "hundredths" ? Math.round(row.angle * 100) : row.angle.toFixed(4);
          lines.push(`    ANGLE  ${angleVal}`);
        }
        if (compType === "BEND" && row.bend_radius) {
          lines.push(`    BEND-RADIUS  ${row.bend_radius}`);
        }
        if (compType === "REDUCER-ECCENTRIC" && row.flat_direction) {
          lines.push(`    FLAT-DIRECTION  ${row.flat_direction}`);
        }

        // 6. COMPONENT-ATTRIBUTES
        const caKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 97, 98];
        for (const k of caKeys) {
          const val = row.ca?.[k];
          if (val !== null && val !== undefined && val !== "") {
            lines.push(`    COMPONENT-ATTRIBUTE${k} ${val}`);
          }
        }
    } else {
        // GEOMETRY (Legacy)
        if (compType === "OLET") {
          lines.push(`    CENTRE-POINT  ${fmtCoord(row.cp, row.bore, dec)}`);
          lines.push(`    BRANCH1-POINT ${fmtCoord(row.bp, row.branchBore || row.bore, dec)}`);
        } else if (compType === "REDUCER-CONCENTRIC" || compType === "REDUCER-ECCENTRIC") {
          lines.push(`    END-POINT    ${fmtCoord(row.ep1, row.bore || row.ep1?.bore, dec)}`);
          lines.push(`    END-POINT    ${fmtCoord(row.ep2, row.ep2?.bore || row.bore, dec)}`);
        } else {
          lines.push(`    END-POINT    ${fmtCoord(row.ep1, row.bore, dec)}`);
          lines.push(`    END-POINT    ${fmtCoord(row.ep2, row.bore, dec)}`);

          if (["BEND", "TEE"].includes(compType)) {
            lines.push(`    CENTRE-POINT  ${fmtCoord(row.cp, row.bore, dec)}`);
          }
          if (compType === "TEE") {
            lines.push(`    BRANCH1-POINT ${fmtCoord(row.bp, row.branchBore || row.bore, dec)}`);
          }
        }

        if (compType === "PIPE" && row.pipelineRef && row.pipelineRef !== globalPipelineRef) {
          lines.push(`    PIPELINE-REFERENCE ${row.pipelineRef}`);
        }

        if (row.skey) {
          lines.push(`    <SKEY>  ${row.skey}`);
        }

        if (compType === "BEND" && row.angle) {
          const angleVal = config.angleFormat === "hundredths" ? Math.round(row.angle * 100) : row.angle.toFixed(4);
          lines.push(`    ANGLE  ${angleVal}`);
        }
        if (compType === "BEND" && row.bend_radius) {
          lines.push(`    BEND-RADIUS  ${row.bend_radius}`);
        }
        if (compType === "REDUCER-ECCENTRIC" && row.flat_direction) {
          lines.push(`    FLAT-DIRECTION  ${row.flat_direction}`);
        }

        // CAs (skip 8 for PIPE/SUPPORT)
        const caKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 97, 98];
        for (const k of caKeys) {
          if (k === 8 && ["PIPE", "SUPPORT"].includes(compType)) continue;

          const val = row.ca?.[k];
          if (val !== null && val !== undefined && val !== "") {
            lines.push(`    COMPONENT-ATTRIBUTE${k}    ${val}`);
          }
        }
    }

    lines.push("");
  }

  return lines.join("\r\n");
}

function formatCoordVal(val, dec) {
    let zeros = dec > 0 ? `.${'0'.repeat(dec)}` : '.0';
    if (dec === 0) zeros = '';
    if (val === undefined || val === null || val === "") return `0${zeros}`;
    let numVal = Number(val);
    if (isNaN(numVal)) return val;
    return numVal % 1 === 0 ? (dec > 0 ? numVal.toFixed(dec) : numVal.toFixed(1)) : numVal.toString();
}

function fmtCoord(coord, bore, dec, strict) {
  if (!strict) {
     const boreStr = Number.isInteger(bore) ? bore.toFixed(dec) : (bore || 0).toFixed(dec);
     if (!coord) return `0.${'0'.repeat(dec)} 0.${'0'.repeat(dec)} 0.${'0'.repeat(dec)} ${boreStr}`;
     return `${(coord.x || 0).toFixed(dec)} ${(coord.y || 0).toFixed(dec)} ${(coord.z || 0).toFixed(dec)} ${boreStr}`;
  }

  let boreStr = "";
  if (bore !== undefined && bore !== null && bore !== "") {
    let numBore = Number(bore);
    if (numBore % 1 === 0) {
        boreStr = `  ${dec > 0 ? numBore.toFixed(dec) : numBore.toString()}`;
    } else {
        boreStr = `  ${numBore.toString()}`;
    }
  }

  let zeroStr = dec > 0 ? `0.${'0'.repeat(dec)}` : `0.0`;
  if (!coord) return `${zeroStr} ${zeroStr} ${zeroStr}${boreStr}`;
  return `${formatCoordVal(coord.x, dec)} ${formatCoordVal(coord.y, dec)} ${formatCoordVal(coord.z, dec)}${boreStr}`;
}

function fmtCoordWithoutBore(coord, dec, strict) {
  if (!strict) {
     if (!coord) return `0.${'0'.repeat(dec)} 0.${'0'.repeat(dec)} 0.${'0'.repeat(dec)}`;
     return `${(coord.x || 0).toFixed(dec)} ${(coord.y || 0).toFixed(dec)} ${(coord.z || 0).toFixed(dec)}`;
  }
  let zeroStr = dec > 0 ? `0.${'0'.repeat(dec)}` : `0.0`;
  if (!coord) return `${zeroStr} ${zeroStr} ${zeroStr}`;
  return `${formatCoordVal(coord.x, dec)} ${formatCoordVal(coord.y, dec)} ${formatCoordVal(coord.z, dec)}`;
}

function buildMessageSquare(row, strict) {
  if (strict) {
     if (row.text && row.text.trim()) return row.text.trim();
     return null;
  }

  if (row.text && row.text.trim()) return row.text.trim(); // use explicit if present

  const tokens = [];
  tokens.push(row.type || "UNKNOWN");
  if (row.ca?.[3]) tokens.push(row.ca[3]);

  const len = Math.abs(row.len1 || row.len2 || row.len3 || 0);
  const axis = row.axis1 || row.axis2 || row.axis3 || "";
  if (len > 0) tokens.push(`LENGTH=${Math.round(len)}MM`);
  if (axis) tokens.push(axis.toUpperCase());

  const ref = row.ca?.[97] || row.refNo || "";
  const seq = row.ca?.[98] || row.csvSeqNo || "";
  if (ref) tokens.push(ref.startsWith('=') ? `RefNo:${ref}` : `RefNo:=${ref}`);
  if (seq) tokens.push(`SeqNo:${seq}`);

  if (["TEE", "OLET"].includes((row.type || "").toUpperCase()) && row.brlen) {
    tokens.push(`BrLen=${Math.round(Math.abs(row.brlen))}MM`);
  }

  if ((row.type || "").toUpperCase().startsWith("REDUCER")) {
    const lBore = row.ep1?.bore || row.bore;
    const sBore = row.ep2?.bore || row.bore;
    if (lBore && sBore) tokens.push(`Bore=${lBore}/${sBore}`);
  }

  if (row.ca?.[8]) {
    tokens.push(`Wt=${row.ca[8]}`);
  }

  return tokens.join(", ");
}
