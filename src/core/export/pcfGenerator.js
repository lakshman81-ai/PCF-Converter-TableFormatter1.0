/**
 * PCF GENERATOR
 * Implementation of PCF Syntax Master v1.0
 */

export function generatePcf(dataTable, config) {
  const lines = [];
  const dec = config.decimals === 1 ? 1 : 4;

  let globalPipelineRef = config.pipelineRef;
  if (!globalPipelineRef) {
    const pipeRow = dataTable.find(r => r.pipelineRef);
    globalPipelineRef = pipeRow ? pipeRow.pipelineRef : "export sys-1";
  }

  // === HEADER ===
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

  for (const row of dataTable) {
    if (["ISOGEN-FILES", "UNITS-BORE", "UNITS-CO-ORDS", "UNITS-WEIGHT", "UNITS-BOLT-DIA", "UNITS-BOLT-LENGTH", "PROJECT-IDENTIFIER", "AREA"].includes(row.type)) {
      continue; // Skip header lines parsed from source
    }

    if (row.type === "PIPELINE-REFERENCE" || row.type === "MESSAGE-SQUARE") {
      continue;
    }

    const compType = (row.type || "UNKNOWN").toUpperCase();

    const msg = row.text || buildMessageSquare(row);
    if (msg) {
      lines.push("MESSAGE-SQUARE");
      lines.push(`    ${msg}`);
    }

    // SUPPORT block logic
    if (compType === "SUPPORT") {
      lines.push("SUPPORT");
      lines.push(`    CO-ORDS    ${fmtCoord(row.supportCoor, 0, dec)}`);
      if (row.supportName) lines.push(`    <SUPPORT_NAME>    ${row.supportName}`);
      let guid = row.supportGuid || "";
      if (guid && !guid.startsWith("UCI:")) guid = `UCI:${guid}`;
      if (guid) lines.push(`    <SUPPORT_GUID>    ${guid}`);
      lines.push("");
      continue;
    }

    lines.push(compType);

    // GEOMETRY
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

    lines.push("");
  }

  return lines.join("\r\n");
}

function fmtCoord(coord, bore, dec) {
  const boreStr = Number.isInteger(bore) ? bore.toFixed(dec) : (bore || 0).toFixed(dec);
  if (!coord) return `0.${'0'.repeat(dec)} 0.${'0'.repeat(dec)} 0.${'0'.repeat(dec)} ${boreStr}`;
  return `${(coord.x || 0).toFixed(dec)} ${(coord.y || 0).toFixed(dec)} ${(coord.z || 0).toFixed(dec)} ${boreStr}`;
}

function buildMessageSquare(row) {
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
