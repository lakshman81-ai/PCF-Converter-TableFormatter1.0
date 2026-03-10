/**
 * SMART FIXER ENGINE — Main Entry
 * Implements Region I: Smart Fix Orchestrator & Integrates Regions A-H
 */

import { buildConnectivityGraph } from './graphBuilder';
import { walkAllChains } from './chainWalker';
import { populateFixingActions } from './actionDescriptor';
import { applyFixes } from './fixEngine';

export function runSmartFix(dataTable, config, log) {
  log.push({ type: "Info", message: "═══ SMART FIX: Starting chain walker ═══" });

  // Step 4A: Build connectivity graph
  log.push({ type: "Info", message: "Step 4A: Building connectivity graph..." });
  const graph = buildConnectivityGraph(dataTable, config);
  log.push({ type: "Info",
    message: `Graph: ${graph.components.length} components, ${graph.terminals.length} terminals, ${graph.edges.size} connections.` });

  // Step 4B & 4C: Walk all chains and Run Rules
  log.push({ type: "Info", message: "Step 4B: Walking element chains & Step 4C: Running 57 Rules..." });
  const { chains, orphans } = walkAllChains(graph, config, log);

  const totalElements = chains.reduce((s, c) => s + c.length, 0);
  log.push({ type: "Info",
    message: `Walked ${chains.length} chains, ${totalElements} elements, ${orphans.length} orphans.` });

  // Count findings by tier
  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const entry of log) {
    if (entry.tier) tierCounts[entry.tier] = (tierCounts[entry.tier] || 0) + 1;
  }
  log.push({ type: "Info",
    message: `Rules complete: Tier1=${tierCounts[1]}, Tier2=${tierCounts[2]}, Tier3=${tierCounts[3]}, Tier4=${tierCounts[4]}` });

  // Step 4D: Populate Fixing Action column
  log.push({ type: "Info", message: "Step 4D: Populating Fixing Action previews..." });
  const previewedTable = populateFixingActions(dataTable, chains, log);

  const actionCount = previewedTable.filter(r => r.fixingAction).length;
  log.push({ type: "Info",
    message: `═══ SMART FIX COMPLETE: ${actionCount} rows have proposed fixes. Review in Data Table. ═══` });

  const summary = {
    chainCount: chains.length,
    elementsWalked: totalElements,
    orphanCount: orphans.length,
    tier1: tierCounts[1],
    tier2: tierCounts[2],
    tier3: tierCounts[3],
    tier4: tierCounts[4],
    rowsWithActions: actionCount,
  };

  return { graph, chains, orphans, summary, previewedTable };
}

export function executeFixes(dataTable, chains, config, log) {
  log.push({ type: "Info", message: "Step 4F: Applying Tier 1 & Tier 2 fixes..." });
  return applyFixes(dataTable, chains, config, log);
}
