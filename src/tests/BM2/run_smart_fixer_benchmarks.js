import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parsePCFText } from '../../core/parsers/pcfParser.js';
import { runValidation } from '../../core/validator/validator.js';
import { runBasicFixes } from '../../core/validator/basicFixer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BM_FILES = [
  'BM1_Gaps_Overlaps.pcf',
  'BM2_MultiAxis_NonPipeGaps.pcf',
  'BM3_TeeAnomalies_MissingReducer.pcf',
  'BM4_ElbowCP_MissingRefNo.pcf',
  'BM5_OletSyntax_MsgSquare.pcf',
  'BM6_MissingRVAssembly.pcf'
];

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
    maxChainingGap: 5000.0,
  }
};

function runBenchmark(filename) {
  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING BENCHMARK: ${filename}`);
  console.log(`======================================================\n`);

  const pcfPath = path.join(__dirname, filename);
  if (!fs.existsSync(pcfPath)) {
      console.error(`❌ File not found: ${pcfPath}`);
      return;
  }

  const pcfContent = fs.readFileSync(pcfPath, 'utf-8');
  let logs = [];

  // 1. Parse PCF -> Data Table
  const parsed = parsePCFText(pcfContent);
  let dataTable = parsed.dataTable;
  console.log(`[PARSE] Generated ${dataTable.length} components.\n`);

  console.log(`[INITIAL STATE (INPUT)]`);
  dataTable.forEach(r => {
      let coords = `EP1: ${r.ep1 ? `(${r.ep1.x},${r.ep1.y},${r.ep1.z})` : 'null'} | EP2: ${r.ep2 ? `(${r.ep2.x},${r.ep2.y},${r.ep2.z})` : 'null'} | CP: ${r.cp ? `(${r.cp.x},${r.cp.y},${r.cp.z})` : 'null'} | BP: ${r.bp ? `(${r.bp.x},${r.bp.y},${r.bp.z})` : 'null'}`;
      console.log(`   - ${r.type.padEnd(10)} [${r.refNo || 'NO-REF'}] Bore: ${r.bore} | ${coords}`);
  });
  console.log(`\n------------------------------------------------------`);

  // 2. Validate (Pre-Fix)
  // Pre-process rows to ensure they have _rowIndex for validation/fixers
  dataTable.forEach((r, i) => r._rowIndex = i + 1);

  let valLogs = [];
  runValidation(dataTable, CONFIG_MOCK, valLogs);
  const initialErrors = valLogs.filter(l => l.type === 'Error' || l.type === 'Warning');

  console.log(`[VALIDATION (PRE-FIX)] Found ${initialErrors.length} issues.`);
  initialErrors.forEach(e => console.log(`   * ${e.message}`));
  console.log(`------------------------------------------------------\n`);

  // 3. Fix (Action)
  let fixLogs = [];
  const fixedTable = runBasicFixes(dataTable, CONFIG_MOCK, fixLogs);

  // Print ALL generated fixes, calculated missing geometry, and warnings.
  console.log(`[SMART FIXER (ACTION TAKEN)] Applied ${fixLogs.length} fixes.`);
  fixLogs.forEach(f => console.log(`   * ${f.message}`));
  console.log(`------------------------------------------------------\n`);

  // 4. Output (Efferent Mode)
  console.log(`[FINAL STATE (OUTPUT)]`);
  fixedTable.forEach(r => {
      let coords = `EP1: ${r.ep1 ? `(${r.ep1.x},${r.ep1.y},${r.ep1.z})` : 'null'} | EP2: ${r.ep2 ? `(${r.ep2.x},${r.ep2.y},${r.ep2.z})` : 'null'} | CP: ${r.cp ? `(${r.cp.x},${r.cp.y},${r.cp.z})` : 'null'} | BP: ${r.bp ? `(${r.bp.x},${r.bp.y},${r.bp.z})` : 'null'}`;
      let msgSq = r.text ? `| TEXT: ${r.text.substring(0, 30)}...` : '';
      console.log(`   - ${r.type.padEnd(10)} [${r.refNo || 'NO-REF'}] Bore: ${r.bore} | ${coords} ${msgSq}`);
  });
  console.log(`------------------------------------------------------\n`);

  // 5. Accuracy Assessment (Placeholder for manual/visual review logic based on expected errors)
  console.log(`[ACCURACY / POST-VALIDATION]`);
  let postValLogs = [];
  runValidation(fixedTable, CONFIG_MOCK, postValLogs);
  const remainingErrors = postValLogs.filter(l => l.type === 'Error');

  // NOTE: Validation of V1 (0,0,0 coordinate) is generally annoying for synthetic benchmarks rooted at origin.
  // We'll filter V1 out for the "strict" error count.
  const strictErrors = remainingErrors.filter(e => !e.message.includes('[V1]'));

  if (strictErrors.length === 0) {
      console.log(`   ✅ SUCCESS: Zero errors remaining (excluding origin V1 warnings).`);
  } else {
      console.log(`   ❌ FAIL: ${strictErrors.length} errors still present after fixing.`);
      strictErrors.forEach(e => console.log(`      -> ${e.message}`));
  }
}

BM_FILES.forEach(runBenchmark);
