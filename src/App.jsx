import { useAppContext } from './core/state';
import { DevTab } from './components/DevTab';
import { DataTableTab } from './components/DataTableTab';
import { DebugTab } from './components/DebugTab';
import { ConfigTab } from './components/ConfigTab';
import { OutputTab } from './components/OutputTab';
import { PreviewModal } from './components/PreviewModal';

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
          <span className="text-xs text-gray-500">Ver 10-03-2025 (1)</span>
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
                    <div className="space-x-2">
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
                        <button
                          className="px-4 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm font-bold"
                          onClick={async () => {
                             try {
                               const { default: BM_DATA } = await import('./tests/benchmark_data.json', { with: { type: "json" } });
                               // Get all element CSV tests
                               // Let the user pick from all benchmark tests, since they don't all have Sequence/CSV SEQ NO keys natively anymore.
                               // They use the internal data model schema now.
                               const mockTests = BM_DATA.filter(b => b.input?.length > 0);

                               if (mockTests.length === 0) {
                                  alert("No mock data tests found.");
                                  return;
                               }

                               // Simple browser prompt to pick which BM to load
                               const testNames = mockTests.map((b, i) => `${i+1}: ${b.id} - ${b.description}`).join('\n');
                               const selection = window.prompt(`Which Benchmark Data to load?\nEnter a number (1-${mockTests.length}):\n\n${testNames}`);

                               if (!selection) return; // Cancelled

                               const idx = parseInt(selection) - 1;
                               if (isNaN(idx) || idx < 0 || idx >= mockTests.length) {
                                  alert("Invalid selection.");
                                  return;
                               }

                               const mockTest = mockTests[idx];
                               const dataTable = mockTest.input; // Benchmarks already store data as the parsed dataTable schema

                               dispatch({ type: 'SET_DATA_TABLE', payload: dataTable });
                               dispatch({ type: 'ADD_LOG_ENTRY', payload: { type: "Info", stage: 2, message: `Mock JSON explicitly loaded for test ${mockTest.id}. Loaded ${dataTable.length} rows.` } });
                             } catch (e) {
                               alert("Failed to load Mock JSON: " + e.message);
                             }
                          }}
                        >
                          Load Mock JSON (from BM)
                        </button>
                    </div>
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
         <div className="text-gray-600 flex items-center gap-4">
           <span>Ready.</span>
           <span className="text-xs text-gray-400">Ver 10-03-2025 time 11.00</span>
         </div>
         <div className="space-x-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={!state.dataTable || state.dataTable.length === 0 || !state.syntaxChecked}
              onClick={async () => {
                const { exportToExcel } = await import('./core/export/excelExport');
                exportToExcel(state.dataTable);
              }}
              title={!state.syntaxChecked ? "Please click 'Check data table syntax' before exporting." : ""}
            >
              Export Data Table ↓
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              disabled={!state.dataTable || state.dataTable.length === 0 || !state.syntaxChecked}
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
         </div>
      </footer>
    </div>
  );
}

export default App;
