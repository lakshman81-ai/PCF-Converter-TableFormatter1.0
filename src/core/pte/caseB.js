/**
 * PTE CASE B: Derive Points with/without Line_Key
 * Implementation of PCF-PTE-002 §3 & §4
 */

export function deriveWithLineKey(rows) {
  const refCounter = {};
  let currentLine = null;
  const result = [...rows];
  const finalResult = [];

  for (let i = 0; i < result.length; i++) {
    const curr = result[i];
    const next = i + 1 < result.length ? result[i + 1] : null;
    const prev = i > 0 ? result[i - 1] : null;
    const prevPrev = i > 1 ? result[i - 2] : null;

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
      finalResult.push(curr);
      continue;
    }

    // ANCI/SUPPORT
    if (["ANCI", "RSTR", "SUPPORT"].includes(rtype)) {
      curr.RefNo = generateRef("ANCI", line, refCounter, true);
      curr.Point = 0;
      curr.PPoint = 0;
      curr.Type = "SUPPORT";
      finalResult.push(curr);

      // Spec R-PTE-35: Implicit Pipe Generation
      if (next && !["ANCI", "RSTR", "SUPPORT", "BRAN"].includes((next.Real_Type || next.Type || "UNKNOWN").toUpperCase())) {
         const implicitPipe = {
             Type: "PIPE",
             Real_Type: "PIPE",
             coord: curr.coord,
             bore: curr.bore,
             Line_Key: curr.Line_Key,
             RefNo: generateRef("PIPE", line, refCounter, true),
             Point: 1,
             PPoint: 1,
             _ep2_coord: next.coord,
             _ep2_ppoint: 2,
             _logTags: ["Implicit"]
         };
         finalResult.push(implicitPipe);
      }
      continue;
    }

    const ref = generateRef(rtype, line, refCounter, true);
    curr.RefNo = ref;
    curr.Point = 1;
    curr.Type = rtype;
    curr.PPoint = determinePPointEntry(curr, prev, prevPrev, rtype);

    // Spec R-PTE-36 and R-PTE-37: Generic Handling for Complex Components
    if (rtype === "TEE" || rtype === "OLET" || rtype === "ELBO" || rtype === "BEND") {
        if (rtype === "OLET") {
           // OLET is zero length header definition
           curr._ep2_coord = curr.coord;
           curr._ep2_ppoint = 2;
        } else {
           if (next) {
               curr._ep2_coord = next.coord;
               curr._ep2_ppoint = determinePPointExit(curr);
           }
        }

        // Ensure they flag as needing CP/BP calculated downstream or assign now
        // Downstream `builder.js` and `basicFixer.js` recalculate these automatically if omitted but structurally expected
    } else {
        if (next) {
          curr._ep2_coord = next.coord;
          curr._ep2_ppoint = determinePPointExit(curr);
        }
    }

    finalResult.push(curr);

    if (rtype === "OLET" && next) {
         // Implicit pipe generation after OLET to connect it to the next component in the run
         const implicitPipe = {
             Type: "PIPE",
             Real_Type: "PIPE",
             coord: curr.coord,
             bore: curr.bore,
             Line_Key: curr.Line_Key,
             RefNo: generateRef("PIPE", line, refCounter, true),
             Point: 1,
             PPoint: 1,
             _ep2_coord: next.coord,
             _ep2_ppoint: 2,
             _logTags: ["Implicit"]
         };
         finalResult.push(implicitPipe);
    }
  }

  return finalResult;
}

