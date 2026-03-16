# CSV Validation Benchmark Suite (V1-V22)

This suite is strictly designed to test the validation rules engine (`validator.js`) of the `PCF-CSV-Table-Formatter`. By importing these CSV files, the application should generate a comprehensive list of Errors and Warnings matching the matrices below.

\---

## TC4: Syntax \& Data Validations (`TC4\_CSV\_Syntax.csv`)

|Row|Ref No|Injected Anomaly|Rule Triggered|Severity|Description|
|-|-|-|-|-|-|
|1-3|PIPE-1 to 3|Mixed decimals (`0.0`, `1000`, `1000.00`).|**V2**|ERROR|Decimal consistency mismatch across document.|
|1-3|PIPE-1 to 3|Mixed bore decimals (`150`, `150.00`).|**V3**|ERROR|Bore decimal mismatch across document.|
|4|VAL-1|Valve without an SKEY.|**V14**|WARNING|Mandatory component type missing SKEY.|
|5|FLG-1|Flange missing SKEY.|**V14**|WARNING|Mandatory component type missing SKEY.|
|6-7|PIPE-4, VAL-2|Weight column (CA8) is `0` or `0.0`.|**V16**|WARNING|Weight is zero or missing.|
|8|PIPE-5|Bore size is `4`.|**V18**|WARNING|Bore < 10, likely Imperial. Document may be set to MM.|
|9|SUP-1|GUID string `BAD-GUID` lacks prefix.|**V20**|ERROR|GUID does not start with `UCI:`.|
|10|SUP-2|GUID is completely empty.|**V20**|ERROR|Missing mandatory GUID on support.|

\---

## TC5: Component Geometry Validations (`TC5\_CSV\_Components.csv`)

|Row|Ref No|Injected Anomaly|Rule Triggered|Severity|Description|
|-|-|-|-|-|-|
|1|BEND-V4|Bend `Centre Point` matches `Start Point`.|**V4**|ERROR|Bend CP cannot equal EP1.|
|2|BEND-V5|Bend `Centre Point` matches `End Point`.|**V5**|ERROR|Bend CP cannot equal EP2.|
|3|BEND-V6|Bend points (`0,0`, `500,0`, `250,0`) are collinear.|**V6**|ERROR|Bend CP is on the same line as EPs.|
|4|BEND-V7|Bend CP is NOT equidistant from EPs.|**V7**|WARNING|CP distance to EP1 ≠ CP to EP2.|
|5|BEND-V22|Bend Radius calculation fails due to impossible coordinates.|**V22**|ERROR|Cannot construct valid radius.|
|6|TEE-V8|Tee `Centre Point` (5200) is NOT midpoint of EPs (5000 to 5500).|**V8**|ERROR|Tee CP must be exact midpoint.|
|7|TEE-V9|Tee branch bore (50) does not match main bore (100).|**V9**|ERROR|Non-reducing Tee has mismatched bores.|
|8|TEE-V10|Tee branch vector is not perpendicular to main vector.|**V10**|WARNING|Branch axis is skew.|
|9|OLET-V11|Olet is missing both End Points.|**V11**|ERROR|Olet must have at least one EP or CP.|
|10|OLET-V21|Olet branch vector is collinear to the main run.|**V21**|ERROR|Olet branch must be perpendicular.|
|11|SUP-V12|Support missing Component Attributes (CA1).|**V12**|ERROR|Support requires a CA type (e.g. SHOE).|
|12|SUP-V13|Support bore is set to `0`.|**V13**|ERROR|Support must inherit line bore.|
|13|SUP-V19|Support `MSG` column does not start with `UCI:`.|**V19**|WARNING|Support MSG should contain UCI.|

\---

## TC6: Topological \& System Validations (`TC6\_CSV\_Topology.csv`)

|Row|Ref No|Injected Anomaly|Rule Triggered|Severity|Description|
|-|-|-|-|-|-|
|1|PIPE-V1-A|Start point is exactly `(0.0, 0.0, 0.0)`.|**V1**|ERROR|Origin coordinates are strictly prohibited. Calculate based on Prev/Next and Component length.|
|2|PIPE-V1-B|Both start and end points are `0,0,0` (zero length).|**V1**|ERROR|Origin coordinates are strictly prohibited. Calculate based on Prev/Next and Component length.|
|3-4|PIPE-CONT-1 / 2|5mm gap between end of Pipe 1 and start of Pipe 2.|**V15**|WARNING|Coordinate continuity broken (gap detected).|
|5-6|VAL-1 / PIPE-3|50mm gap between Valve exit and Pipe start.|**V15**|WARNING|Coordinate continuity broken.|
|8-9|PIPE-4 / PIPE-5|500mm gap along a straight run.|**V15**|WARNING|Large coordinate continuity break.|



