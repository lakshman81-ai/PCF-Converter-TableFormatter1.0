/**
 * REGION C: CHAIN WALKER
 */
import { vec } from '../../utils/math';
import { runElementRules, runSupportRules, runAggregateRules } from './rules';
import { analyzeGap } from './gapAnalyzer';
import { detectElementAxis, detectBranchAxis, detectBranchDirection, getElementVector } from './axisDetector';
import { getEntryPoint, getExitPoint } from './graphBuilder';
import { logRuleExecution } from '../ruleRegistry';

import { detectDuplicates, applyRSPA02, detectOrphans, checkRBRN05 } from './rules';

export function walkAllChains(graph, config, log) {
  const visited = new Set();
  const allChains = [];

  // R-TOP-03: Duplicate Element Detection (pre-walk cleanup)
  detectDuplicates(graph.components, config, log);

  for (const terminal of graph.terminals) {
    if (visited.has(terminal._rowIndex)) continue;
    const context = createInitialContext(terminal, allChains.length);
    const chain = walkChain(terminal, graph, context, visited, config, log);
    if (chain.length > 0) allChains.push(chain);
  }

  // R-TOP-02: Check for chains of length 1 that represent completely disconnected orphan elements
  // We also check for completely unvisited elements (which would be orphans too)
  const unvisitedOrphans = detectOrphans(graph.components, visited, log);

  // A terminal that forms a 1-element chain and is disconnected from everything else is also an orphan
  const chainedOrphans = [];
  for (const chain of allChains) {
    if (chain.length === 1) {
        const orphan = chain[0].element;
        if ((orphan.type || "").toUpperCase() !== "SUPPORT") {
            logRuleExecution("R-TOP-02", orphan._rowIndex);
            log.push({ type: "Error", ruleId: "R-TOP-02", tier: 4, row: orphan._rowIndex,
              message: `ERROR [R-TOP-02 T4]: ${orphan.type} (Row ${orphan._rowIndex}) is orphaned — isolated single-element chain.` });
            chainedOrphans.push(orphan);
        }
    }
  }

  // Post-walk coordinate cleanup
  applyRSPA02(allChains, config, log);

  return { chains: allChains, orphans: [...unvisitedOrphans, ...chainedOrphans] };
}

function createInitialContext(startElement, chainIndex) {
  return {
    travelAxis: null,
    travelDirection: null,
    currentBore: startElement.bore || 0,
    currentMaterial: startElement.ca?.[3] || "",
    currentPressure: startElement.ca?.[1] || "",
    currentTemp: startElement.ca?.[2] || "",
    chainId: `Chain-${chainIndex + 1}`,
    cumulativeVector: { x: 0, y: 0, z: 0 },
    pipeLengthSum: 0,
    lastFittingType: null,
    elevation: startElement.ep1?.z || 0,
    depth: 0,
    pipeSinceLastBend: Infinity,
  };
}

function walkChain(startElement, graph, context, visited, config, log) {
  const chain = [];
  let current = startElement;
  let prevElement = null;

  while (current && !visited.has(current._rowIndex)) {
    visited.add(current._rowIndex);
    const type = (current.type || "").toUpperCase();

    if (type === "SUPPORT") {
      runSupportRules(current, chain, context, config, log);
      current = graph.edges.get(current._rowIndex) || null;
      continue;
    }

    const [elemAxis, elemDir] = detectElementAxis(current, config);
    runElementRules(current, context, prevElement, elemAxis, elemDir, config, log);

    if (elemAxis) {
      context.travelAxis = elemAxis;
      context.travelDirection = elemDir;
    }
    if (current.bore) context.currentBore = current.bore;
    if (current.ca?.[3]) context.currentMaterial = current.ca[3];
    const elemVec = getElementVector(current);
    context.cumulativeVector = vec.add(context.cumulativeVector, elemVec);

    if (type === "PIPE") {
      const len = vec.mag(elemVec);
      context.pipeLengthSum += len;
      context.pipeSinceLastBend += len;
    }
    if (type === "BEND") context.pipeSinceLastBend = 0;
    if (!["PIPE", "SUPPORT"].includes(type)) context.lastFittingType = type;

    const nextElement = graph.edges.get(current._rowIndex) || null;
    let gapVector = null;
    let fixAction = null;

    if (nextElement) {
      const exitPt = getExitPoint(current);
      const entryPt = getEntryPoint(nextElement);
      if (exitPt && entryPt) {
        gapVector = vec.sub(entryPt, exitPt);
        fixAction = analyzeGap(gapVector, context, current, nextElement, config, log);
      }
    }

    chain.push({
      element: current,
      elemAxis,
      elemDir,
      travelAxis: context.travelAxis,
      travelDirection: context.travelDirection,
      gapToNext: gapVector,
      fixAction,
      nextElement,
      branchChain: null,
    });

    if (type === "TEE") {
      const branchStart = graph.branchEdges.get(current._rowIndex);
      if (branchStart && !visited.has(branchStart._rowIndex)) {
        const branchCtx = {
          ...structuredClone(context),
          travelAxis: detectBranchAxis(current),
          travelDirection: detectBranchDirection(current),
          currentBore: current.branchBore || current.bore,
          depth: context.depth + 1,
          chainId: `${context.chainId}.B`,
          pipeLengthSum: 0,
          cumulativeVector: { x: 0, y: 0, z: 0 },
          pipeSinceLastBend: Infinity,
        };
        const branchChain = walkChain(branchStart, graph, branchCtx, visited, config, log);
        chain[chain.length - 1].branchChain = branchChain;

        // R-BRN-05: Validate branch connection
        checkRBRN05(current, branchChain, config, log);
      }
    }

    prevElement = current;
    current = nextElement;
  }

  runAggregateRules(chain, context, config, log);
  return chain;
}
