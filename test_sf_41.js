import { runSmartFix } from './src/core/smartFixer/index.js';
import BENCHMARK_DATA from './src/tests/benchmark_data.json' with { type: 'json' };

const test41 = BENCHMARK_DATA.find(t => t.id === 'BM-SF-41');
let logs = [];
const prepped = test41.input.map((r, i) => ({...r, _rowIndex: i+1}));
runSmartFix(prepped, { smartFixer: {} }, logs);

console.log(logs.filter(l => l.ruleId === 'R-SPA-02'));
