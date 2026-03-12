import { test } from 'vitest';
import { runSmartFix } from './src/core/smartFixer/index.js';
import fs from 'fs';

test('run test 22', () => {
    const data = JSON.parse(fs.readFileSync('src/tests/benchmark_data.json', 'utf8'));
    const test22 = data.find(t => t.id === 'BM-SF-22');

    const CONFIG_MOCK = {
      decimals: 4,
      angleFormat: "degrees",
      smartFixer: {
        connectionTolerance: 25.0,
        microPipeThreshold: 6.0,
        microFittingThreshold: 1.0,
        autoFillMaxGap: 25.0,
        reviewGapMax: 100.0,
        autoTrimMaxOverlap: 25.0,
        silentSnapThreshold: 2.0,
        warnSnapThreshold: 10.0,
        autoDeleteFoldbackMax: 25.0,
        maxChainingGap: 5000.0,
      }
    };

    let logs = [];
    const prepped = test22.input.map((r, i) => ({...r, _rowIndex: i+1}));
    runSmartFix(prepped, CONFIG_MOCK, logs);
    console.log("LOGS:");
    console.log(JSON.stringify(logs, null, 2));
});
