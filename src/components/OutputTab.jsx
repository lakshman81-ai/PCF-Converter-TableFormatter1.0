import { useAppContext } from '../core/state';
import { useState, useEffect } from 'react';

export function OutputTab() {
  const { state } = useAppContext();
  const [pcfText, setPcfText] = useState("");

  useEffect(() => {
    async function loadGenerator() {
      if (state.dataTable && state.dataTable.length > 0) {
        const { generatePcf } = await import('../core/export/pcfGenerator');
        setPcfText(generatePcf(state.dataTable, state.config));
      }
    }
    loadGenerator();
  }, [state.dataTable, state.config]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pcfText);
    alert("Copied to clipboard!");
  };

  if (!state.dataTable || state.dataTable.length === 0) {
    return <div className="text-center p-8 text-gray-500">No data available for PCF output.</div>;
  }

  return (
    <div className="bg-white p-4 shadow rounded flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">Generated PCF Output</h2>
        <button
          onClick={copyToClipboard}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-mono border"
        >
          📋 Copy
        </button>
      </div>

      <div className="flex-grow overflow-auto bg-gray-50 p-4 border border-gray-300 rounded font-mono text-sm whitespace-pre" style={{ tabSize: 4 }}>
        {pcfText}
      </div>
    </div>
  );
}
