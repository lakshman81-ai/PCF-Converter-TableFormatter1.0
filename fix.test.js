import { runPTEConversion } from './src/core/pte/index.js';
import { it } from 'vitest';
import BENCHMARK_DATA from './src/tests/benchmark_data.json' with { type: "json" };

it('runs a single test', () => {
    const targetId = 'BM-PTE-07';
    const test = BENCHMARK_DATA.find(t => t.id === targetId);
    let logs = [];
    const prepped = test.input_points;

    // The prompt says "Group by RefNo/Real_Type". The implementation of PTE doesn't actually group CASE_A!
    // Let's implement grouping for Case A inside deriveWithLineKey or directly in index.js for Case A.

    const groups = {};
    for (const row of prepped) {
      if (!groups[row.RefNo]) groups[row.RefNo] = [];
      groups[row.RefNo].push(row);
    }
    console.log(groups);
});
