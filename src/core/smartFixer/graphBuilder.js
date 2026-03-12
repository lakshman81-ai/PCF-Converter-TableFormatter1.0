/**
 * REGION B: CONNECTIVITY GRAPH BUILDER
 */
import { vec } from '../../utils/math';

export function buildConnectivityGraph(dataTable, config) {
  const strategy = config.smartFixer?.chainingStrategy ?? "strict_sequential";

  if (strategy === "strict_sequential") {
    return buildSequentialGraph(dataTable, config);
  } else {
    return buildSpatialGraph(dataTable, config);
  }
}

function filterToComponents(dataTable) {
  return dataTable
    .filter(row => row.type && !["ISOGEN-FILES","UNITS-BORE","UNITS-CO-ORDS",
      "UNITS-WEIGHT","UNITS-BOLT-DIA","UNITS-BOLT-LENGTH",
      "PIPELINE-REFERENCE","MESSAGE-SQUARE"].includes(row.type.toUpperCase()))
    .map(row => ({
      ...row,
      entryPoint: getEntryPoint(row),
      exitPoint: getExitPoint(row),
      branchExitPoint: getBranchExitPoint(row),
    }));
}

function findNearestByCoord(components, targetPt, tolerance, excludeRowIndex) {
  let best = null;
  let bestDist = tolerance + 1;
  for (const comp of components) {
    if (comp._rowIndex === excludeRowIndex) continue;
    const ep = getEntryPoint(comp);
    if (!ep) continue;
    const d = vec.dist(targetPt, ep);
    if (d < bestDist) { bestDist = d; best = comp; }
  }
  return best;
}

function buildSequentialGraph(dataTable, config) {
  const tolerance = config.smartFixer?.connectionTolerance ?? 25.0;
  const reviewMax = config.smartFixer?.reviewGapMax ?? 100.0;
  const components = filterToComponents(dataTable);

  const edges = new Map();
  const branchEdges = new Map();
  const hasIncoming = new Set();

  for (let i = 0; i < components.length - 1; i++) {
    const curr = components[i];
    const next = components[i + 1];
    const type = (curr.type || "").toUpperCase();

    // Skip: SUPPORT is a point element — chain passes through it
    if (type === "SUPPORT") continue;

    const exitPt = getExitPoint(curr);
    const entryPt = getEntryPoint(next);

    if (!exitPt || !entryPt) continue;

    const gap = vec.dist(exitPt, entryPt);

    // Always link sequential elements — but log the gap
    // The previous implementation used a 5000mm cutoff but that breaks sequential chaining completely
    // We want the GapAnalyzer to handle large gaps, EXCEPT if it's an absurd jump (e.g., 20000mm)
    if (gap <= (config.smartFixer?.maxChainingGap ?? 5000)) {
      edges.set(curr._rowIndex, next);
      hasIncoming.add(next._rowIndex);
    }

    // TEE branch: look for next element whose EP1 is near BP
    if (type === "TEE" && curr.bp) {
      const branchStart = findNearestByCoord(components, curr.bp, tolerance, curr._rowIndex);
      if (branchStart) {
        branchEdges.set(curr._rowIndex, branchStart);
        hasIncoming.add(branchStart._rowIndex);
      }
    }
  }

  const terminals = components.filter(c => !hasIncoming.has(c._rowIndex) && (c.type || "").toUpperCase() !== "SUPPORT");

  return { components, edges, branchEdges, terminals, strategy: "strict_sequential" };
}

export function buildSpatialGraph(dataTable, config) {
  const tolerance = config.smartFixer?.connectionTolerance ?? 25.0;
  const gridSnap = config.smartFixer?.gridSnapResolution ?? 1.0;

  const snap = (coord) => ({
    x: Math.round(coord.x / gridSnap) * gridSnap,
    y: Math.round(coord.y / gridSnap) * gridSnap,
    z: Math.round(coord.z / gridSnap) * gridSnap,
  });
  const coordKey = (c) => `${c.x},${c.y},${c.z}`;

  const components = filterToComponents(dataTable);

  const entryIndex = new Map();
  for (const comp of components) {
    if (comp.entryPoint && !vec.isZero(comp.entryPoint)) {
      const key = coordKey(snap(comp.entryPoint));
      if (!entryIndex.has(key)) entryIndex.set(key, []);
      entryIndex.get(key).push(comp);
    }
  }

  const edges = new Map();
  const branchEdges = new Map();
  const hasIncoming = new Set();

  for (const comp of components) {
    if (!comp.exitPoint || vec.isZero(comp.exitPoint)) continue;

    const match = findNearestEntry(comp.exitPoint, entryIndex, snap, coordKey, tolerance, comp._rowIndex);
    if (match) {
      edges.set(comp._rowIndex, match);
      hasIncoming.add(match._rowIndex);
    }

    if (comp.branchExitPoint && !vec.isZero(comp.branchExitPoint)) {
      const brMatch = findNearestEntry(comp.branchExitPoint, entryIndex, snap, coordKey, tolerance, comp._rowIndex);
      if (brMatch) {
        branchEdges.set(comp._rowIndex, brMatch);
        hasIncoming.add(brMatch._rowIndex);
      }
    }
  }

  const terminals = components.filter(c =>
    !hasIncoming.has(c._rowIndex) && (c.type || "").toUpperCase() !== "SUPPORT"
  );

  return { components, edges, branchEdges, terminals, entryIndex, strategy: "spatial" };
}

export function getEntryPoint(row) {
  const t = (row.type || "").toUpperCase();
  if (t === "SUPPORT") return row.supportCoor || null;
  if (t === "OLET")    return row.cp || null;
  return row.ep1 || null;
}

export function getExitPoint(row) {
  const t = (row.type || "").toUpperCase();
  if (t === "SUPPORT") return null;
  if (t === "OLET")    return row.bp || null;
  return row.ep2 || null;
}

function getBranchExitPoint(row) {
  const t = (row.type || "").toUpperCase();
  if (t === "TEE") return row.bp || null;
  return null;
}

function findNearestEntry(exitCoord, entryIndex, snap, coordKey, tolerance, excludeRowIndex) {
  const snapped = snap(exitCoord);
  const key = coordKey(snapped);

  const candidates = entryIndex.get(key) || [];
  let best = null;
  let bestDist = tolerance + 1;

  for (const cand of candidates) {
    if (cand._rowIndex === excludeRowIndex) continue;
    const d = vec.dist(exitCoord, cand.entryPoint);
    if (d < bestDist) { bestDist = d; best = cand; }
  }

  if (!best) {
    const step = snap({ x: 1, y: 1, z: 1 }).x;
    for (let dx = -step; dx <= step; dx += step) {
      for (let dy = -step; dy <= step; dy += step) {
        for (let dz = -step; dz <= step; dz += step) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          const nk = coordKey({ x: snapped.x + dx, y: snapped.y + dy, z: snapped.z + dz });
          for (const cand of (entryIndex.get(nk) || [])) {
            if (cand._rowIndex === excludeRowIndex) continue;
            const d = vec.dist(exitCoord, cand.entryPoint);
            if (d < bestDist) { bestDist = d; best = cand; }
          }
        }
      }
    }
  }
  return best;
}