export function deriveWithoutLineKey(rows) {
  const refCounter = {};
  const result = [...rows];
  const finalResult = [];

  for (let i = 0; i < result.length; i++) {
    const curr = result[i];
    const next = i + 1 < result.length ? result[i + 1] : null;
    const prev = i > 0 ? result[i - 1] : null;
    const prevPrev = i > 1 ? result[i - 2] : null;

    const rtype = (curr.Real_Type || curr.Type || "UNKNOWN").toUpperCase();
    curr.Real_Type = rtype;

    if (rtype === "BRAN") {
      curr.RefNo = generateRef("BRAN", null, refCounter, false);
      curr.Point = 1;
      curr.PPoint = 1;
      curr.Type = "BRAN";
      finalResult.push(curr);
      continue;
    }

    if (["ANCI", "RSTR", "SUPPORT"].includes(rtype)) {
      curr.RefNo = generateRef("ANCI", null, refCounter, false);
      curr.Point = 0;
      curr.PPoint = 0;
      curr.Type = "SUPPORT";
      finalResult.push(curr);

      // Implicit pipe Generation
      if (next && !["ANCI", "RSTR", "SUPPORT", "BRAN"].includes((next.Real_Type || next.Type || "UNKNOWN").toUpperCase())) {
         const implicitPipe = {
             Type: "PIPE",
             Real_Type: "PIPE",
             coord: curr.coord,
             bore: curr.bore,
             RefNo: generateRef("PIPE", null, refCounter, false),
             Point: 1,
             PPoint: 1,
             _ep2_coord: next.coord,
             _ep2_ppoint: 2,
             _logTags: ["Implicit"]
         };
         finalResult.push(implicitPipe);
      }
      continue;
    }

    const ref = generateRef(rtype, null, refCounter, false);
    curr.RefNo = ref;
    curr.Point = 1;
    curr.Type = rtype;
    curr.PPoint = determinePPointEntry(curr, prev, prevPrev, rtype);

    if (rtype === "TEE" || rtype === "OLET" || rtype === "ELBO" || rtype === "BEND") {
        if (rtype === "OLET") {
           curr._ep2_coord = curr.coord;
           curr._ep2_ppoint = 2;
        } else {
           if (next) {
               curr._ep2_coord = next.coord;
               curr._ep2_ppoint = determinePPointExit(curr);
           }
        }
    } else {
        if (next) {
          curr._ep2_coord = next.coord;
          curr._ep2_ppoint = determinePPointExit(curr);
        }
    }

    finalResult.push(curr);

    if (rtype === "OLET" && next) {
         const implicitPipe = {
             Type: "PIPE",
             Real_Type: "PIPE",
             coord: curr.coord,
             bore: curr.bore,
             RefNo: generateRef("PIPE", null, refCounter, false),
             Point: 1,
             PPoint: 1,
             _ep2_coord: next.coord,
             _ep2_ppoint: 2,
             _logTags: ["Implicit"]
         };
         finalResult.push(implicitPipe);
    }
  }

  return finalResult;
}

function generateRef(typeCode, lineKey, counter, useLineKey) {
  const key = useLineKey ? `${lineKey}_${typeCode}` : typeCode;
  counter[key] = (counter[key] || 0) + 1;
  const num = counter[key].toString().padStart(4, '0');
  return useLineKey ? `=${lineKey}/${typeCode}_${num}` : `=${typeCode}_${num}`;
}

function determinePPointEntry(curr, prev, prevPrev, rtype) {
  if (!prev) return 1;

  const prevType = (prev.Real_Type || prev.Type || "").toUpperCase();

  if (rtype === "FLAN" || rtype === "FLANGE") {
    if ((prevType === "FLAN" || prevType === "FLANGE") && prev.Line_Key === curr.Line_Key) {
      return 2;
    }
    // Gasket checking as per PCF-PTE-002 §3.2
    if (prevType === "GASK") {
      const ppType = prevPrev ? (prevPrev.Real_Type || prevPrev.Type || "").toUpperCase() : "";
      if (ppType === "FLAN" || ppType === "FLANGE" || ppType === "VALV" || ppType === "VALVE") {
          return 2;
      }
    }
  }

  if (rtype === "VALV" || rtype === "VALVE") {
      if (prevType === "GASK") {
          return 2; // Flanged valve, inverted orientation
      }
      if (prevType === "FLAN" || prevType === "FLANGE") {
          return 2;
      }
  }

  return 1;
}

function determinePPointExit(curr) {
  if (curr.PPoint === 2) return 1;
  return 2;
}
