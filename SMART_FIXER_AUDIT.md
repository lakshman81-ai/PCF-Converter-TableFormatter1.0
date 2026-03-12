# Smart Fixer Audit Report

This report documents the status of the 57 rules designated for the Smart Fixer engine, mapping their requirements as stated in the documentation to their implementation status within the current software architecture.

| Rule ID | Name | Tier | Status | Implementation Location |
|---|---|---|---|---|
| **R-GEO-01** | Micro-element deletion | 1/4 | **Implemented** | `src/core/smartFixer/rules.js` (L23) |
| **R-GEO-02** | Bore continuity | 4 | **Implemented** | `src/core/smartFixer/rules.js` (L32) |
| **R-GEO-03** | Single-axis element rule | 2/4 | **Implemented** | `src/core/smartFixer/rules.js` (L43) |
| **R-GEO-04** | Fitting dimension sanity | 3 | Not Implemented | Pending |
| **R-GEO-05** | Bend radius sanity | 3 | Not Implemented | Pending |
| **R-GEO-06** | Valve face-to-face | 3 | Not Implemented | Pending |
| **R-GEO-07** | Zero-length element | 4 | **Implemented** | `src/core/smartFixer/rules.js` (L146) |
| **R-GEO-08** | Coordinate magnitude | 3/4 | Not Implemented | Pending |
| **R-TOP-01** | Dead-end detection | 3 | **Implemented** | `src/core/smartFixer/rules.js` (L214) |
| **R-TOP-02** | Orphan element detection | 4 | Not Implemented | Pending |
| **R-TOP-03** | Duplicate element detection | 4 | Not Implemented | Pending |
| **R-TOP-04** | Flange pair check | 3 | **Implemented** | `src/core/smartFixer/rules.js` (L228) |
| **R-TOP-05** | Valve flange sandwich | 3 | Not Implemented | Pending |
| **R-TOP-06** | Support on-pipe validation | 4 | **Implemented** | `src/core/smartFixer/rules.js` (L186) |
| **R-TOP-07** | Tee CP on header segment | 4 | Not Implemented | Pending |
| **R-CHN-01** | Axis change without bend | 4 | **Implemented** | `src/core/smartFixer/rules.js` (L61) |
| **R-CHN-02** | Fold-back detection | 2/4 | **Implemented** | `src/core/smartFixer/rules.js` (L70) |
| **R-CHN-03** | Elbow-elbow proximity | 3 | **Implemented** | `src/core/smartFixer/rules.js` (L138) |
| **R-CHN-04** | Sequence number ordering | info | Not Implemented | Pending |
| **R-CHN-05** | Elevation drift | 2/3 | Not Implemented | Pending |
| **R-CHN-06** | Shared-axis snapping | 1/2/4 | **Implemented** | `src/core/smartFixer/rules.js` (L87) |
| **R-GAP-01** | Negligible gap (<1mm) | 1 | **Implemented** | `src/core/smartFixer/gapAnalyzer.js` (L19) |
| **R-GAP-02** | Axial gap ≤25mm | 2 | **Implemented** | `src/core/smartFixer/gapAnalyzer.js` (L38) |
| **R-GAP-03** | Axial gap >25mm | 3/4 | **Implemented** | `src/core/smartFixer/gapAnalyzer.js` (L45) |
| **R-GAP-04** | Lateral gap | 2/4 | **Implemented** | `src/core/smartFixer/gapAnalyzer.js` (L56) |
| **R-GAP-05** | Multi-axis negligible lat | 2 | **Implemented** | `src/core/smartFixer/gapAnalyzer.js` (L71) |
| **R-GAP-06** | Multi-axis significant | 4 | **Implemented** | `src/core/smartFixer/gapAnalyzer.js` (L78) |
| **R-GAP-07** | Gap at tee junction | 2 | Not Implemented | Pending |
| **R-GAP-08** | Only pipes fill gaps | rule | **Implemented** | `src/core/smartFixer/fixEngine.js` (L86) |
| **R-OVR-01** | Simple axial overlap pipe | 2/3 | **Implemented** | `src/core/smartFixer/gapAnalyzer.js` (L95) |
| **R-OVR-02** | Overlap rigid current | 2/4 | **Implemented** | `src/core/smartFixer/gapAnalyzer.js` (L102) |
| **R-OVR-03** | Rigid-on-rigid overlap | 4 | **Implemented** | `src/core/smartFixer/gapAnalyzer.js` (L88) |
| **R-OVR-04** | Enveloping overlap | 4 | Not Implemented | Pending |
| **R-OVR-05** | Overlap at tee boundary | 2/3 | Not Implemented | Pending |
| **R-OVR-06** | Overlap negative pipe | 2 | **Implemented** | `src/core/smartFixer/fixEngine.js` (L42) |
| **R-BRN-01** | Branch bore > header bore | 4 | **Implemented** | `src/core/smartFixer/rules.js` (L105) |
| **R-BRN-02** | Olet size ratio | 3/4 | **Implemented** | `src/core/smartFixer/rules.js` (L111) |
| **R-BRN-03** | Branch same axis as header | 4 | **Implemented** | `src/core/smartFixer/rules.js` (L121) |
| **R-BRN-04** | Branch perpendicularity | 3/4 | **Implemented** | `src/core/smartFixer/rules.js` (L136) |
| **R-BRN-05** | Branch chain continuation | 4 | Not Implemented | Pending |
| **R-SPA-01** | Elevation consistency | 2/3 | Not Implemented | Pending |
| **R-SPA-02** | Shared-axis coord snap | 1/2/4 | Not Implemented | Pending |
| **R-SPA-03** | Gravity-aware support | 3 | Not Implemented | Pending |
| **R-SPA-04** | Collinear pipe merge | info | Not Implemented | Pending |
| **R-SPA-05** | Suspicious placeholder | 3 | Not Implemented | Pending |
| **R-DAT-01** | Precision consistency | 3 | **Implemented** | `src/core/smartFixer/rules.js` (L160) |
| **R-DAT-02** | Suspicious round numbers | 3 | Not Implemented | Pending |
| **R-DAT-03** | Material continuity | 3 | **Implemented** | `src/core/smartFixer/rules.js` (L168) |
| **R-DAT-04** | Design condition continuity | 3 | **Implemented** | `src/core/smartFixer/rules.js` (L176) |
| **R-DAT-05** | CA8 weight scope | 3 | **Implemented** | `src/core/smartFixer/rules.js` (L182) |
| **R-DAT-06** | SKEY prefix mismatch | 3 | **Implemented** | `src/core/smartFixer/rules.js` (L190) |
| **R-AGG-01** | Total pipe length sanity | 3/4 | **Implemented** | `src/core/smartFixer/rules.js` (L238) |
| **R-AGG-02** | Min tangent between bends | 3 | Not Implemented | Pending |
| **R-AGG-03** | Route closure check | 3/4 | **Implemented** | `src/core/smartFixer/rules.js` (L245) |
| **R-AGG-04** | Dead-end detection | 3 | Not Implemented | Pending |
| **R-AGG-05** | Flange pair completeness | 3 | **Implemented** | `src/core/smartFixer/rules.js` (L221) |
| **R-AGG-06** | Component count sanity | 3 | **Implemented** | `src/core/smartFixer/rules.js` (L233) |

**Notes on Completion:**
- Currently, 35 out of the 57 defined Smart Fixer rules have full logical implementations linked directly to the application's engine (`runElementRules`, `analyzeGap`, `analyzeOverlap`).
- 22 rules are explicitly marked as "Not Implemented" in the registry and are structurally blocked from artificially spoofing successful implementations in Developer reports.
- Tests relating to implemented rules pass strictly without logic spoofing. Tests mapped to unimplemented rules correctly display as FAILED.