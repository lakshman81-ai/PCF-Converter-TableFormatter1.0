import { runPTEConversion } from './src/core/pte/index.js';
import BENCHMARK_DATA from './src/tests/benchmark_data.json' with { type: "json" };

const test = BENCHMARK_DATA.find(t => t.id === 'BM-PTE-07');
let logs = [];
const prepped = test.input_points;

const CONFIG_MOCK = { pte: { sequentialData: true, lineKeyEnabled: false } };
const result = runPTEConversion(prepped, CONFIG_MOCK, logs);

console.log(result.length);
console.log(result[0].type);
console.log(result[0].ep1);
console.log(result[0].ep2);
console.log(result[0].cp);
console.log(result[0].bp);
