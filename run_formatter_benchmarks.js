import fs from 'fs';
import path from 'path';
import { parsePCFText } from './src/core/parsers/pcfParser.js';
import { parseElementCSV } from './src/core/parsers/elementCSV.js';
import { generatePcf } from './src/core/export/pcfGenerator.js';

const DOCS_DIR = path.join(process.cwd(), 'Docs', 'formatter_benchmarks');
const INPUT_DIR = path.join(DOCS_DIR, 'input');
const EXPECTED_DIR = path.join(DOCS_DIR, 'expected');

function parseCsv(csvText) {
  // basic csv parser
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }
  return rows;
}

function runTest(testName, inputFile, expectedFile, isCsv = false) {
    console.log(`\nRunning ${testName}...`);
    try {
        const inputPath = path.join(INPUT_DIR, inputFile);
        const expectedPath = path.join(EXPECTED_DIR, expectedFile);

        const inputData = fs.readFileSync(inputPath, 'utf8');
        const expectedData = fs.readFileSync(expectedPath, 'utf8');

        let dataTable = [];
        let config = { strictIsogen: true };

        if (inputFile === 'TC2_MessySyntax.pcf' || inputFile === 'TC3_RawTable.csv') {
           config.decimals = 1;
        } else {
           config.decimals = 0;
        }

        if (isCsv) {
            // Read CSV and convert it
            const rows = parseCsv(inputData);

            // For elementCSV, columnMap maps headerName -> AliasName
            const columnMap = {
              "Line No": "PIPELINE-REFERENCE",
              "Weight": "CA 8",
              "Skey": "SKEY",
              "Ref No": "RefNo",
              "CA 1": "CA 1",
              "Type": "Type",
              "Start Point": "EP1 COORDS",
              "End Point": "EP2 COORDS",
              "Center Point": "CP COORDS",
              "Branch": "BP COORDS",
              "Bore": "BORE"
            };

            dataTable = parseElementCSV(rows, columnMap);
        } else {
            const parsedPcfResult = parsePCFText(inputData);
            dataTable = parsedPcfResult.dataTable; // Get array from result obj
            if (parsedPcfResult.pipelineRef) {
                config.pipelineRef = parsedPcfResult.pipelineRef;
            }
        }

        const generatedPcf = generatePcf(dataTable, config);

        if (generatedPcf === expectedData) {
            console.log(`✅ ${testName} PASSED`);
        } else {
            console.log(`❌ ${testName} FAILED`);
            fs.writeFileSync(`failed_${expectedFile}`, generatedPcf);
            console.log(`   Expected and generated PCFs do not match. Check failed_${expectedFile}`);

            // Output a basic diff summary
            const expectedLines = expectedData.split('\r\n');
            const generatedLines = generatedPcf.split('\r\n');
            let firstDiff = -1;
            for (let i = 0; i < Math.max(expectedLines.length, generatedLines.length); i++) {
                if (expectedLines[i] !== generatedLines[i]) {
                    firstDiff = i;
                    break;
                }
            }
            if (firstDiff !== -1) {
                console.log(`   First difference at line ${firstDiff + 1}:`);
                console.log(`   Expected: "${expectedLines[firstDiff]}"`);
                console.log(`   Generated: "${generatedLines[firstDiff]}"`);
            }
        }
    } catch (error) {
        console.error(`❌ ${testName} ERROR:`, error);
    }
}

console.log('--- RUNNING FORMATTER BENCHMARKS ---');
runTest('TC1_Standard', 'TC1_Standard.pcf', 'TC1_Standard_Expected.pcf', false);
runTest('TC2_MessySyntax', 'TC2_MessySyntax.pcf', 'TC2_Normalized_Expected.pcf', false);
runTest('TC3_RawTable', 'TC3_RawTable.csv', 'TC3_Generated_Expected.pcf', true);
console.log('--- DONE ---');
