/**
 * PTE CASE D: Orphan Sweep (Two-pass & Pure)
 * Implementation of PCF-PTE-002 §8 & §9
 */

import { vec } from '../../utils/math';

export function twoPassOrphanSweep(allRows, config, log = []) {
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
    const { sorted, orphans } = orphanSweep(points, lineKey, config, null, log);
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

export function pureOrphanSweep(allRows, config, log = []) {
  // Pure topology sweep
  log.push({ type: "Warning", stage: 1, message: "Non-sequential data without Line_Key. Topology-only reconstruction. Higher risk of cross-line errors." });

  const terminals = findChainTerminals(allRows);
  const chains = [];
  let remaining = new Set(allRows);

  for (const terminal of terminals) {
    if (!remaining.has(terminal)) continue;

    const { sorted } = orphanSweep(Array.from(remaining), null, config, terminal, log);

    if (sorted.length >= 2) {
      chains.push(sorted);
      for (const p of sorted) remaining.delete(p);
    }
  }

  // Step 3 (R-PTE-53): Handle remaining orphans by attempting sub-chains (Islands)
  let safetyLimit = 50;
  while (remaining.size > 0 && safetyLimit > 0) {
      safetyLimit--;
      const seedArray = Array.from(remaining);
      const seed = seedArray[0];
      const { sorted: subChain } = orphanSweep(seedArray, null, config, seed, log);

      if (subChain.length > 1) {
          chains.push(subChain);
          for (const p of subChain) remaining.delete(p);
      } else {
          // Keep it to avoid data loss
          chains.push([seed]);
          remaining.delete(seed);
      }
  }

  // PureSweep needs to return an object structurally identical to twoPassOrphanSweep
  // so `assembleElements` downstream can parse it cleanly.
  const orderedChains = {};
  chains.forEach((chain, i) => {
     orderedChains[`GLOBAL_${i}`] = chain;
  });

  return orderedChains;
}

function orphanSweep(points, lineKey, config, startTerminal = null, log = []) {
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
    const neighbor = sweepForNeighbor(current, Array.from(remaining), travelAxis, travelDirection, lineKey, config, log);

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

function sweepForNeighbor(current, candidates, travelAxis, travelDir, lineKey, config, log = []) {
  const NB = current.bore || 350;
  const filtered = lineKey ? candidates.filter(c => c.Line_Key === lineKey) : candidates;

  const stages = [
    { radius: 0.2 * NB, label: "micro (tolerance)" },
    { radius: 1.0 * NB, label: "adjacent fitting" },
    { radius: 5.0 * NB, label: "nearby" },
    { radius: 10.0 * NB, label: "normal pipe span" },
    { radius: 20.0 * NB, label: "long pipe span" },
    { radius: 7000, label: "very long span" },
    { radius: 13000, label: "maximum span" }
  ];

  // Pull score multipliers from config per PTE-002 Sec 12, with safe fallbacks
  const scores = config?.pte?.scoring || {
    sameAxisBonus: 0.3,
    foldbackPenalty: 5.0,
    axisChangePenalty: 1.5,
    singleAxisBonus: 0.5,
    twoAxisBonus: 0.9,
    diagonalPenalty: 2.0,
    boreMatchBonus: 0.9
  };

  for (const stage of stages) {
    const results = [];

    for (const cand of filtered) {
      if (!current.coord || !cand.coord) continue;
      const d = vec.dist(current.coord, cand.coord);
      if (d < stage.radius && d > 0.01) {

        const delta = vec.sub(cand.coord, current.coord);
        const { axis, dir } = dominantAxisAndDirection(delta);

        let score = d;

        // Axis alignment bonuses/penalties from PCF-PTE-002 §10
        if (travelAxis) {
          if (axis === travelAxis && dir === travelDir) {
            score *= scores.sameAxisBonus;
          } else if (axis === travelAxis && dir !== travelDir) {
            score *= scores.foldbackPenalty;
          } else {
            score *= scores.axisChangePenalty;
          }
        }

        // Single-axis preference
        const nonZeroAxes = countNonZeroAxes(delta, 0.5);
        if (nonZeroAxes === 1) {
            score *= scores.singleAxisBonus;
        } else if (nonZeroAxes === 2) {
            score *= scores.twoAxisBonus;
        } else if (nonZeroAxes >= 3) {
            score *= scores.diagonalPenalty;
        }

        // Bore consistency check
        if (cand.bore && current.bore && Number(cand.bore) === Number(current.bore)) {
            score *= scores.boreMatchBonus;
        }

        results.push({ candidate: cand, score, axis, dir, distance: d });
      }
    }

    if (results.length > 0) {
      results.sort((a, b) => a.score - b.score);

      const best = results[0];

      // Ambuguity Check per R-PTE-54
      const closeMatches = results.filter(r => r.score < best.score * 1.1);
      if (closeMatches.length > 1) {
          log.push({ type: "Warning", stage: 1, message: `Sweep Ambiguity: Multiple candidates within 10% score margin for origin ${current.Type || 'Unknown'} at Stage [${stage.label}].` });
      }

      if (stage.radius > 5.0 * NB) {
          log.push({ type: "Trace", stage: 1, message: `Orphan Sweep escalated to [${stage.label}] (Radius: ${stage.radius.toFixed(1)}mm) to find neighbor.` });
      }

      log.push({ type: "Info", stage: 1, message: `Attached orphan ${best.candidate.Type || 'Unknown'} to sequence. Dist: ${best.distance.toFixed(1)}mm. Score: ${best.score.toFixed(2)}.` });

      return best.candidate;
    }
  }

  return null;
}

function countNonZeroAxes(v, threshold = 0.5) {
    if (!v) return 0;
    let count = 0;
    if (Math.abs(v.x) > threshold) count++;
    if (Math.abs(v.y) > threshold) count++;
    if (Math.abs(v.z) > threshold) count++;
    return count;
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
