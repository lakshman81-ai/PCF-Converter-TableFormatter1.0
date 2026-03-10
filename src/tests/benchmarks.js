import { runValidation, runBasicFixes } from '../core/validator';
import { runSmartFix } from '../core/smartFixer';
import { generatePcf } from '../core/export/pcfGenerator';
import { runPTEConversion } from '../core/pte';
import BENCHMARK_DATA from './benchmark_data.json';

const CONFIG_MOCK = {
  decimals: 4,
  angleFormat: "degrees",
  pte: { sequentialData: true, lineKeyEnabled: true },
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
  }
};

export const ALL_BENCHMARKS = BENCHMARK_DATA.map(test => {
  return {
    id: test.id,
    group: test.group,
    rule: test.rule,
    description: test.description,
    input: test.input,
    input_points: test.input_points,
    expected: test.expected,
    run: (app) => {
      if (test.group === "validation" && test.input) {
        let logs = [];
        const results = runValidation(test.input, CONFIG_MOCK, logs);

        if (test.expected?.severity === "NONE" || test.expected?.severity === "PASS" || test.expected?.severity === undefined) {
           const hasError = results.some(r => r.ruleId === test.rule && r.severity === "ERROR");
           return hasError ? "FAIL (Unexpected errors)" : "PASS";
        } else {
           const hit = results.find(r => r.ruleId === test.rule);
           return hit ? "PASS" : "FAIL (Rule not triggered)";
        }
      }

      if (test.group === "smartfix" && test.input) {
        let logs = [];
        const prepped = test.input.map((r, i) => ({...r, _rowIndex: i+1}));
        // We aren't capturing returned objects, only logs
        runSmartFix(prepped, CONFIG_MOCK, logs);

        if (test.expected?.action === "NONE" || test.expected?.action === undefined) {
          return logs.filter(l => l.ruleId === test.rule).length === 0 ? "PASS" : "FAIL";
        } else {
          const hit = logs.find(l => l.ruleId === test.rule);
          return hit ? "PASS" : "FAIL";
        }
      }

      if (test.group === "pcf_gen" && test.input) {
        const pcfStr = generatePcf(test.input, test.config || CONFIG_MOCK);

        let allChecksPass = true;
        let errMsg = "";

        if (test.expected?.pcf_contains) {
          for (let c of test.expected.pcf_contains) {
            if (!pcfStr.includes(c)) {
              allChecksPass = false;
              errMsg += `Missing string: "${c}". `;
            }
          }
        }
        if (test.expected?.pcf_not_contains) {
          for (let nc of test.expected.pcf_not_contains) {
            if (pcfStr.includes(nc)) {
              allChecksPass = false;
              errMsg += `Contains forbidden string: "${nc}". `;
            }
          }
        }
        if (test.expected?.line_ending) {
          if (test.expected.line_ending === "CRLF" && !pcfStr.includes("\r\n")) {
             allChecksPass = false;
             errMsg += "Missing CRLF line endings. ";
          }
        }
        if (test.expected?.roundTripMatch) {
            allChecksPass = pcfStr.includes("FLANGE") && pcfStr.includes("SUPPORT");
        }

        return allChecksPass ? "PASS" : `FAIL (${errMsg.trim()})`;
      }

      if (test.group === "pte" && test.input_points) {
        let logs = [];
        const resultTable = runPTEConversion(test.input_points, CONFIG_MOCK, logs);

        if (test.expected?.cp) {
           const hasCp = resultTable.some(r => r.cp && Math.abs(r.cp.x - test.expected.cp.x) < 0.1);
           if (!hasCp) return "FAIL (CP mismatch)";
        }
        if (test.expected?.flanges) {
           const f = resultTable.filter(r => r.type === "FLANGE");
           if (f.length < test.expected.flanges.length) return "FAIL (Flanges missing)";
        }
        return "PASS";
      }

      return "FAIL (Unknown test group)";
    }
  };
});

export function runBenchmarks(app) {
  const results = [];

  for (const test of ALL_BENCHMARKS) {
    try {
      const result = test.run(app);
      results.push({
        id: test.id,
        rule: test.rule,
        description: test.description,
        status: result.startsWith("PASS") ? "PASS" : "FAIL",
        detail: result,
      });
    } catch (err) {
      results.push({
        id: test.id,
        rule: test.rule,
        description: test.description,
        status: "ERROR",
        detail: err.message,
      });
    }
  }

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status !== "PASS").length;

  console.log(`BENCHMARKS: ${passed}/${results.length} passed, ${failed} failed.`);

  return { results, passed, failed, total: results.length };
}