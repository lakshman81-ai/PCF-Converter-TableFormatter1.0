import React from 'react';
import { useAppContext } from '../core/state';

export function PreviewModal() {
  const { state, dispatch } = useAppContext();

  if (!state.previewModal || !state.previewModal.open) return null;

  const { file, detected, headers, firstRows, text } = state.previewModal;
  const expectedType = state.inputType;

  const handleConfirm = async () => {
    // Hide modal
    dispatch({ type: 'SET_PREVIEW_MODAL', payload: { open: false, file: null, detected: null, headers: [], firstRows: [], text: null } });

    // Actually run the conversion
    try {
      let logs = [];
      let resultTable = [];

      logs.push({ type: "Info", message: "Starting parse after preview confirmation..." });

      if (expectedType === "pcf_text") {
        const { parsePCFText } = await import('../core/parsers');
        const parseResult = parsePCFText(text);
        resultTable = parseResult.dataTable;
      } else if (expectedType === "point_csv") {
        const { parsePointCSV } = await import('../core/parsers');
        const parseResult = parsePointCSV(firstRows, state.config, logs);
        resultTable = parseResult;
      } else if (expectedType === "element_csv") {
        const { parseElementCSV } = await import('../core/parsers');
        const parseResult = parseElementCSV(firstRows, state.config, logs);
        resultTable = parseResult;
      }

      dispatch({ type: 'SET_DATA_TABLE', payload: resultTable });
      logs.forEach(l => dispatch({ type: 'ADD_LOG_ENTRY', payload: l }));
      logs.push({ type: "Info", message: "Parse complete. Data table populated." });
    } catch (e) {
      alert(`Error during processing: ${e.message}`);
    }
  };

  const handleCancel = () => {
    dispatch({ type: 'SET_PREVIEW_MODAL', payload: { open: false, file: null, detected: null, headers: [], firstRows: [], text: null } });
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

          {headers && headers.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold border-b pb-1 mb-2">Column Mapping (Preview)</h3>
              <p className="text-gray-500 text-xs mb-2">Internal parser maps automatically. First 5 mapped columns:</p>
              <div className="flex gap-2 flex-wrap">
                {headers.slice(0, 10).map((h, i) => (
                  <span key={i} className="bg-gray-100 px-2 py-1 rounded border text-xs">{h}</span>
                ))}
                {headers.length > 10 && <span className="text-xs text-gray-500">...and {headers.length - 10} more</span>}
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
                          <th key={i} className="p-1 border truncate max-w-[150px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {firstRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {headers.map((h, j) => (
                            <td key={j} className="p-1 border truncate max-w-[150px]">{row[h]}</td>
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
