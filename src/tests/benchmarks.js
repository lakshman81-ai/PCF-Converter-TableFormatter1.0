import { parseElementCSV } from '../core/parsers/elementCSV.js';
import { parsePointCSV } from '../core/parsers/pointCSV.js';
import BENCHMARKS from './benchmark_data.json' with { type: 'json' };

export function runBenchmarks() {
  const benchmarks = BENCHMARKS;

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const [id, test] of Object.entries(benchmarks)) {
    if (!test.input) {
      results.push({ id, status: 'SKIP', detail: 'No input defined' });
      continue;
    }

    try {
      // Create fake config based on test.setup
      const testConfig = {
        pte: {
          sequentialData: test.setup?.PTE_Sequential_Data !== false,
          lineKeyEnabled: test.setup?.PTE_Line_Key === "ON",
          lineKeyColumn: "Line No",
          sweep: {
            stage6: 13000
          }
        },
        log: []
      };

      // Mock processing depending on test type
      const isPointCSV = test.setup && test.setup.Import_Type === "Point_CSV";
      let dataTable = [];

      // Map Sequence -> CSV SEQ NO for our local tests if it's Element CSV
      const mapColumns = (row) => {
         const newRow = { ...row };
         if (newRow["Sequence"]) {
           newRow["CSV SEQ NO"] = newRow["Sequence"];
           delete newRow["Sequence"];
         }
         return newRow;
      };

      if (isPointCSV) {
        // Run PTE pipeline
        const columnMap = {
           "Sequence": "Sequence",
           "Type": "Type",
           "Point": "Point",
           "PPoint": "PPoint",
           "Bore": "Bore",
           "East": "East",
           "North": "North",
           "Up": "Up",
           "Line No": "Line_Key",
           "RefNo": "RefNo"
        };
        const pointData = test.input.map(r => r); // Identity for points usually

        dataTable = parsePointCSV(pointData, columnMap, testConfig);
      } else {
        // Direct to DataTable
        const columnMap = {
          "Sequence": "CSV SEQ NO",
          "CSV SEQ NO": "CSV SEQ NO",
          "COMPONENT": "Type",
          "Type": "Type",
          "TEXT": "TEXT",
          "PIPELINE-REFERENCE": "PIPELINE",
          "PIPELINE": "PIPELINE",
          "Line No": "PIPELINE",
          "REF NO.": "REF NO.",
          "RefNo": "REF NO.",
          "BORE": "BORE",
          "EP1 COORDS": "EP1 COORDS",
          "EP2 COORDS": "EP2 COORDS",
          "CP COORDS": "CP COORDS",
          "BP COORDS": "BP COORDS",
          "SKEY": "SKEY",
          "SUPPORT COOR": "SUPPORT COORDS",
          "SUPPORT GUID": "SUPPORT GUID"
        };
        const mappedInput = test.input.map(mapColumns);
        dataTable = parseElementCSV(mappedInput, columnMap);
      }

      // Check outputs against expectations
      let pass = true;
      let reason = [];

      if (test.expected) {
        if (test.expected.DataTable_Length) {
          if (dataTable.length !== test.expected.DataTable_Length) {
            pass = false;
            reason.push(`Length mismatch: expected ${test.expected.DataTable_Length}, got ${dataTable.length}`);
          }
        }

        if (test.expected.Type_Counts) {
            for (const [type, count] of Object.entries(test.expected.Type_Counts)) {
               const actualCount = dataTable.filter(r => r.type === type.toUpperCase() || r.type === type).length;
               if (actualCount !== count) {
                   pass = false;
                   reason.push(`${type} count mismatch: expected ${count}, got ${actualCount}`);
               }
            }
        }

        // Add more checks as needed based on benchmark schema
      }

      if (pass) {
        passed++;
        results.push({ id, status: 'PASS', detail: 'OK' });
      } else {
        failed++;
        results.push({ id, status: 'FAIL', detail: reason.join(', ') });
      }

    } catch (e) {
      failed++;
      results.push({ id, status: 'FAIL', detail: `Error: ${e.message}` });
    }
  }

  return { passed, failed, total: passed + failed, results };
}
