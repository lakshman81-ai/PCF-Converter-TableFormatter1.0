import { runBenchmarks } from './src/tests/benchmarks.js';

// eslint-disable-next-line no-undef
const targetId = process.argv[2];
const result = runBenchmarks({});
if (targetId) {
    const test = result.results.find(r => r.id === targetId);
    console.log(test);
} else {
    result.results.filter(r => r.status !== 'PASS').forEach(r => console.log(`${r.id}: ${r.detail}`));
    console.log(`Passed: ${result.passed}, Failed: ${result.failed}, Total: ${result.total}`);
}
