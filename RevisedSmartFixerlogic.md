# Revised Smart Fixer Logic & Two-Pass Architecture

This document details the newly implemented **Two-Pass Architecture** for the Smart Fixer engine, along with UI integrations and fallback mapping mechanisms designed to handle dirty PCF extractions accurately without causing cross-line pollution.

## 1. The Core Toggle: `AutoMultiPassMode`
The standard execution pipeline has been augmented with an `AutoMultiPassMode` toggle accessible via the Config Tab. When enabled, this overrides the default "greedy" application of Smart Fixes, enforcing strict constraints designed for real-world messy data scenarios (like Station G).

### 1.1 Operating Modes
The environment respects three Operating Modes:
* **Auto (Default):** Detects if point CSVs are sequential based on input arrays.
* **Sequential:** Forces sequential logic chaining (`caseB.js`).
* **Non-Sequential:** Triggers the Orphan Sweep algorithms (`caseD.js`).

## 2. Line_Key Mapping & Constraints
Users can now dynamically map the `Line_Key` constraint via the `lineKeyColumn` text input (e.g., "Line No" or "PIPELINE-REFERENCE").

**Fallback Behavior:**
If `lineKeyEnabled` is ON, the PTE conversion and Smart Fixer actively look for this column. However, if the field is mapped but the cell is empty or missing for specific components, the logic natively falls back from Case B(a) to Case B(b) (or D(a) to D(b)). The component is simply processed without `Line_Key` constraints rather than causing systemic crashes.

## 3. Two-Pass Execution Strategy

When `AutoMultiPassMode` is turned ON, the single execution run is split into two explicit, user-validated passes.

### 3.1 First Pass (Stage 1 - Constrained Chain Walker)
During the First Pass, the engine completely isolates Non-Pipe objects (Fittings, Valves). The algorithm only seeks to bridge, trim, or alter `PIPE` elements.
* **Constraint 1 - Single Axis:** Gap filling and trimming will only evaluate along a single axis of travel. Multi-axis diagonal gaps are ignored.
* **Constraint 2 - Bore Ratio:** Connections will ONLY be proposed if the connecting elements have a strict Bore Ratio between **0.7 and 1.5**. Anything outside this bounds throws a `MULTIPASS-BORE` review block.
* **Constraint 3 - Line Key Guard:** If the `Line_Key` exists on both connecting elements, it must exactly match. If mismatched, throws a `MULTIPASS-LKEY` review block.
* **Constraint 4 - Limit:** Gaps larger than **20,000mm** are strictly Auto Rejected (`MULTIPASS-REJECT`).

### 3.2 First Pass (Stage 2 - Constrained Orphan Sweep)
Any elements not joined in Stage 1 are passed to the Non-Sequential Sweep (`caseD.js`).
* The sweep attempts to join them into chains.
* It uses the same strict validations (`Line_Key` match if available, Bore Ratio 0.7-1.5, Single-Axis mapping).

### 3.3 Fix Auto-Approval Logic
Instead of blindly modifying the Data Table, the First Pass flags fixes as **Previews**:
* **Auto Approved (Tier 1/2):** Proposed fixes < 25mm (Continuity Tolerance) are visually queued.
* Users can use the **"Auto Approve First Pass"** button to automatically select all these Tier 1/2 gaps for fixing.
* Users can manually toggle `✅ Approve` or `❌ Reject` on individual rows in the Data Table.

### 3.4 Second Pass Activation
Once the First Pass fixes have been Approved and **"Apply Fixes ✓"** is clicked, the Data Table is regenerated.
* Only at this point does the **"🚀 Run Second Pass"** button unlock.
* **Second Pass Logic:** The engine runs the exact same graph walker, but this time it targets **Non-Pipe components (Fittings)** for gap evaluation and modular fixes, ignoring the pipes that were secured in Pass 1.

## 4. Setting Controls
The Config Tab now hosts mutable values for the following algorithm limits:
* **Bore Ratio Min:** 0.7
* **Bore Ratio Max:** 1.5
* **Orphan Sweep Minimum Radius:** `0.2 * NB`
* **Orphan Sweep Maximum Radius:** `13000mm`
