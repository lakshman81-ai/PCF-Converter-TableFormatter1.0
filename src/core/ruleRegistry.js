/**
 * RULE REGISTRY — Every rule must be here
 * Implementation of PART 11 of WI-PCF-002 Rev.0
 */

export const RULE_REGISTRY = {
  // ─── Validation Rules (V1–V20) ───
  "V1":  { name: "No (0,0,0) coordinates",        severity: "ERROR",   implemented: false },
  "V2":  { name: "Decimal consistency",            severity: "ERROR",   implemented: false },
  "V3":  { name: "Bore consistency",               severity: "ERROR",   implemented: false },
  "V4":  { name: "BEND CP ≠ EP1",                  severity: "ERROR",   implemented: false },
  "V5":  { name: "BEND CP ≠ EP2",                  severity: "ERROR",   implemented: false },
  "V6":  { name: "BEND CP not collinear",          severity: "ERROR",   implemented: false },
  "V7":  { name: "BEND CP equidistant",            severity: "WARNING", implemented: false },
  "V8":  { name: "TEE CP = midpoint",              severity: "ERROR",   implemented: false },
  "V9":  { name: "TEE CP bore = EP bore",          severity: "ERROR",   implemented: false },
  "V10": { name: "TEE BP perpendicular",           severity: "WARNING", implemented: false },
  "V11": { name: "OLET no END-POINTs",             severity: "ERROR",   implemented: false },
  "V12": { name: "SUPPORT no CAs",                 severity: "ERROR",   implemented: false },
  "V13": { name: "SUPPORT bore = 0",               severity: "ERROR",   implemented: false },
  "V14": { name: "<SKEY> presence",                 severity: "WARNING", implemented: false },
  "V15": { name: "Coordinate continuity",           severity: "WARNING", implemented: false },
  "V16": { name: "CA8 scope",                       severity: "WARNING", implemented: false },
  "V17": { name: "CRLF line endings",               severity: "ERROR",   implemented: false },
  "V18": { name: "Bore unit detection",              severity: "WARNING", implemented: false },
  "V19": { name: "SUPPORT MESSAGE-SQUARE",           severity: "WARNING", implemented: false },
  "V20": { name: "GUID prefix UCI:",                 severity: "ERROR",   implemented: false },

  // ─── Smart Fixer Rules (R-GEO through R-AGG) ───
  "R-GEO-01": { name: "Micro-element deletion",     tier: "1/4", implemented: false },
  "R-GEO-02": { name: "Bore continuity",            tier: "4",   implemented: false },
  "R-GEO-03": { name: "Single-axis element rule",   tier: "2/4", implemented: false },
  "R-GEO-04": { name: "Fitting dimension sanity",   tier: "3",   implemented: false },
  "R-GEO-05": { name: "Bend radius sanity",         tier: "3",   implemented: false },
  "R-GEO-06": { name: "Valve face-to-face",         tier: "3",   implemented: false },
  "R-GEO-07": { name: "Zero-length element",        tier: "4",   implemented: false },
  "R-GEO-08": { name: "Coordinate magnitude",       tier: "3/4", implemented: false },
  "R-TOP-01": { name: "Dead-end detection",          tier: "3",   implemented: false },
  "R-TOP-02": { name: "Orphan element detection",    tier: "4",   implemented: false },
  "R-TOP-03": { name: "Duplicate element detection",  tier: "4",   implemented: false },
  "R-TOP-04": { name: "Flange pair check",           tier: "3",   implemented: false },
  "R-TOP-05": { name: "Valve flange sandwich",       tier: "3",   implemented: false },
  "R-TOP-06": { name: "Support on-pipe validation",  tier: "4",   implemented: false },
  "R-TOP-07": { name: "Tee CP on header segment",    tier: "4",   implemented: false },
  "R-CHN-01": { name: "Axis change without bend",    tier: "4",   implemented: false },
  "R-CHN-02": { name: "Fold-back detection",         tier: "2/4", implemented: false },
  "R-CHN-03": { name: "Elbow-elbow proximity",       tier: "3",   implemented: false },
  "R-CHN-04": { name: "Sequence number ordering",    tier: "info", implemented: false },
  "R-CHN-05": { name: "Elevation drift",             tier: "2/3", implemented: false },
  "R-CHN-06": { name: "Shared-axis snapping",        tier: "1/2/4", implemented: false },
  "R-GAP-01": { name: "Negligible gap (<1mm)",       tier: "1",   implemented: false },
  "R-GAP-02": { name: "Axial gap ≤25mm",             tier: "2",   implemented: false },
  "R-GAP-03": { name: "Axial gap >25mm",             tier: "3/4", implemented: false },
  "R-GAP-04": { name: "Lateral gap",                 tier: "2/4", implemented: false },
  "R-GAP-05": { name: "Multi-axis negligible lat",   tier: "2",   implemented: false },
  "R-GAP-06": { name: "Multi-axis significant",      tier: "4",   implemented: false },
  "R-GAP-07": { name: "Gap at tee junction",         tier: "2",   implemented: false },
  "R-GAP-08": { name: "Only pipes fill gaps",        tier: "rule", implemented: false },
  "R-OVR-01": { name: "Simple axial overlap pipe",   tier: "2/3", implemented: false },
  "R-OVR-02": { name: "Overlap rigid current",       tier: "2/4", implemented: false },
  "R-OVR-03": { name: "Rigid-on-rigid overlap",      tier: "4",   implemented: false },
  "R-OVR-04": { name: "Enveloping overlap",          tier: "4",   implemented: false },
  "R-OVR-05": { name: "Overlap at tee boundary",     tier: "2/3", implemented: false },
  "R-OVR-06": { name: "Overlap negative pipe",       tier: "2",   implemented: false },
  "R-BRN-01": { name: "Branch bore > header bore",   tier: "4",   implemented: false },
  "R-BRN-02": { name: "Olet size ratio",             tier: "3/4", implemented: false },
  "R-BRN-03": { name: "Branch same axis as header",  tier: "4",   implemented: false },
  "R-BRN-04": { name: "Branch perpendicularity",     tier: "3/4", implemented: false },
  "R-BRN-05": { name: "Branch chain continuation",   tier: "4",   implemented: false },
  "R-SPA-01": { name: "Elevation consistency",        tier: "2/3", implemented: false },
  "R-SPA-02": { name: "Shared-axis coord snap",      tier: "1/2/4", implemented: false },
  "R-SPA-03": { name: "Gravity-aware support",       tier: "3",   implemented: false },
  "R-SPA-04": { name: "Collinear pipe merge",        tier: "info", implemented: false },
  "R-SPA-05": { name: "Suspicious placeholder",      tier: "3",   implemented: false },
  "R-DAT-01": { name: "Precision consistency",        tier: "3",   implemented: false },
  "R-DAT-02": { name: "Suspicious round numbers",    tier: "3",   implemented: false },
  "R-DAT-03": { name: "Material continuity",         tier: "3",   implemented: false },
  "R-DAT-04": { name: "Design condition continuity",  tier: "3",   implemented: false },
  "R-DAT-05": { name: "CA8 weight scope",            tier: "3",   implemented: false },
  "R-DAT-06": { name: "SKEY prefix mismatch",        tier: "3",   implemented: false },
  "R-AGG-01": { name: "Total pipe length sanity",    tier: "3/4", implemented: false },
  "R-AGG-02": { name: "Min tangent between bends",   tier: "3",   implemented: false },
  "R-AGG-03": { name: "Route closure check",         tier: "3/4", implemented: false },
  "R-AGG-04": { name: "Dead-end detection",          tier: "3",   implemented: false },
  "R-AGG-05": { name: "Flange pair completeness",    tier: "3",   implemented: false },
  "R-AGG-06": { name: "Component count sanity",      tier: "3",   implemented: false },

  // ─── PTE Rules ───
  "R-PTE-01": { name: "Same RefNo = same component", implemented: false },
  "R-PTE-02": { name: "Point semantics (1,2,0,3)",   implemented: false },
  "R-PTE-03": { name: "Gap = implicit pipe",          implemented: false },
  "R-PTE-04": { name: "Only PIPE is implicit",        implemented: false },
  "R-PTE-05": { name: "BRAN = chain origin",          implemented: false },
  "R-PTE-06": { name: "ANCI = point element",         implemented: false },
  "R-PTE-07": { name: "GASK < 6mm skip",              implemented: false },
  "R-PTE-08": { name: "Zero-length point discard",    implemented: false },
  "R-PTE-09": { name: "Implicit pipe inherits props",  implemented: false },
  "R-PTE-10": { name: "Support GUID = UCI:+NodeName",  implemented: false },
  "R-PTE-11": { name: "Bore string parsing",           implemented: false },
  "R-PTE-12": { name: "East→X, North→Y, Up→Z",        implemented: false },
  "R-PTE-20": { name: "Branch BRAN at TEE CP",         implemented: false },
  "R-PTE-21": { name: "OLET EP1=EP2=CP",               implemented: false },
  "R-PTE-22": { name: "OLET BP only distinct point",   implemented: false }, // Added from benchmark
  "R-PTE-29": { name: "PCOM → PIPE",                   implemented: false },
  "R-PTE-31": { name: "NodeNo connection key",          implemented: false },
  "R-PTE-34": { name: "Dual identity of coordinates",   implemented: false },
  "R-PTE-41": { name: "Line_Key optional",              implemented: false },
  "R-PTE-42": { name: "Gap-fill within same Line_Key",  implemented: false },
  "R-PTE-50": { name: "Orphan sweep from terminal",     implemented: false },
  "R-PTE-51": { name: "Progressive sweep stages",       implemented: false },
  "R-PTE-52": { name: "Axis scoring: same-dir bonus",   implemented: false },
};

