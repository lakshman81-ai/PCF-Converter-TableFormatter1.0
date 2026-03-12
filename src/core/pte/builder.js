/**
 * Assembles grouped PTE rows into components
 */

function parseCoord(row) {
  if (!row) return null;
  const x = parseFloat(row.East !== undefined ? row.East : row.X);
  const y = parseFloat(row.North !== undefined ? row.North : row.Y);
  const z = parseFloat(row.Up !== undefined ? row.Up : row.Z);
  if (isNaN(x) || isNaN(y) || isNaN(z)) return null;
  return { x, y, z };
}

function parseBore(val) {
  if (!val) return null;
  const s = val.toString().toLowerCase();
  if (s.endsWith('mm')) return parseFloat(s.replace('mm', ''));
  if (s.endsWith('in')) return parseFloat(s.replace('in', '')) * 25.4;
  if (s.endsWith('"')) return parseFloat(s.replace('"', '')) * 25.4;
  return parseFloat(s);
}

export function assembleElements(groupedRows) {
  const result = [];

  for (const [refKey, rows] of Object.entries(groupedRows)) {
    const type = (rows[0].Real_Type || rows[0].Type || "UNKNOWN").toUpperCase();

    // Sort by Point to reliably extract 0, 1, 2, 3
    // But realistically we just find them
    const p1 = rows.find(r => r.Point == 1);
    const p2 = rows.find(r => r.Point == 2);
    const p0 = rows.find(r => r.Point == 0);
    const p3 = rows.find(r => r.Point == 3);

    const elem = {
      type: type === "PCOM" ? "PIPE" : type,
      refNo: refKey,
      skey: "",
      ep1: null,
      ep2: null,
      cp: null,
      bp: null,
      bore: 0,
      branchBore: null,
    };

    if (p1) {
      elem.ep1 = parseCoord(p1);
      elem.bore = parseBore(p1.Bore) || 0;
      if (p1.Skey) elem.skey = p1.Skey;
    }
    if (p2) {
      elem.ep2 = parseCoord(p2);
      if (!elem.bore) elem.bore = parseBore(p2.Bore) || 0;
    }

    if (type === "TEE" || type === "OLET" || type === "BEND" || type === "ELBO") {
      if (p0) elem.cp = parseCoord(p0);
      if (p3) {
        elem.bp = parseCoord(p3);
        elem.branchBore = parseBore(p3.Bore);
      }
    } else if (type === "SUPPORT" || type === "ANCI" || type === "RSTR") {
      elem.type = "SUPPORT";
      if (p0) elem.supportCoor = parseCoord(p0);
      else if (p1) elem.supportCoor = parseCoord(p1);
      elem.supportName = rows[0].NodeName || "";
      elem.supportGuid = rows[0].NodeNo ? `UCI:${rows[0].NodeNo}` : "";
    }

    result.push(elem);
  }

  return result;
}
