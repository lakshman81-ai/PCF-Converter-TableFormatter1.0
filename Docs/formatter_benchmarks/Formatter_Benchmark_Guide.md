# PCF-CSV-Table-Formatter Benchmark Suite

This suite contains 3 specific benchmark test cases designed exclusively to test the parsing, normalization, and generation capabilities of the `PCF-CSV-Table-Formatter` app.

**Constraint:** The Formatter app must *NOT* perform geometry validations or fix spatial coordinates. It must simply translate and format data.

## Test Case 1: Idempotency (`TC1_Standard.pcf`)
* **Purpose:** To test if the application can import a perfectly formatted PCF, translate it to its internal table state, and export it back out *without altering or losing any data*.
* **Input:** A standard PCF with Pipes, Supports, Valves, and Message-Squares.
* **Expected Output:** The exported PCF must be a 1:1 character match with the input PCF (excluding minor whitespace/decimal normalizations).

## Test Case 2: Normalization (`TC2_MessySyntax.pcf`)
* **Purpose:** To test the parser's robustness against poorly formatted legacy PCFs.
* **Input Anomalies:**
  * Lowercase header definitions (`isogen-files`).
  * Inconsistent indentation (using tabs `\t` instead of spaces, or 1/2 spaces).
  * Out-of-order component properties (e.g. `SKEY` at the end, `ITEM-CODE` at the beginning).
  * Legacy fallbacks (`COMPONENT-ATTRIBUTE97`).
* **Expected Output (`TC2_Normalized_Expected.pcf`):**
  * All headers capitalized.
  * Strict enforcement of the "4-Space Rule" for component properties.
  * Properties sorted in standard ISOGEN order (END-POINTs -> CENTRE-POINT -> BRANCH1-POINT -> SKEY -> ITEM-CODE -> COMPONENT-ATTRIBUTES).
  * Integer coordinates optionally formatted with `.0` to enforce decimal consistency.

## Test Case 3: CSV to PCF Generation (`TC3_RawTable.csv`)
* **Purpose:** To test the `elementCSV.js` parser's column ALIAS engine and its ability to construct a compliant PCF from raw spreadsheet data.
* **Input Anomalies:**
  * Uses human-readable headers instead of strict PCF keys (`Line No`, `Start Point`, `Weight`).
  * Sparse data (empty cells where points don't exist).
  * Custom `CA 1` and `Weight` aliases.
* **Expected Output (`TC3_Generated_Expected.pcf`):**
  * `Line No` is mapped to `PIPELINE-REFERENCE`.
  * `Start Point` string `"0 0 0"` is parsed to `END-POINT 0.0 0.0 0.0`.
  * `Weight` is mapped to `COMPONENT-ATTRIBUTE8` (or the equivalent configured mapping).
  * Missing elements (like a `CENTRE-POINT` on a pipe) are gracefully skipped without generating empty lines or errors.
