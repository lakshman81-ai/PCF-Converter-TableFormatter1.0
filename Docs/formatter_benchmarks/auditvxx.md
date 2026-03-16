# Validation Rules (V1-V22) Core Architecture Audit

This report documents the deep architecture overhaul, logic evaluation, and smart-fix capabilities for the full suite of Validation rules (V1-V22) within the core engine.

During the recent Phase 1 & 2 architectural upgrades, the benchmark suite was completely revamped to enforce a strict `Validate -> Fix -> Post-fix Validate` (Zero-Error Guarantee) pipeline. This audit validates how every rule is detected and fixed under that robust pipeline.

## Rule Breakdown

| Rule ID | Name / Description | Type | Fix Engine Support | Audit Notes & Actions Taken |
|---------|--------------------|------|---------------------|-----------------------------|
| **V1**  | Detect (0,0,0) Coordinates | ERROR | No (Manual Review) | Flags completely broken geometries. Smart fixer cannot safely invent space coordinates without surrounding context. Passes benchmarks reliably. |
| **V2**  | Decimal precision mismatch | WARNING/ERROR | Yes (Export Generator) | **Overhauled:** Previously checked raw string length vs document-wide median. Now explicitly tests against `config.decimals` output target and flags as `ERROR` if output format constraints will be breached. Generation auto-normalizes this. |
| **V3**  | Bore mismatch across endpoints | ERROR | No | Detects Reducers with identical bores or regular components with mismatched endpoint bores. |
| **V4**  | BEND CP = EP1 | ERROR | No | Fails mathematically impossible tight bends. |
| **V5**  | BEND CP = EP2 | ERROR | No | Fails mathematically impossible tight bends. |
| **V6**  | BEND CP collinearity | ERROR | No | Flags bends that are geometrically straight pipes. |
| **V7**  | BEND CP equidistant | WARNING | No | Warns if leg 1 distance !== leg 2 distance. Valid warning for pulling bend data. |
| **V8**  | TEE CP exact midpoint | ERROR | **Yes** (`basicFixer`) | **Major Bug Fixed:** Previously, the basic fixer only fixed V8 if coordinates were corrupted (e.g. `9999,9999,9999`). It now uses `vec.dist(row.cp, mid) > 0.1` to robustly detect and auto-recalculate center points that are mathematically skewed, enabling zero-error post-validation. |
| **V9**  | TEE CP bore matches EP bore | ERROR | **Yes** (`basicFixer`) | **Major Bug Fixed:** TEE components have a main run (`bore`, `epBore`) and a branch (`branchBore`). Previously, the validator incorrectly fell back to checking `branchBore` if `cp.bore` was missing, forcing valid reducing tees to fail V9. Both `validator.js` and `basicFixer.js` now strictly isolate the `cp.bore` check to the main run (`epBore`). |
| **V10** | TEE branch perpendicularity | WARNING | No | Math logic updated to use `vec.dot` robustly. |
| **V11** | OLET has no END-POINTs | ERROR | **Yes** (`basicFixer`) | Detects if OLETs inappropriately have EP1/EP2. BasicFixer auto-strips these endpoints to align with standard PCF schemas. |
| **V12** | SUPPORT has no CAs | ERROR | Yes (Export Generator) | New UI Config explicitly allows users to ignore or map CAs cleanly, but `validator` flags native CAs as standard error. |
| **V13** | SUPPORT bore is 0 | ERROR | **Yes** (`basicFixer`) | Auto-sets support bore to `0` if accidentally parsed with line bore. |
| **V14** | Missing `<SKEY>` | WARNING | No | Warns user. UI now provides dynamic dropdown mapping to mass-assign SKEYs (e.g., mapping TEE bores to SKEYs). |
| **V15** | Coordinate continuity (Gaps) | WARNING | Yes (`smartFixer`) | Detected by V15, fully handled by the `smartFixer` topology engine which chains points and auto-snaps connections. |
| **V16** | CA8 usage scope | WARNING | No | Flags non-valve components incorrectly using CA8 (Weight). |
| **V17** | Reserved / EOF formats | ERROR | No | Used during raw string checking for CRLF conformity. |
| **V18** | Bore unit check (Inches vs MM) | WARNING | No | Detects numbers ≤ 48 as likely imperial inches and flags for user review. |
| **V19** | SUPPORT MSG-SQ tokens | WARNING | No | Detects if support message square incorrectly holds component pipe data (like LENGTH=). |
| **V20** | SUPPORT_GUID Prefix (UCI:) | ERROR | Yes (Export Generator) | Detected internally, Export generator auto-appends `UCI:` during output generation. UI mapping system also supports this. |
| **V21** | OLET missing BP | ERROR | **Yes** (`basicFixer`) | Auto-calculates OLET branch points from downstream pipe vectors. |
| **V22** | BEND missing CP / Radius | ERROR/WARNING | **Yes** (`basicFixer`) | Auto-calculates fallback CP using intersection of tangents. |

## Deep Architecture Overhaul Summary
1. **Zero-Error Benchmark Guarantee:** By modifying `benchmarks.js` to execute `runValidation` *after* `runBasicFixes` on the same test rows, we established a strict topological guarantee. If a fixer claims it works, the mathematical validator must concur with 0 errors.
2. **Robust Vector Math:** Hand-rolled float approximations (e.g., `Math.pow(row.cp.x - mid.x)`) were purged in favor of the strict `vec.dist` engine to prevent sub-millimeter precision failures.
3. **Data Segregation:** Addressed schema conflation (like treating `cp.bore` as `branchBore`) that historically caused auto-fixers to corrupt valid piping models.
