import React from 'react';
import { useAppContext } from '../core/state';

import { useState, useEffect } from 'react';
import { fuzzyMatchHeader } from '../utils/fuzzy';

export function PreviewModal() {
  const { state, dispatch } = useAppContext();
  const [columnMap, setColumnMap] = useState({});

  const { file, detected, headers, firstRows, fullData, text } = state.previewModal || {};
  const expectedType = state.inputType;

  useEffect(() => {
    if (state.previewModal?.open && headers && headers.length > 0 && expectedType !== 'pcf_text') {
      const initialMap = {};
      const aliases = state.config.columnAliases || {};
      headers.forEach(h => {
        const match = fuzzyMatchHeader(h, aliases);
        if (match) initialMap[h] = match;
      });
      setColumnMap(initialMap);
    }
  }, [state.previewModal?.open, headers, expectedType, state.config.columnAliases]);

  if (!state.previewModal || !state.previewModal.open) return null;

  const expectedColumns = expectedType === 'point_csv' ? [
    'Sequence', 'Type', 'Point', 'PPoint', 'Bore', 'East', 'North', 'Up', 'RefNo', 'Line_Key'
  ] : expectedType === 'element_csv' ? [
    'CSV SEQ NO', 'PIPELINE', 'COMPONENT', 'REF NO.', 'BORE', 'EP1 COORDS', 'EP2 COORDS', 'CP COORDS', 'BP COORDS'
  ] : [];


  const handleConfirm = async () => {
    // Hide modal
    dispatch({ type: 'SET_PREVIEW_MODAL', payload: { open: false, file: null, detected: null, headers: [], firstRows: [], fullData: [], text: null } });

    // Actually run the conversion
    try {
      let logs = [];
      let resultTable = [];

      logs.push({ type: "Info", stage: 1, message: "Starting parse after preview confirmation..." });

      if (expectedType === "pcf_text") {
        const { parsePCFText } = await import('../core/parsers');
        const parseResult = parsePCFText(text);
        resultTable = parseResult.dataTable;
      } else if (expectedType === "point_csv") {
        const { parsePointCSV } = await import('../core/parsers');
        const parseResult = parsePointCSV(fullData, columnMap, state.config);
        resultTable = parseResult;
      } else if (expectedType === "element_csv") {
        const { parseElementCSV } = await import('../core/parsers');
        const parseResult = parseElementCSV(fullData, columnMap);
        resultTable = parseResult;
        logs.push({ type: "Info", stage: 2, message: `Parsed element CSV containing ${resultTable.length} rows.` });
      }

      dispatch({ type: 'SET_DATA_TABLE', payload: resultTable });
      logs.forEach(l => dispatch({ type: 'ADD_LOG_ENTRY', payload: l }));
      logs.push({ type: "Info", stage: 1, message: "Parse complete. Data table populated." });
    } catch (e) {
      alert(`Error during processing: ${e.message}`);
    }
  };

  const handleCancel = () => {
    dispatch({ type: 'SET_PREVIEW_MODAL', payload: { open: false, file: null, detected: null, headers: [], firstRows: [], fullData: [], text: null } });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-3/4 max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 className="text-lg font-bold">Import Preview</h2>
          <button onClick={handleCancel} className="text-gray-500 hover:text-black">✕</button>
        </div>

        <div className="p-6 overflow-auto flex-grow text-sm">
          <div className="mb-4">
            <p><strong>File:</strong> {file?.name}</p>
            <p><strong>Detected:</strong> {detected}</p>
            {expectedType !== detected && detected !== "unknown" && (
              <p className="text-amber-600 font-bold mt-1">
                ⚠️ Warning: You selected "{expectedType}", but the file appears to be "{detected}".
              </p>
            )}
            {headers && headers.length > 0 && (
              <p><strong>Columns:</strong> {headers.length}</p>
            )}
          </div>

          {headers && headers.length > 0 && expectedType !== 'pcf_text' && (
            <div className="mb-6">
              <h3 className="font-bold border-b pb-1 mb-2">Expected columns</h3>
              <div className="overflow-x-auto pb-2 border rounded border-gray-300">
                <div className="flex p-2 gap-2 w-max">
                   {expectedColumns.map((ec, i) => (
                     <div key={i} className="border rounded bg-gray-50 p-2 text-center text-xs min-w-[100px] shadow-sm font-semibold whitespace-nowrap">
                       {ec}
                     </div>
                   ))}
                </div>
              </div>
            </div>
          )}

          {firstRows && firstRows.length > 0 && (
            <div>
              <h3 className="font-bold border-b pb-1 mb-2">First 10 rows preview:</h3>
              <div className="overflow-x-auto border rounded max-h-64">
                {expectedType === "pcf_text" ? (
                  <pre className="text-[10px] bg-gray-800 text-gray-200 p-2 m-0 whitespace-pre-wrap">
                    {firstRows.slice(0, 20).join('\n')}
                  </pre>
                ) : (
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-gray-100">
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i} className="p-2 border align-top min-w-[120px] max-w-[200px]" style={{width: `${100/headers.length}%`}}>
                             <div className="font-bold text-gray-700 truncate mb-1" title={h}>{h}</div>
                             <select
                               className="w-full border rounded p-1 text-[10px] bg-white font-sans font-semibold text-blue-600 shadow-sm"
                               value={columnMap[h] || ""}
                               onChange={(e) => setColumnMap({...columnMap, [h]: e.target.value})}
                             >
                                <option value="">(unmapped)</option>
                                {expectedColumns.map(ec => (
                                  <option key={ec} value={ec}>{ec}</option>
                                ))}
                             </select>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {firstRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {headers.map((h, j) => (
                            <td key={j} className="p-1 px-2 border truncate max-w-[200px]">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
}
