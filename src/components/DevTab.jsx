import React, { useState, useEffect } from 'react';
import { useAppContext } from '../core/state';
import { RULE_REGISTRY, TOTAL_RULES, verifyAllRulesImplemented } from '../core/ruleRegistry';
import { runBenchmarks } from '../tests/benchmarks';

export function DevTab() {
  const { state } = useAppContext();
  const [coverage, setCoverage] = useState({ passed: false, missing: [], total: 0 });
  const [benchmarkResults, setBenchmarkResults] = useState(null);

  useEffect(() => {
    async function loadAndCheck() {
      // Force imports to register rules
      await import('../core/validator/validator');
      await import('../core/smartFixer/rules');
      await import('../core/smartFixer/gapAnalyzer');
      await import('../core/pte/index');

      // Run rule registry check on mount
      const check = verifyAllRulesImplemented();
      setCoverage(check);

      // Auto-run benchmarks for dev view
      // (In real execution, pass 'app' instance, here we pass null for mocked tests)
      const bResult = runBenchmarks(null);
      setBenchmarkResults(bResult);
    }
    loadAndCheck();
  }, []);

  const rules = Object.entries(RULE_REGISTRY);
  const implemented = rules.filter(([_, r]) => r.implemented);
  const executed = rules.filter(([_, r]) => (r.executionCount || 0) > 0);
  const missing = rules.filter(([_, r]) => !r.implemented);

  return (
    <div className="p-4 bg-white shadow rounded flex flex-col h-full text-sm">
      <div className="flex justify-between items-center mb-6 border-b pb-2 shrink-0">
        <h2 className="text-xl font-bold font-mono">DEVELOPER DEBUG TAB</h2>
        <span className="text-gray-500">Mode: {state.devMode ? "ON" : "OFF"}</span>
      </div>
      <div className="flex-grow overflow-y-auto">

        {/* RULE COVERAGE REPORT */}
        <div className="mb-8">
        <h3 className="font-bold mb-2 flex items-center">
          <span className="mr-2">▼</span> RULE COVERAGE REPORT
        </h3>

        <div className="mb-4">
          <p className="mb-1">
            <strong>Summary:</strong> {implemented.length}/{rules.length} rules implemented.
            {missing.length > 0 && <span className="text-red-600 font-bold ml-2">⚠️ {missing.length} MISSING</span>}
          </p>
          {missing.length > 0 && (
            <div className="bg-red-50 text-red-800 p-3 rounded mt-2 text-xs font-mono max-h-32 overflow-y-auto">
              <strong>Missing:</strong> {missing.map(([id]) => id).join(', ')}
            </div>
          )}
        </div>

          <div className="overflow-x-auto border rounded max-h-64 overflow-y-auto">
            <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2 border-b">Rule ID</th>
                <th className="p-2 border-b">Name</th>
                <th className="p-2 border-b text-center">Impl?</th>
                <th className="p-2 border-b text-center">Runs</th>
              </tr>
            </thead>
            <tbody>
                {rules.map(([id, r]) => (
                  <tr key={id} className={`border-b ${!r.implemented ? "bg-red-50" : (r.executionCount || 0) === 0 ? "bg-amber-50" : ""}`}>
                    <td className="p-2 font-mono text-xs">{id}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 text-center font-bold">
                      {r.implemented ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}
                    </td>
                    <td className="p-2 text-center">{r.executionCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BENCHMARK TEST RESULTS */}
        <div className="mb-8">
        <h3 className="font-bold mb-2 flex items-center">
          <span className="mr-2">▼</span> BENCHMARK TEST RESULTS
        </h3>

          {benchmarkResults && (
            <>
              <p className="mb-3">
                <strong>Summary:</strong> {benchmarkResults.passed}/{benchmarkResults.total} tests passed.
                {benchmarkResults.failed > 0 && <span className="text-red-600 font-bold ml-2">{benchmarkResults.failed} FAILED.</span>}
              </p>

              <div className="overflow-x-auto border rounded max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 border-b">Test ID</th>
                    <th className="p-2 border-b">Description</th>
                    <th className="p-2 border-b text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                    {benchmarkResults.results.map((r, i) => (
                      <tr key={i} className={`border-b ${r.status !== 'PASS' ? 'bg-red-50' : ''}`}>
                        <td className="p-2 font-mono text-xs">{r.id}</td>
                        <td className="p-2">{r.description}</td>
                        <td className="p-2 text-center font-bold">
                          {r.status === 'PASS'
                            ? <span className="text-green-600">✓ PASS</span>
                            : <span className="text-red-600">✗ FAIL</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* RAW STATE DUMP */}
        <div>
          <h3 className="font-bold mb-2 flex items-center">
            <span className="mr-2">▼</span> RAW STATE DUMP
          </h3>
          <pre className="bg-gray-800 text-green-400 p-4 rounded text-xs overflow-x-auto max-h-48">
            {JSON.stringify({
              dataTable: `[Array(${state.dataTable.length})]`,
              config: state.config,
              smartFixStatus: state.smartFix.status
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
