import React from 'react';
import { useAppContext } from '../core/state';

export function DataTableTab() {
  const { state, dispatch } = useAppContext();
  const data = state.dataTable;

  if (!data || data.length === 0) {
    return <div className="text-center p-8 text-gray-500">No data loaded. Please import a file.</div>;
  }

  const getCellClass = (row, field) => {
    let base = "p-1 px-2 border border-gray-200 whitespace-nowrap min-w-[80px] ";
    const type = row.type?.toUpperCase() || "";

    // Dynamic Missing Mandatory Highlighting
    let isMissing = false;

    if (field === 'skey' && !row.skey) {
       // Only a few things don't strictly *need* an SKEY but almost everything else does
       if (!["PIPE", "SUPPORT", "MESSAGE-SQUARE"].includes(type)) {
           isMissing = true;
       }
    }
    if (field === 'bp' && !row.bp && (type === "TEE" || type === "OLET")) {
       isMissing = true;
    }
    if (field === 'cp' && !row.cp && (type === "TEE" || type === "OLET" || type === "REDUCER-CONCENTRIC" || type === "REDUCER-ECCENTRIC")) {
       isMissing = true;
    }
    if (field === 'ca8' && !row.ca?.[8] && (type === "VALVE" || type === "FLANGE")) {
       isMissing = true;
    }
    if (field === 'supportCoor' && !row.supportCoor && type === "SUPPORT") {
       isMissing = true;
    }
    if (field === 'bore' && !row.bore && type !== "MESSAGE-SQUARE") {
       isMissing = true;
    }

    if (isMissing) {
      base += "bg-red-200 border-red-500 animate-pulse "; // Missing Mandatory
    } else if (row._modified && row._modified[field]) {
      base += "bg-amber-100"; // Modified
    } else if (row._logTags?.includes("Calculated") && field !== "type") {
      base += "bg-cyan-100"; // Calculated
    } else if (row._logTags?.includes("Mock")) {
      base += "bg-red-100"; // Mock
    } else if (row._source === "PTE" && row.type === "PIPE" && row._logTags?.includes("Implicit")) {
      base += "bg-purple-100"; // PTE Implicit
    }
    return base;
  };

  const renderCoord = (coord) => {
    if (!coord) return "";
    return `${coord.x?.toFixed(1) || 0}, ${coord.y?.toFixed(1) || 0}, ${coord.z?.toFixed(1) || 0}`;
  };

  return (
    <div className="bg-white p-4 shadow rounded flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">Data Table ({data.length} rows)</h2>

        <div className="flex items-center gap-4">
          <button
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded shadow hover:bg-blue-700 transition"
            onClick={async () => {
              const { runBasicFixes } = await import('../core/validator/basicFixer');
              // Calculate basic stuff: gaps, len1, etc.
              let logs = [];
              const updatedTable = runBasicFixes(data, state.config, logs);
              dispatch({ type: 'SET_DATA_TABLE', payload: updatedTable });
              logs.forEach(l => dispatch({ type: 'ADD_LOG_ENTRY', payload: { ...l, stage: 3 } }));
            }}
          >
            Calculate Missing Geometry
          </button>

          <button
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded shadow hover:bg-indigo-700 transition"
            onClick={async () => {
              const { runValidation } = await import('../core/validator/validator');
              let logs = [];
              runValidation(data, state.config, logs);
              logs.forEach(l => dispatch({ type: 'ADD_LOG_ENTRY', payload: { ...l, stage: 3 } }));
              dispatch({ type: 'SET_SYNTAX_CHECKED', payload: true });
              alert("Syntax Check Complete. Check Stage 3 Logs.");
            }}
          >
            Check data table syntax
          </button>

        <div className="flex space-x-4 text-xs">
          <span className="flex items-center"><span className="w-3 h-3 bg-red-200 border-red-500 border inline-block mr-1"></span> Missing Mandatory</span>
          <span className="flex items-center"><span className="w-3 h-3 bg-amber-100 border inline-block mr-1"></span> Modified</span>
          <span className="flex items-center"><span className="w-3 h-3 bg-cyan-100 border inline-block mr-1"></span> Calculated</span>
          <span className="flex items-center"><span className="w-3 h-3 bg-red-100 border inline-block mr-1"></span> Mock/Assumed</span>
        </div>
        </div>
      </div>

      <div className="overflow-auto border border-gray-300 flex-grow text-xs font-mono">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 sticky top-0 shadow-sm z-10">
            <tr>
              <th className="p-1 px-2 border">#</th>
              <th className="p-1 px-2 border">CSV SEQ NO</th>
              <th className="p-1 px-2 border font-bold">Type</th>
              <th className="p-1 px-2 border">TEXT</th>
              <th className="p-1 px-2 border text-blue-800">Fixing Action</th>
              <th className="p-1 px-2 border">REF NO.</th>
              <th className="p-1 px-2 border">BORE</th>
              <th className="p-1 px-2 border">EP1 (x, y, z)</th>
              <th className="p-1 px-2 border">EP2 (x, y, z)</th>
              <th className="p-1 px-2 border">CP (x, y, z)</th>
              <th className="p-1 px-2 border">BP (x, y, z)</th>
              <th className="p-1 px-2 border">SKEY</th>
              <th className="p-1 px-2 border">SUPPORT_COOR</th>
              <th className="p-1 px-2 border">LEN 1</th>
              <th className="p-1 px-2 border">AXIS 1</th>
              <th className="p-1 px-2 border">AXIS 2</th>
              <th className="p-1 px-2 border">AXIS 3</th>
              <th className="p-1 px-2 border">LEN 2</th>
              <th className="p-1 px-2 border">LEN 3</th>
              <th className="p-1 px-2 border">PIPELINE</th>
              <th className="p-1 px-2 border">BRANCH BORE</th>
              <th className="p-1 px-2 border">SUPPORT_NAME</th>
              <th className="p-1 px-2 border">SUPPORT_GUID</th>
              <th className="p-1 px-2 border">CA1</th>
              <th className="p-1 px-2 border">CA2</th>
              <th className="p-1 px-2 border">CA3</th>
              <th className="p-1 px-2 border">CA4</th>
              <th className="p-1 px-2 border">CA5</th>
              <th className="p-1 px-2 border">CA6</th>
              <th className="p-1 px-2 border">CA7</th>
              <th className="p-1 px-2 border">CA8</th>
              <th className="p-1 px-2 border">CA9</th>
              <th className="p-1 px-2 border">CA10</th>
              <th className="p-1 px-2 border">CA97</th>
              <th className="p-1 px-2 border">CA98</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 group">
                <td className="p-1 px-2 border text-gray-500">{row._rowIndex}</td>
                <td className={getCellClass(row, 'csvSeqNo')}>{row.csvSeqNo}</td>
                <td className={getCellClass(row, 'type') + " font-bold"}>{row.type}</td>
                <td className={getCellClass(row, 'text') + " max-w-[200px] truncate"} title={row.text}>{row.text}</td>

                {/* Smart Fixer Preview Column */}
                <td className="p-1 px-2 border w-48 relative">
                  {row.fixingAction && (
                    <div className={`p-1 text-[10px] rounded leading-tight ${
                        row.fixingActionTier === 1 ? "bg-green-100 text-green-800 border-l-2 border-green-500" :
                        row.fixingActionTier === 2 ? "bg-amber-100 text-amber-800 border-l-2 border-amber-500" :
                        row.fixingActionTier === 3 ? "bg-orange-100 text-orange-800 border-l-2 border-orange-500" :
                        "bg-red-100 text-red-800 border-l-2 border-red-500"
                    }`}>
                      <span className="font-bold">T{row.fixingActionTier} [{row.fixingActionRuleId}]</span><br/>
                      {row.fixingAction}
                    </div>
                  )}
                </td>

                <td className={getCellClass(row, 'refNo')}>{row.refNo}</td>
                <td className={getCellClass(row, 'bore')}>{row.bore}</td>
                <td className={getCellClass(row, 'ep1')}>{renderCoord(row.ep1)}</td>
                <td className={getCellClass(row, 'ep2')}>{renderCoord(row.ep2)}</td>
                <td className={getCellClass(row, 'cp')}>{renderCoord(row.cp)}</td>
                <td className={getCellClass(row, 'bp')}>{renderCoord(row.bp)}</td>
                <td className={getCellClass(row, 'skey')}>{row.skey}</td>
                <td className={getCellClass(row, 'supportCoor')}>{renderCoord(row.supportCoor)}</td>
                <td className={getCellClass(row, 'len1')}>{row.len1?.toFixed(1)}</td>
                <td className={getCellClass(row, 'axis1')}>{row.axis1}</td>
                <td className={getCellClass(row, 'axis2')}>{row.axis2}</td>
                <td className={getCellClass(row, 'axis3')}>{row.axis3}</td>
                <td className={getCellClass(row, 'len2')}>{row.len2?.toFixed(1)}</td>
                <td className={getCellClass(row, 'len3')}>{row.len3?.toFixed(1)}</td>
                <td className={getCellClass(row, 'pipelineRef')}>{row.pipelineRef}</td>
                <td className={getCellClass(row, 'branchBore')}>{row.branchBore}</td>
                <td className={getCellClass(row, 'supportName')}>{row.supportName}</td>
                <td className={getCellClass(row, 'supportGuid')}>{row.supportGuid}</td>
                <td className={getCellClass(row, 'ca1')}>{row.ca?.[1]}</td>
                <td className={getCellClass(row, 'ca2')}>{row.ca?.[2]}</td>
                <td className={getCellClass(row, 'ca3')}>{row.ca?.[3]}</td>
                <td className={getCellClass(row, 'ca4')}>{row.ca?.[4]}</td>
                <td className={getCellClass(row, 'ca5')}>{row.ca?.[5]}</td>
                <td className={getCellClass(row, 'ca6')}>{row.ca?.[6]}</td>
                <td className={getCellClass(row, 'ca7')}>{row.ca?.[7]}</td>
                <td className={getCellClass(row, 'ca8')}>{row.ca?.[8]}</td>
                <td className={getCellClass(row, 'ca9')}>{row.ca?.[9]}</td>
                <td className={getCellClass(row, 'ca10')}>{row.ca?.[10]}</td>
                <td className={getCellClass(row, 'ca97')}>{row.ca?.[97]}</td>
                <td className={getCellClass(row, 'ca98')}>{row.ca?.[98]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