export const TOTAL_RULES = Object.keys(RULE_REGISTRY).length;

// Helper to track missing rules during dev without failing immediately
export function registerRule(ruleId) {
  if (!RULE_REGISTRY[ruleId]) {
    console.warn(`Attempted to register unknown rule: ${ruleId}`);
    return;
  }
  RULE_REGISTRY[ruleId].implemented = true;
  if (RULE_REGISTRY[ruleId].executionCount === undefined) {
    RULE_REGISTRY[ruleId].executionCount = 0;
  }
}

export function logRuleExecution(ruleId, rowIndex, message) {
  if (RULE_REGISTRY[ruleId]) {
    RULE_REGISTRY[ruleId].executionCount = (RULE_REGISTRY[ruleId].executionCount || 0) + 1;
  }
}

export function verifyAllRulesImplemented() {
  const missing = Object.entries(RULE_REGISTRY)
    .filter(([id, r]) => !r.implemented)
    .map(([id, r]) => `${id}: ${r.name}`);

  if (missing.length > 0) {
    const msg = `IMPLEMENTATION GATE FAILED!\n` +
      `${missing.length} rules not implemented:\n` +
      missing.map(m => `  ✗ ${m}`).join('\n');

    console.error(msg);
    return { passed: false, missing, total: TOTAL_RULES };
  }

  return { passed: true, missing: [], total: TOTAL_RULES };
}

// Global initialization
if (typeof window !== "undefined") {
    window.RULE_REGISTRY = RULE_REGISTRY;
}
