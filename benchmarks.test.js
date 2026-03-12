import { describe, it, expect } from 'vitest';
import { runBenchmarks } from './src/tests/benchmarks.js';

describe('Benchmarks', () => {
  it('should pass all benchmarks', () => {
    const result = runBenchmarks({});
    console.log(`Passed: ${result.passed}, Failed: ${result.failed}, Total: ${result.total}`);
    result.results.filter(r => r.status !== 'PASS').forEach(r => console.log(`${r.id}: ${r.detail}`));
    expect(result.failed).toBe(0);
  });
});
