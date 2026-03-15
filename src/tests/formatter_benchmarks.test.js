import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parsePCFText } from '../core/parsers/pcfParser.js';
import { parseElementCSV } from '../core/parsers/elementCSV.js';
import { generatePcf } from '../core/export/pcfGenerator.js';

const DOCS_DIR = path.join(process.cwd(), 'Docs', 'formatter_benchmarks');
const INPUT_DIR = path.join(DOCS_DIR, 'input');
const EXPECTED_DIR = path.join(DOCS_DIR, 'expected');

function parseCsv(csvText) {
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

describe('Formatter Benchmarks', () => {

  it('TC1_Standard - Idempotency test (zero error)', () => {
    const inputData = fs.readFileSync(path.join(INPUT_DIR, 'TC1_Standard.pcf'), 'utf8');
    const expectedData = fs.readFileSync(path.join(EXPECTED_DIR, 'TC1_Standard_Expected.pcf'), 'utf8');

    const parsedResult = parsePCFText(inputData);
    const config = { decimals: 0, pipelineRef: parsedResult.pipelineRef, strictIsogen: true };

    const generatedPcf = generatePcf(parsedResult.dataTable, config);
    expect(generatedPcf).toBe(expectedData);
  });

  it('TC2_MessySyntax - Normalization test (zero error)', () => {
    const inputData = fs.readFileSync(path.join(INPUT_DIR, 'TC2_MessySyntax.pcf'), 'utf8');
    const expectedData = fs.readFileSync(path.join(EXPECTED_DIR, 'TC2_Normalized_Expected.pcf'), 'utf8');

    const parsedResult = parsePCFText(inputData);
    const config = { decimals: 1, pipelineRef: parsedResult.pipelineRef, strictIsogen: true };

    const generatedPcf = generatePcf(parsedResult.dataTable, config);
    expect(generatedPcf).toBe(expectedData);
  });

  it('TC3_RawTable - CSV Generation test (zero error)', () => {
    const inputData = fs.readFileSync(path.join(INPUT_DIR, 'TC3_RawTable.csv'), 'utf8');
    const expectedData = fs.readFileSync(path.join(EXPECTED_DIR, 'TC3_Generated_Expected.pcf'), 'utf8');

    const rows = parseCsv(inputData);
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

    const dataTable = parseElementCSV(rows, columnMap);
    const config = { decimals: 1, strictIsogen: true };

    const generatedPcf = generatePcf(dataTable, config);
    expect(generatedPcf).toBe(expectedData);
  });

});
