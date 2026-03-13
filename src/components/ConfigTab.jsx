import { useAppContext } from '../core/state';

export function ConfigTab() {
  const { state, dispatch } = useAppContext();

  const handleConfigChange = (section, field, value) => {
    dispatch({
      type: 'SET_CONFIG',
      payload: {
        [section]: {
          ...state.config[section],
          [field]: value
        }
      }
    });
  };

  return (
    <div className="bg-white p-6 shadow rounded flex flex-col h-full overflow-auto">
      <h2 className="font-bold text-xl mb-6 border-b pb-2">Configuration Settings</h2>

      <div className="space-y-8 max-w-5xl">

        {/* Top Toggles based on Image */}
        <div className="flex space-x-8 mb-6 p-4 bg-blue-50 border border-blue-100 rounded">
          <label className="flex items-center space-x-2 font-semibold text-sm text-blue-900">
            <input
              type="checkbox"
              className="form-checkbox text-blue-600"
              checked={state.config.pte?.autoMultiPass || true}
              onChange={(e) => handleConfigChange('pte', 'autoMultiPass', e.target.checked)}
            />
            <span>Auto Multi-Pass Mode</span>
          </label>
          <label className="flex items-center space-x-2 font-semibold text-sm text-blue-900">
            <input
              type="checkbox"
              className="form-checkbox text-blue-600"
              checked={state.config.pte?.sequentialData !== false}
              onChange={(e) => handleConfigChange('pte', 'sequentialData', e.target.checked)}
            />
            <span>Sequential Walk ON</span>
          </label>
          <label className="flex items-center space-x-2 font-semibold text-sm text-blue-900">
            <input
              type="checkbox"
              className="form-checkbox text-blue-600"
              checked={state.config.pte?.lineKeyEnabled !== false}
              onChange={(e) => handleConfigChange('pte', 'lineKeyEnabled', e.target.checked)}
            />
            <span>Line_Key Constraints (if available) ON</span>
          </label>
        </div>

        {/* Line Key Config */}
        <div className="flex items-center space-x-4 mb-6 border-b pb-6">
           <label className="font-semibold text-sm text-gray-700 w-48">Line_Key Target Column:</label>
           <select
              className="border p-1.5 rounded w-64 text-sm"
              value={state.config.pte?.lineKeyTarget || "PIPELINE-REFERENCE"}
              onChange={(e) => handleConfigChange('pte', 'lineKeyTarget', e.target.value)}
           >
              <option value="PIPELINE-REFERENCE">PIPELINE-REFERENCE</option>
              <option value="LINE-NUMBER">LINE-NUMBER</option>
           </select>
           <span className="text-xs text-gray-500 italic">Determines the boundary for multi-pass segment logic.</span>
        </div>

        {/* Row 1: Bore and Sweep Configs */}
        <div className="grid grid-cols-4 gap-6 mb-8">
           <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Bore Ratio Min</label>
              <input
                 type="number" step="0.1"
                 className="w-full border p-1.5 rounded text-sm"
                 value={state.config.pte?.boreRatioMin || 0.7}
                 onChange={(e) => handleConfigChange('pte', 'boreRatioMin', parseFloat(e.target.value))}
              />
           </div>
           <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Bore Ratio Max</label>
              <input
                 type="number" step="0.1"
                 className="w-full border p-1.5 rounded text-sm"
                 value={state.config.pte?.boreRatioMax || 1.5}
                 onChange={(e) => handleConfigChange('pte', 'boreRatioMax', parseFloat(e.target.value))}
              />
           </div>
           <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sweep Radii Min (xNB)</label>
              <input
                 type="number" step="0.1"
                 className="w-full border p-1.5 rounded text-sm"
                 value={state.config.pte?.sweepRadiiMin || 0.2}
                 onChange={(e) => handleConfigChange('pte', 'sweepRadiiMin', parseFloat(e.target.value))}
              />
           </div>
           <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sweep Radii Max (mm)</label>
              <input
                 type="number" step="10"
                 className="w-full border p-1.5 rounded text-sm"
                 value={state.config.pte?.sweepRadiiMax || 13000}
                 onChange={(e) => handleConfigChange('pte', 'sweepRadiiMax', parseFloat(e.target.value))}
              />
           </div>
        </div>

        {/* Bottom 3 Columns */}
        <div className="grid grid-cols-3 gap-6">
           {/* Col 1 */}
           <div className="border rounded p-4 shadow-sm bg-gray-50">
              <h4 className="font-bold text-blue-900 mb-4 text-sm border-b pb-2">Geometry Thresholds (mm)</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Micro-Pipe Deletion</span>
                    <input type="number" className="w-20 border p-1 text-right text-sm rounded"
                       value={state.config.pte?.microPipeDeletion || 6}
                       onChange={(e) => handleConfigChange('pte', 'microPipeDeletion', parseFloat(e.target.value))} />
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Micro-Fitting Warning</span>
                    <input type="number" className="w-20 border p-1 text-right text-sm rounded"
                       value={state.config.pte?.microFittingWarning || 1}
                       onChange={(e) => handleConfigChange('pte', 'microFittingWarning', parseFloat(e.target.value))} />
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Off-Axis Snapping</span>
                    <input type="number" className="w-20 border p-1 text-right text-sm rounded"
                       value={state.config.pte?.offAxisSnapping || 2}
                       onChange={(e) => handleConfigChange('pte', 'offAxisSnapping', parseFloat(e.target.value))} />
                 </div>
              </div>
           </div>

           {/* Col 2 */}
           <div className="border rounded p-4 shadow-sm bg-gray-50">
              <h4 className="font-bold text-blue-900 mb-4 text-sm border-b pb-2">Gap & Overlap Limits (mm)</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Silent Snap Micro-Gap</span>
                    <input type="number" className="w-20 border p-1 text-right text-sm rounded"
                       value={state.config.pte?.silentSnapMicroGap || 1}
                       onChange={(e) => handleConfigChange('pte', 'silentSnapMicroGap', parseFloat(e.target.value))} />
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Auto-Fill Pipe Max Gap</span>
                    <input type="number" className="w-20 border p-1 text-right text-sm rounded"
                       value={state.config.pte?.autoFillPipeMaxGap || 25}
                       onChange={(e) => handleConfigChange('pte', 'autoFillPipeMaxGap', parseFloat(e.target.value))} />
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Auto-Trim Max Overlap</span>
                    <input type="number" className="w-20 border p-1 text-right text-sm rounded"
                       value={state.config.pte?.autoTrimMaxOverlap || 25}
                       onChange={(e) => handleConfigChange('pte', 'autoTrimMaxOverlap', parseFloat(e.target.value))} />
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Gap Review Warning</span>
                    <input type="number" className="w-20 border p-1 text-right text-sm rounded"
                       value={state.config.pte?.gapReviewWarning || 100}
                       onChange={(e) => handleConfigChange('pte', 'gapReviewWarning', parseFloat(e.target.value))} />
                 </div>
              </div>
           </div>

           {/* Col 3 */}
           <div className="border rounded p-4 shadow-sm bg-gray-50">
              <h4 className="font-bold text-blue-900 mb-4 text-sm border-b pb-2">Topological Rules</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Route Closure Warning (mm)</span>
                    <input type="number" className="w-20 border p-1 text-right text-sm rounded"
                       value={state.config.pte?.routeClosureWarning || 5}
                       onChange={(e) => handleConfigChange('pte', 'routeClosureWarning', parseFloat(e.target.value))} />
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Route Closure Error (mm)</span>
                    <input type="number" className="w-20 border p-1 text-right text-sm rounded"
                       value={state.config.pte?.routeClosureError || 50}
                       onChange={(e) => handleConfigChange('pte', 'routeClosureError', parseFloat(e.target.value))} />
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">OLET Max Branch Ratio</span>
                    <input type="number" step="0.1" className="w-20 border p-1 text-right text-sm rounded"
                       value={state.config.pte?.oletMaxBranchRatio || 0.8}
                       onChange={(e) => handleConfigChange('pte', 'oletMaxBranchRatio', parseFloat(e.target.value))} />
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Connection Tolerance (mm)</span>
                    <input type="number" className="w-20 border p-1 text-right text-sm rounded"
                       value={state.config.pte?.connectionTolerance || 25}
                       onChange={(e) => handleConfigChange('pte', 'connectionTolerance', parseFloat(e.target.value))} />
                 </div>
              </div>
           </div>
        </div>

      </div>

      <div className="mt-8 text-right text-xs text-gray-400">
        Configuration state updates immediately. Reloading drops changes.
      </div>
    </div>
  );
}
