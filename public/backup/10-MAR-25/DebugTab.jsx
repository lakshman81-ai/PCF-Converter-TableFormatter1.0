import { useState } from 'react';
import { useAppContext } from '../core/state';
import { downloadSessionLog } from '../utils/logger';

export function DebugTab() {
  const { state } = useAppContext();

  // Add some tally info
  const tally = {
    totalRows: state.dataTable.length,
    pipeCount: state.dataTable.filter(r => r.type === "PIPE").length,
    pipeLengthMeters: (state.dataTable.filter(r => r.type === "PIPE").reduce((acc, curr) => acc + (curr.len1 || curr.len2 || curr.len3 || 0), 0) / 1000).toFixed(1),
    flangeCount: state.dataTable.filter(r => r.type === "FLANGE").length,
    valveCount: state.dataTable.filter(r => r.type === "VALVE").length,
    supportCount: state.dataTable.filter(r => r.type === "SUPPORT").length,
  };

  return (
    <div className="bg-white p-4 shadow rounded flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">System Logs & Debug</h2>
        <button
          onClick={() => downloadSessionLog(state.log, "Session")}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-mono border"
        >
          ⬇️ Download Session Log (.md)
        </button>
      </div>

      <div className="flex gap-6 mb-6">
        <div className="w-1/3 bg-gray-50 border rounded p-3">
          <h3 className="font-bold border-b pb-1 mb-2 text-sm">Component Tally</h3>
          <ul className="text-xs font-mono space-y-1">
            <li>Total Elements: {tally.totalRows}</li>
            <li>PIPE: {tally.pipeCount} ({tally.pipeLengthMeters}m)</li>
            <li>FLANGE: {tally.flangeCount}</li>
            <li>VALVE: {tally.valveCount}</li>
            <li>SUPPORT: {tally.supportCount}</li>
          </ul>
        </div>

        {state.smartFix.chainSummary && (
          <div className="w-1/3 bg-blue-50 border border-blue-200 rounded p-3">
            <h3 className="font-bold border-b border-blue-200 pb-1 mb-2 text-sm">Smart Fix Summary</h3>
            <ul className="text-xs font-mono space-y-1">
              <li>Chains found: {state.smartFix.chainSummary.chainCount}</li>
              <li>Orphans: {state.smartFix.chainSummary.orphanCount}</li>
              <li className="text-green-700">Tier 1 fixes: {state.smartFix.chainSummary.tier1}</li>
              <li className="text-amber-700">Tier 2 fixes: {state.smartFix.chainSummary.tier2}</li>
              <li className="text-orange-700">Tier 3 warnings: {state.smartFix.chainSummary.tier3}</li>
              <li className="text-red-700">Tier 4 errors: {state.smartFix.chainSummary.tier4}</li>
            </ul>
          </div>
        )}
      </div>

      <div className="flex-grow grid grid-cols-2 gap-4 h-full overflow-hidden">

        {/* Window 1: Data Table Generation & Basic Fixer Logs */}
        <LogWindow
          title="1. Data Table & Basic Fixes"
          logs={state.log.filter(l => ["Info", "Calculated", "Mock", "Warning"].includes(l.type) && !l.ruleId?.startsWith("R-") && !l.ruleId?.startsWith("V"))}
        />

        {/* Window 2: Validation Results */}
        <LogWindow
          title="2. Validator (V1-V20)"
          logs={state.log.filter(l => l.ruleId?.startsWith("V") || l.message?.includes("Validator"))}
          defaultFilter="Error"
        />

        {/* Window 3: Smart Fixer (Engine & Rules) */}
        <LogWindow
          title="3. Smart Fixer (R-GEO...R-AGG)"
          logs={state.log.filter(l => l.ruleId?.startsWith("R-") && !l.ruleId?.startsWith("R-PTE"))}
          defaultFilter="Error"
        />

        {/* Window 4: Fix Applied / Data Changes */}
        <LogWindow
          title="4. Fixes Applied (Data changes)"
          logs={state.log.filter(l => ["Fix", "Applied"].includes(l.type) || l.message?.includes("Applied"))}
        />

        {/* Window 5: PTE & PCF Actions */}
        <LogWindow
          title="5. PTE / Export Activity"
          logs={state.log.filter(l => l.ruleId?.startsWith("R-PTE") || l.message?.includes("PCF") || l.message?.includes("PTE") || l.message?.includes("Export"))}
          className="col-span-2"
        />

      </div>
    </div>
  );
}

function LogWindow({ title, logs, defaultFilter = "All", className = "" }) {
  const [filter, setFilter] = useState(defaultFilter);
  const filteredLogs = logs.filter(entry => filter === 'All' || entry.type === filter || (filter === 'Applied' && entry.type === 'Fix'));

  return (
    <div className={`flex flex-col border rounded overflow-hidden shadow-sm h-48 md:h-64 lg:h-full ${className}`}>
      <div className="bg-gray-100 border-b p-2 flex justify-between items-center">
        <h3 className="font-bold text-sm text-gray-800">{title} ({filteredLogs.length})</h3>
        <select
          className="text-xs border rounded p-1"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["All", "Error", "Warning", "Calculated", "Mock", "Info", "Applied", "PTE"].map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
      <div className="flex-grow overflow-auto bg-gray-900 p-2 text-xs font-mono">
        {filteredLogs.map((entry, idx) => (
          <div key={idx} className="mb-1 flex">
             <span className="text-gray-500 w-12 flex-shrink-0">{new Date(entry.timestamp || 0).toLocaleTimeString().slice(0,5)}</span>
             <span className={`w-14 flex-shrink-0 font-bold ${
                entry.type === "Error" ? "text-red-400" :
                entry.type === "Warning" ? "text-yellow-400" :
                entry.type === "Applied" ? "text-green-400" :
                entry.type === "Fix" ? "text-blue-400" :
                "text-gray-300"
             }`}>[{entry.type}]</span>
             {entry.ruleId && <span className="text-gray-400 w-20 flex-shrink-0">{entry.ruleId}</span>}
             <span className="text-gray-300 ml-1 whitespace-pre-wrap">{entry.message}</span>
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div className="text-gray-600 italic mt-4 text-center">No logs...</div>
        )}
      </div>
    </div>
  );
}
