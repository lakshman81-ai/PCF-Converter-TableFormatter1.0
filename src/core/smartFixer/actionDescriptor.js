/**
 * REGION H: FIXING ACTION DESCRIPTOR
 */
import { vec } from '../../utils/math';

export function populateFixingActions(dataTable, chains, log) {
  const table = structuredClone(dataTable);

  for (const row of table) {
    row.fixingAction = null;
    row.fixingActionTier = null;
    row.fixingActionRuleId = null;
  }

  for (const chain of chains) {
    populateChainActions(table, chain);
  }

  // Also populate from pure logs for things without chain actions
  for (const entry of log) {
    if (entry.row && entry.tier && entry.tier <= 4) {
      const row = table.find(r => r._rowIndex === entry.row);
      if (row && !row.fixingAction) {
        row.fixingAction = entry.message;
        row.fixingActionTier = entry.tier;
        row.fixingActionRuleId = entry.ruleId;
      }
    }
  }

  return table;
}

function populateChainActions(table, chain) {
  for (const link of chain) {
    const elem = link.element;

    if (elem._proposedFix) {
      const row = table.find(r => r._rowIndex === elem._rowIndex);
      if (row) {
        row.fixingAction = formatProposedFix(elem._proposedFix, elem);
        row.fixingActionTier = elem._proposedFix.tier;
        row.fixingActionRuleId = elem._proposedFix.ruleId;
      }
    }

    if (link.fixAction) {
      const currRow = table.find(r => r._rowIndex === link.element._rowIndex);
      const nextRow = link.nextElement ? table.find(r => r._rowIndex === link.nextElement._rowIndex) : null;

      if (currRow && !currRow.fixingAction) {
        currRow.fixingAction = link.fixAction.description;
        currRow.fixingActionTier = link.fixAction.tier;
        currRow.fixingActionRuleId = link.fixAction.ruleId;
      }
      if (nextRow && !nextRow.fixingAction && link.fixAction.tier <= 3) {
        nextRow.fixingAction = `← ${link.fixAction.description.split('\n')[0]}`;
        nextRow.fixingActionTier = link.fixAction.tier;
        nextRow.fixingActionRuleId = link.fixAction.ruleId;
      }
    }

    if (link.branchChain) {
      populateChainActions(table, link.branchChain);
    }
  }
}

function formatProposedFix(fix, element) {
  const type = (element.type || "").toUpperCase();
  const ri = element._rowIndex;

  switch (fix.type) {
    case "DELETE":
      const len = element.ep1 && element.ep2 ? vec.mag(vec.sub(element.ep2, element.ep1)) : 0;
      return `DELETE [${fix.ruleId}]: Remove ${type}\n` +
             `Length: ${len.toFixed(1)}mm, Bore: ${element.bore || 0}mm`;

    case "SNAP_AXIS":
      return `SNAP [${fix.ruleId}]: Align ${type} to pure ${fix.dominantAxis}-axis\n` +
             `Row ${ri}: Off-axis components will be zeroed`;

    default:
      return `${fix.type} [${fix.ruleId}]: Row ${ri}`;
  }
}
