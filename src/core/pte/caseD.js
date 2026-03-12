/**
 * PTE CASE D: Orphan Sweep (Two-pass & Pure)
 * Implementation of PCF-PTE-002 §8 & §9
 */

import { vec } from '../../utils/math';

export function twoPassOrphanSweep(allRows, config, log) {
  // Pass 1: Line_Key matched
  const lineGroups = {};
  for (const row of allRows) {
    const line = row.Line_Key || "UNKNOWN";
    if (!lineGroups[line]) lineGroups[line] = [];
    lineGroups[line].push(row);
  }

  const orderedChains = {};
  let allOrphans = [];

  for (const [lineKey, points] of Object.entries(lineGroups)) {
    const { sorted, orphans } = orphanSweep(points, lineKey, config);
    orderedChains[lineKey] = sorted;
    allOrphans.push(...orphans);
  }

  // Pass 2: No Line_Key constraint for remaining orphans
  if (allOrphans.length > 0) {
    for (const orphan of allOrphans) {
      let bestChain = null;
      let bestPosition = null;
      let minDist = Infinity;

      for (const [lineKey, chain] of Object.entries(orderedChains)) {
        for (let i = 0; i < chain.length; i++) {
          if (!chain[i].coord || !orphan.coord) continue;
          const d = vec.dist(orphan.coord, chain[i].coord);
          if (d < minDist) {
            minDist = d;
            bestChain = lineKey;
            bestPosition = i;
          }
        }
      }

      if (minDist < (config.pte.sweep?.stage6 || 13000)) {
        // Insert orphan
        orderedChains[bestChain].splice(bestPosition, 0, orphan);
      }
    }
  }

  return { orderedChains };
}

export function pureOrphanSweep(allRows, config, log) {
  // Pure topology sweep
  const terminals = findChainTerminals(allRows);
  const chains = [];
  let remaining = new Set(allRows);

  for (const terminal of terminals) {
    if (!remaining.has(terminal)) continue;

    const { sorted, orphans } = orphanSweep(Array.from(remaining), null, config, terminal);

    if (sorted.length >= 2) {
      chains.push(sorted);
      for (const p of sorted) remaining.delete(p);
    }
  }

  return { pureChains: chains, remainingOrphans: Array.from(remaining) };
}

function orphanSweep(points, lineKey, config, startTerminal = null) {
  if (!points || points.length === 0) return { sorted: [], orphans: [] };

  const origin = startTerminal || findChainTerminal(points);
  if (!origin) return { sorted: points, orphans: [] };

  const ordered = [origin];
  const remaining = new Set(points);
  remaining.delete(origin);

  let current = origin;
  let travelAxis = null;
  let travelDirection = null;

  while (remaining.size > 0) {
    const neighbor = sweepForNeighbor(current, Array.from(remaining), travelAxis, travelDirection, lineKey, config);

    if (!neighbor) break;

    if (current.coord && neighbor.coord) {
      const newVec = vec.sub(neighbor.coord, current.coord);
      const { axis, dir } = dominantAxisAndDirection(newVec);
      travelAxis = axis;
      travelDirection = dir;
    }

    ordered.push(neighbor);
    remaining.delete(neighbor);
    current = neighbor;
  }

  return { sorted: ordered, orphans: Array.from(remaining) };
}

function sweepForNeighbor(current, candidates, travelAxis, travelDir, lineKey, config) {
  const NB = current.bore || 350;
  const filtered = lineKey ? candidates.filter(c => c.Line_Key === lineKey) : candidates;

  const stages = [
    { radius: 0.2 * NB },
    { radius: 1.0 * NB },
    { radius: 5.0 * NB },
    { radius: 10.0 * NB },
    { radius: 20.0 * NB },
    { radius: 7000 },
    { radius: 13000 }
  ];

  for (const stage of stages) {
    const results = [];

    for (const cand of filtered) {
      if (!current.coord || !cand.coord) continue;
      const d = vec.dist(current.coord, cand.coord);
      if (d < stage.radius && d > 0.01) {

        const delta = vec.sub(cand.coord, current.coord);
        const { axis, dir } = dominantAxisAndDirection(delta);

        let axisPenalty = 0;
        if (travelAxis) {
          if (axis === travelAxis && dir === travelDir) axisPenalty = 0;
          else if (axis === travelAxis && dir !== travelDir) axisPenalty = 5000;
          else axisPenalty = 1000;
        }

        const score = d + axisPenalty;
        results.push({ candidate: cand, score });
      }
    }

    if (results.length > 0) {
      results.sort((a, b) => a.score - b.score);
      return results[0].candidate;
    }
  }

  return null;
}

function findChainTerminal(points) {
  let best = null;
  let minNeighbors = Infinity;

  for (const p of points) {
    if (!p.coord) continue;
    const NB = p.bore || 350;

    let neighbors = 0;
    for (const other of points) {
      if (p === other || !other.coord) continue;
      if (vec.dist(p.coord, other.coord) < 10 * NB) neighbors++;
    }

    let typeBonus = 0;
    const rtype = (p.Real_Type || p.Type || "").toUpperCase();
    if (rtype === "BRAN" || rtype === "FLAN" || rtype === "FLANGE") typeBonus = -5;

    const score = neighbors + typeBonus;
    if (score < minNeighbors) {
      minNeighbors = score;
      best = p;
    }
  }
  return best;
}

function findChainTerminals(points) {
  const terminals = [];
  for (const p of points) {
    const rtype = (p.Real_Type || p.Type || "").toUpperCase();
    if (rtype === "BRAN" || rtype === "FLAN" || rtype === "FLANGE") {
      terminals.push(p);
    }
  }
  if (terminals.length === 0) {
     const best = findChainTerminal(points);
     if (best) terminals.push(best);
  }
  return terminals;
}

function dominantAxisAndDirection(v) {
  if (!v || vec.isZero(v)) return { axis: null, dir: null };
  const ax = Math.abs(v.x);
  const ay = Math.abs(v.y);
  const az = Math.abs(v.z);

  if (ax >= ay && ax >= az) return { axis: "X", dir: v.x > 0 ? 1 : -1 };
  if (ay >= ax && ay >= az) return { axis: "Y", dir: v.y > 0 ? 1 : -1 };
  return { axis: "Z", dir: v.z > 0 ? 1 : -1 };
}
