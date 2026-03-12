import { useState } from 'react';
import { useAppContext } from '../core/state';
import { downloadSessionLog } from '../utils/logger';

export function DebugTab() {
  const { state } = useAppContext();
  const [activeStage, setActiveStage] = useState(1);
  const [rowFilter, setRowFilter] = useState('');
  const [refFilter, setRefFilter] = useState('');

  // Add some tally info
  const tally = {
    totalRows: state.dataTable.length,
    pipeCount: state.dataTable.filter(r => r.type === "PIPE").length,
    pipeLengthMeters: (state.dataTable.filter(r => r.type === "PIPE").reduce((acc, curr) => acc + (curr.len1 || curr.len2 || curr.len3 || 0), 0) / 1000).toFixed(1),
    flangeCount: state.dataTable.filter(r => r.type === "FLANGE").length,
    valveCount: state.dataTable.filter(r => r.type === "VALVE").length,
    supportCount: state.dataTable.filter(r => r.type === "SUPPORT").length,
  };

  const getStageLogs = (stage) => {
    return state.log.filter(l => {
        const matchesStage = l.stage === stage || (!l.stage && stage === 1); // Default unmapped logs to stage 1 for visibility
        const matchesRow = rowFilter ? String(l.row) === rowFilter || l.message.includes(`Row ${rowFilter}`) || l.message.includes(`Seq ${rowFilter}`) : true;
        const matchesRef = refFilter ? l.message.includes(refFilter) || (l.tags && l.tags.includes(refFilter)) : true;
        return matchesStage && matchesRow && matchesRef;
    });
  };

  return (
    <div className="bg-white p-4 shadow rounded flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">System Logs & Debug</h2>
        <div className="flex gap-4">
           <input
             type="text"
             placeholder="Filter by Row Index..."
             className="border rounded px-2 text-sm"
             value={rowFilter}
             onChange={(e) => setRowFilter(e.target.value)}
           />
           <input
             type="text"
             placeholder="Filter by Ref No..."
             className="border rounded px-2 text-sm"
             value={refFilter}
             onChange={(e) => setRefFilter(e.target.value)}
           />
           <button
             onClick={() => downloadSessionLog(state.log, "Session")}
             className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-mono border"
           >
             ⬇️ Download Session Log (.md)
           </button>
        </div>
      </div>

      <div className="flex gap-6 mb-4">
        <div className="w-full bg-gray-50 border rounded p-3 flex justify-between">
          <div>
            <h3 className="font-bold border-b pb-1 mb-2 text-sm">Component Tally</h3>
            <ul className="text-xs font-mono space-x-4 flex">
              <li>Total Elements: {tally.totalRows}</li>
              <li>PIPE: {tally.pipeCount} ({tally.pipeLengthMeters}m)</li>
              <li>FLANGE: {tally.flangeCount}</li>
              <li>VALVE: {tally.valveCount}</li>
              <li>SUPPORT: {tally.supportCount}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex border-b mb-4">
        {[
          { id: 1, label: "Stage 1: Ingestion & PTE" },
          { id: 2, label: "Stage 2: Parsing & Population" },
          { id: 3, label: "Stage 3: Formatting & Validation" },
          { id: 4, label: "Stage 4: PCF Export" }
        ].map(stage => (
           <button
             key={stage.id}
             className={`px-4 py-2 font-bold text-sm ${activeStage === stage.id ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-black'}`}
             onClick={() => setActiveStage(stage.id)}
           >
             {stage.label}
           </button>
        ))}
      </div>

      <div className="flex-grow overflow-hidden flex flex-col">
        <LogWindow
          title={`Logs for Stage ${activeStage}`}
          logs={getStageLogs(activeStage)}
          defaultFilter="All"
        />
      </div>
    </div>
  );
}

function LogWindow({ title, logs, defaultFilter = "All", className = "" }) {
  const [filter, setFilter] = useState(defaultFilter);
  const filteredLogs = logs.filter(entry => filter === 'All' || entry.type === filter || (filter === 'Applied' && entry.type === 'Fix'));

  return (
    <div className={`flex flex-col border rounded overflow-hidden shadow-sm min-h-[30rem] h-full ${className}`}>
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
             {entry.row && <span className="text-blue-400 w-16 flex-shrink-0">Row:{entry.row}</span>}
             <span className="text-gray-300 ml-1 whitespace-pre-wrap">{entry.message}</span>
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div className="text-gray-600 italic mt-4 text-center">No logs matching filters...</div>
        )}
      </div>
    </div>
  );
}
