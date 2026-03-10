import React from 'react';
import { useAppContext } from '../core/state';

export function DataTableTab() {
  const { state } = useAppContext();
  const data = state.dataTable;

  if (!data || data.length === 0) {
    return <div className="text-center p-8 text-gray-500">No data loaded. Please import a file.</div>;
  }

  const getCellClass = (row, field) => {
    let base = "p-1 px-2 border border-gray-200 whitespace-nowrap min-w-[80px] ";
    if (row._modified && row._modified[field]) {
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
        <div className="flex space-x-4 text-xs">
          <span className="flex items-center"><span className="w-3 h-3 bg-amber-100 border inline-block mr-1"></span> Modified</span>
          <span className="flex items-center"><span className="w-3 h-3 bg-cyan-100 border inline-block mr-1"></span> Calculated</span>
          <span className="flex items-center"><span className="w-3 h-3 bg-red-100 border inline-block mr-1"></span> Mock/Assumed</span>
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
              {/* Skipping full 42 for brevity, showing critical ones */}
              <th className="p-1 px-2 border">CA1 (Press)</th>
              <th className="p-1 px-2 border">CA3 (Mat)</th>
              <th className="p-1 px-2 border">CA8 (Wt)</th>
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
                <td className={getCellClass(row, 'ca1')}>{row.ca?.[1]}</td>
                <td className={getCellClass(row, 'ca3')}>{row.ca?.[3]}</td>
                <td className={getCellClass(row, 'ca8')}>{row.ca?.[8]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
