import { useAppContext } from './core/state';
import { DevTab } from './components/DevTab';
import { DataTableTab } from './components/DataTableTab';
import { DebugTab } from './components/DebugTab';
import { ConfigTab } from './components/ConfigTab';
import { OutputTab } from './components/OutputTab';
import { PreviewModal } from './components/PreviewModal';
import { runBasicFixes, runValidation } from './core/validator';

function App() {
  const { state, dispatch } = useAppContext();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative inline-block">
            <select
              className="border p-2 rounded bg-white text-sm"
              value=""
              onChange={(e) => {
                const type = e.target.value;
                if (!type) return;
                dispatch({ type: 'SET_INPUT_TYPE', payload: type });
                // Trigger file input
                document.getElementById('file-upload').click();
              }}
            >
              <option value="" disabled>Import ▼</option>
              <option value="point_csv">Import Point CSV/Excel</option>
              <option value="element_csv">Import Element CSV/Excel</option>
              <option value="pcf_text">Import PCF Text</option>
            </select>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".pcf,.txt,.csv,.xlsx,.xls"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file || !state.inputType) return;

                const { processFile } = await import('./utils/fileHandler');
                let logs = [];
                try {
                  dispatch({ type: 'SET_ACTIVE_TAB', payload: 'datatable' });
                  await processFile(file, state.inputType, state.config, dispatch, logs);
                  logs.forEach(l => dispatch({ type: 'ADD_LOG_ENTRY', payload: l }));
                  // reset input so same file can be selected again
                  e.target.value = null;
                } catch (err) {
                  alert(`Import failed: ${err.message}`);
                }
              }}
            />
          </div>
          <h1 className="text-xl font-bold">PCF Validator, Fixer & Converter v2.0</h1>
        </div>
        <div>
          <span className="text-xs text-gray-500">Ver 10-03-2026 (1)</span>
          <button
            className="ml-4 px-2 py-1 bg-gray-200 rounded text-xs"
            onClick={() => dispatch({ type: 'TOGGLE_DEV_MODE' })}
          >
            Dev 🔧
          </button>
        </div>
      </header>

      <div className="bg-gray-200 px-6 py-2 flex space-x-2 border-b text-sm">
        <button
          className={`px-4 py-1 rounded-t ${state.activeTab === 'datatable' ? 'bg-white font-bold border-t border-l border-r' : 'hover:bg-gray-300'}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'datatable' })}
        >Data Table</button>
        <button
          className={`px-4 py-1 rounded-t ${state.activeTab === 'config' ? 'bg-white font-bold border-t border-l border-r' : 'hover:bg-gray-300'}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'config' })}
        >Config</button>
        <button
          className={`px-4 py-1 rounded-t ${state.activeTab === 'debug' ? 'bg-white font-bold border-t border-l border-r' : 'hover:bg-gray-300'}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'debug' })}
        >Debug</button>
        <button
          className={`px-4 py-1 rounded-t ${state.activeTab === 'output' ? 'bg-white font-bold border-t border-l border-r' : 'hover:bg-gray-300'}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'output' })}
        >Output</button>
        {state.devMode && (
          <button
            className={`px-4 py-1 rounded-t ml-auto bg-blue-100 ${state.activeTab === 'dev' ? 'bg-blue-200 font-bold border-t border-l border-r border-blue-300' : 'hover:bg-blue-200'}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'dev' })}
          >Dev 🔧</button>
        )}
      </div>

      <main className="flex-grow p-6 overflow-hidden relative">
        <PreviewModal />
        <div className="h-full">
          {state.activeTab === 'datatable' && (
             <div className="h-full flex flex-col gap-4">
                 <div className="bg-white rounded shadow p-4 flex justify-between items-center shrink-0">
                    <span className="text-gray-500">Shell UI Loaded. Input: {state.inputType || 'None'}</span>
                    <button
                      className="px-4 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-bold"
                      onClick={async () => {
                         const { BENCHMARK_PCF_SMALL } = await import('./tests/mockData');
                         const { parsePCFText } = await import('./core/parsers');
                         try {
                           const result = parsePCFText(BENCHMARK_PCF_SMALL);
                           dispatch({ type: 'SET_DATA_TABLE', payload: result.dataTable });
                         } catch (e) {
                           alert("Parse failed: " + e.message);
                         }
                      }}
                    >
                      Load Mock PCF
                    </button>
                 </div>
                 <div className="flex-grow min-h-0">
                    <DataTableTab />
                 </div>
               </div>
            )}
          {state.activeTab === 'config' && <ConfigTab />}
          {state.activeTab === 'debug' && <DebugTab />}
          {state.activeTab === 'output' && <OutputTab />}
          {state.activeTab === 'dev' && state.devMode && <DevTab />}
        </div>
      </main>

      <footer className="bg-gray-100 p-4 border-t flex justify-between items-center text-sm">
         <div className="text-gray-600">
           Ready.
         </div>
         <div className="space-x-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={!state.dataTable || state.dataTable.length === 0}
              onClick={async () => {
                const { exportToExcel } = await import('./core/export/excelExport');
                exportToExcel(state.dataTable);
              }}
            >
              Export Data Table ↓
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              disabled={!state.dataTable || state.dataTable.length === 0}
              onClick={async () => {
                const { generatePcf } = await import('./core/export/pcfGenerator');
                const text = generatePcf(state.dataTable, state.config);
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Exported_${new Date().toISOString().slice(0, 10)}.pcf`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export PCF ↓
            </button>
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              disabled={!state.dataTable || state.dataTable.length === 0}
              onClick={() => {
                 let logs = [];
                 let fixedTable = runBasicFixes(state.dataTable, state.config, logs);
                 let vResults = runValidation(fixedTable, state.config, logs);
                 dispatch({ type: 'SET_DATA_TABLE', payload: fixedTable });
                 // Usually dispatch logs too, but keeping simple for now
                 alert(`Validation ran. Found ${vResults.length} issues.`);
              }}
            >
              Run Validator ▶
            </button>
            <button
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              disabled={!state.dataTable || state.dataTable.length === 0 || state.smartFix.status === "running"}
              onClick={async () => {
                dispatch({ type: "SET_SMART_FIX_STATUS", payload: "running" });
                const { runSmartFix } = await import('./core/smartFixer');
                let logs = [];
                const result = runSmartFix(state.dataTable, state.config, logs);
                dispatch({ type: 'SET_DATA_TABLE', payload: result.previewedTable });
                dispatch({ type: "SMART_FIX_COMPLETE", payload: result });
              }}
            >
              {state.smartFix.status === "running" ? "Analyzing..." : "Smart Fix 🔧"}
            </button>
            <button
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
              disabled={state.smartFix.status !== "previewing"}
              onClick={async () => {
                dispatch({ type: "SET_SMART_FIX_STATUS", payload: "applying" });
                const { executeFixes } = await import('./core/smartFixer');
                let logs = [];

                // 1. Apply Tier 1 & 2 fixes
                const fixResult = executeFixes(state.dataTable, state.smartFix.chains, state.config, logs);

                // 2. Re-run Steps 5-13 (Basic fixer handles derived fields right now)
                const recalcTable = runBasicFixes(fixResult.updatedTable, state.config, logs);
                const finalValidation = runValidation(recalcTable, state.config, logs);

                dispatch({ type: 'SET_DATA_TABLE', payload: recalcTable });
                dispatch({ type: 'SET_SMART_FIX_STATUS', payload: "applied" });
                alert(`Applied ${fixResult.applied.length} fixes. Re-validation found ${finalValidation.length} remaining issues.`);
              }}
            >
              {state.smartFix.status === "applying" ? "Applying..." : "Apply Fixes ✓"}
            </button>
         </div>
      </footer>
    </div>
  );
}

export default App;
