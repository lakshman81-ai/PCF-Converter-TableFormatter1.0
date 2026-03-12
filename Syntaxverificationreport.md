# PCF Syntax Verification Report

## Phase 1: Input Parsing
**Goal:** Ingest raw component block and table text faithfully and convert it to the internal `DataTable` state without altering implicit logic.

* **Component Block Pattern (Reference §1.2 & §3.1):** The `pcfText.js` state machine appropriately groups `MESSAGE-SQUARE` attributes to the following component block keyword. `Text`, `SeqNo`, and `RefNo` data are successfully captured into the state map.
* **Header Parsing (Reference §1.1):** `ISOGEN-FILES` and `UNITS-*` headers are stripped from geometric conversion logic and pushed as literal strings for internal verification.
* **Component Keywords (Reference §4):** Mapping matches `PIPE`, `FLANGE`, `BEND`, `TEE`, `OLET`, `VALVE`, `SUPPORT`, `REDUCER-CONCENTRIC`, and `REDUCER-ECCENTRIC`.
* **Geometry Vectors (Reference §5):** Parsed dynamically. END-POINT, CENTRE-POINT, and BRANCH1-POINT strings split properly.

---

## Phase 2: Validation and Smart Fix Logic
**Goal:** Maintain mathematical integrity without injecting arbitrary data, following strict archetypal casting (Global Agent Doctrines) and PCF syntax bounds.

* **Support Component Rule (Reference §12):**
   - `V12` validates that `SUPPORT` possesses no `COMPONENT-ATTRIBUTE` elements.
   - `V13` strictly ensures that `SUPPORT` bore is `0`.
   - `V20` strictly evaluates if the `<SUPPORT_GUID>` explicitly has the `UCI:` prefix.
* **Bore and Decimal Sync (Reference §15):**
   - Rule `V2` validates decimal continuity between geometric coordinates and bore precision strings.
   - Smart Fixer rule `R-GEO-02` traps missing reducers if adjacent elements experience bore drift.
* **Coordinate Validation:** Rule `V1` ensures no `(0,0,0)` generic endpoints exist in the system, maintaining geographical bounds. Rule `V6` flags colinear CP/EP endpoints.
* **CA8 Integrity (Reference §6.2.3):** Rule `V16` enforces that `CA8` (Weight) should never populate on `PIPE` or `SUPPORT`.

---

## Phase 3: Output Generation (Export)
**Goal:** Serialize the `DataTable` state precisely back into the PCF plain text spec (PCF Syntax Master v1.0).

* **Header Regeneration (Reference §1.1):** Hardcoded exactly as required. Automatically utilizes `PIPELINE-REFERENCE` export value.
* **MESSAGE-SQUARE Gen (Reference §3.1 & §20):**
  - Fully supports comma-separated parameter lists. Dynamically strips missing fields.
  - Dynamically builds `LENGTH=XXMM`, directional labeling (`SOUTH`, `UP`), `RefNo:=XX`, and `Wt=XX`.
  - Is specifically **excluded** from `SUPPORT` output (Reference §12).
* **Geometry Generation (Reference §5.2):**
  - `<SKEY>` utilizes explicit angle brackets natively.
  - `SUPPORT` outputs `CO-ORDS` with a hardcoded `0` terminal bore.
  - `OLET` suppresses `END-POINT` logic and only exports `CENTRE-POINT` and `BRANCH1-POINT`.
  - Missing `UCI:` prefixes are forcefully prepended dynamically if user data stripped them.
* **Coordinate Syntax Formatting (Reference §15):**
  - Uses exact string construction template: `f"{value:.4f}"` (or decimal precision argument) with the bore dynamically appended as an integer (using `Math.round(bore)`).
* **CRLF Formatting (Reference §1):**
  - The final file stream dynamically joins utilizing explicit `\r\n` characters natively.