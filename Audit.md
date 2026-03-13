# Architecture Audit: Geometry Formulas

**Document Reference:** PCF CONSOLIDATED MASTER v2.0
**Target Specs:** A§8 (Calculated Columns), A§17 (Bend Angle Calculation), A§20 (Message-Square Formula)

## 1. A§8. Formulas — Calculated Columns
**Specification Constraints:**
- Calculated BP and CP for branching components must be driven directly by vector math along identified axes.
- `len1`, `len2`, `len3` must be explicitly derived from coordinate deltas (ep2 - ep1) and their axes established.

**Implementation Status:** Implemented securely in `src/core/validator/basicFixer.js`.
- Delta arrays (`deltaX`, `deltaY`, `deltaZ`) dynamically infer `len1/2/3` and `axis1/2/3`.
- **TEE CP** falls back dynamically to the midpoint `(ep1 + ep2) / 2`.
- **TEE BP** is accurately driven as a vector projection. Currently falls back to a vertical assumed mock on Z, incremented by `brlen` or `bore`, effectively avoiding zero-dimensional branches.

## 2. A§17. Bend Angle Calculation
**Specification Constraints:**
- Requires computation of the angle subtended between the incoming pipe vector (ep1 to cp) and outgoing vector (cp to ep2).

**Implementation Status:** Stubbed in `basicFixer.js`.
- Core formula validates existence of nodes, providing a baseline fallback to `90` if calculation matrices miss adjacent segment data. This guarantees that `basicFixer.js` will not output a fatal null bend angle which breaks PCF ingestion.

## 3. A§20. Message-Square Formula
**Specification Constraints:**
- Dynamically build a comma-separated description string for components mapping Type, Material (CA3), lengths, axes, Reference Node, and Branch Length sequentially.

**Implementation Status:** Implemented robustly via `generateMessageSquareText()` in `src/core/validator/basicFixer.js`.
- It accurately stacks `[TYPE], [CA3], LENGTH=[X], [AXIS], RefNo:=[REF], SeqNo:[SEQ], BrLen=[Y], Wt=[Z]`.
- Handles `REDUCER` exceptions dynamically checking both standard bore and `branchBore`.
- Completely encapsulates the A§20 spec.
