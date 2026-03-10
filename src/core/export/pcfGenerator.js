/**
 * PCF GENERATOR
 * Implementation of PCF Consolidated Master v2.0 Part A §14
 */

export function generatePcf(dataTable, config) {
  const lines = [];
  const dec = config.decimals === 1 ? 1 : 4;

  const resolvePipelineRef = (c) => c.pipelineRef || "export test-line-1";

  // === HEADER ===
  lines.push("ISOGEN-FILES ISOGEN.FLS");
  lines.push("UNITS-BORE MM");
  lines.push("UNITS-CO-ORDS MM");
  lines.push("UNITS-WEIGHT KGS");
  lines.push("UNITS-BOLT-DIA MM");
  lines.push("UNITS-BOLT-LENGTH MM");
  lines.push(`PIPELINE-REFERENCE ${resolvePipelineRef(config)}`);
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

    // MESSAGE-SQUARE
    const msg = row.text || "Generated Message Square";
    lines.push("MESSAGE-SQUARE");
    lines.push(`    ${msg}`);

    if (compType === "SUPPORT") {
      lines.push("SUPPORT");
      lines.push(`    CO-ORDS    ${fmtCoord(row.supportCoor, 0, dec)}`);
      if (row.supportName) lines.push(`    <SUPPORT_NAME>    ${row.supportName}`);
      if (row.supportGuid) lines.push(`    <SUPPORT_GUID>    ${row.supportGuid}`);
      lines.push("");
      continue;
    }

    lines.push(compType);

    // GEOMETRY
    if (compType === "OLET") {
      lines.push(`    CENTRE-POINT  ${fmtCoord(row.cp, row.bore, dec)}`);
      lines.push(`    BRANCH1-POINT ${fmtCoord(row.bp, row.branchBore || row.bore, dec)}`);
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

    if (compType === "PIPE" && row.pipelineRef) {
      lines.push(`    PIPELINE-REFERENCE ${row.pipelineRef}`);
    }

    if (row.skey) {
      lines.push(`    <SKEY>  ${row.skey}`);
    }

    if (compType === "BEND" && row.angle) {
      lines.push(`    ANGLE  ${row.angle}`);
    }
    if (compType === "BEND" && row.bend_radius) {
      lines.push(`    BEND-RADIUS  ${row.bend_radius}`);
    }
    if (compType === "REDUCER-ECCENTRIC" && row.flat_direction) {
      lines.push(`    FLAT-DIRECTION  ${row.flat_direction}`);
    }

    // CAs
    const caKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 97, 98];
    for (const k of caKeys) {
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
  if (!coord) return `0.${'0'.repeat(dec)} 0.${'0'.repeat(dec)} 0.${'0'.repeat(dec)} ${(bore || 0).toFixed(dec)}`;
  return `${(coord.x || 0).toFixed(dec)} ${(coord.y || 0).toFixed(dec)} ${(coord.z || 0).toFixed(dec)} ${(bore || 0).toFixed(dec)}`;
}
