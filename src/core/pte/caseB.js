/**
 * PTE CASE B: Derive Points with/without Line_Key
 * Implementation of PCF-PTE-002 §3 & §4
 */

export function deriveWithLineKey(rows, config) {
  const refCounter = {};
  let currentLine = null;
  const result = [...rows];

  for (let i = 0; i < result.length; i++) {
    const curr = result[i];
    const next = i + 1 < result.length ? result[i + 1] : null;
    const prev = i > 0 ? result[i - 1] : null;

    // Ensure Real_Type exists for Case B
    const rtype = (curr.Real_Type || curr.Type || "UNKNOWN").toUpperCase();
    curr.Real_Type = rtype;

    const line = curr.Line_Key || "UNKNOWN";

    if (line !== currentLine) {
      currentLine = line;
    }

    // BRAN
    if (rtype === "BRAN") {
      curr.RefNo = generateRef("BRAN", line, refCounter, true);
      curr.Point = 1; // Default
      curr.PPoint = 1;
      curr.Type = "BRAN";
      continue;
    }

    // ANCI/SUPPORT
    if (["ANCI", "RSTR", "SUPPORT"].includes(rtype)) {
      curr.RefNo = generateRef("ANCI", line, refCounter, true);
      curr.Point = 0;
      curr.PPoint = 0;
      curr.Type = "SUPPORT";
      continue;
    }

    // OLET / TEE / ELBO handled specifically in builder
    // For now, give them generic 1 points to satisfy pipeline
    const ref = generateRef(rtype, line, refCounter, true);
    curr.RefNo = ref;
    curr.Point = 1;
    curr.Type = rtype;
    curr.PPoint = determinePPointEntry(curr, prev, rtype);

    if (next) {
      curr._ep2_coord = next.coord;
      curr._ep2_ppoint = determinePPointExit(curr, next, rtype);
    }
  }

  return result;
}

export function deriveWithoutLineKey(rows, config) {
  const refCounter = {};
  const result = [...rows];

  for (let i = 0; i < result.length; i++) {
    const curr = result[i];
    const next = i + 1 < result.length ? result[i + 1] : null;
    const prev = i > 0 ? result[i - 1] : null;

    const rtype = (curr.Real_Type || curr.Type || "UNKNOWN").toUpperCase();
    curr.Real_Type = rtype;

    if (rtype === "BRAN") {
      curr.RefNo = generateRef("BRAN", null, refCounter, false);
      curr.Point = 1;
      curr.PPoint = 1;
      curr.Type = "BRAN";
      continue;
    }

    if (["ANCI", "RSTR", "SUPPORT"].includes(rtype)) {
      curr.RefNo = generateRef("ANCI", null, refCounter, false);
      curr.Point = 0;
      curr.PPoint = 0;
      curr.Type = "SUPPORT";
      continue;
    }

    const ref = generateRef(rtype, null, refCounter, false);
    curr.RefNo = ref;
    curr.Point = 1;
    curr.Type = rtype;
    curr.PPoint = determinePPointEntry(curr, prev, rtype);

    if (next) {
      curr._ep2_coord = next.coord;
      curr._ep2_ppoint = determinePPointExit(curr, next, rtype);
    }
  }

  return result;
}

function generateRef(typeCode, lineKey, counter, useLineKey) {
  const key = useLineKey ? `${lineKey}_${typeCode}` : typeCode;
  counter[key] = (counter[key] || 0) + 1;
  const num = counter[key].toString().padStart(4, '0');
  return useLineKey ? `=${lineKey}/${typeCode}_${num}` : `=${typeCode}_${num}`;
}

function determinePPointEntry(curr, prev, rtype) {
  if (!prev) return 1;

  const prevType = (prev.Real_Type || prev.Type || "").toUpperCase();

  if (rtype === "FLAN" || rtype === "FLANGE") {
    if ((prevType === "FLAN" || prevType === "FLANGE") && prev.Line_Key === curr.Line_Key) {
      return 2;
    }
  }
  return 1;
}

function determinePPointExit(curr, next, rtype) {
  if (curr.PPoint === 2) return 1;
  return 2;
}
