import { useState } from 'react';
import { useAppContext } from '../core/state';

export function ConfigTab() {
  const { state, dispatch } = useAppContext();

  // Local state for JSON inputs so they can be typed into freely
  const [teeSkeyMapInput, setTeeSkeyMapInput] = useState(() => JSON.stringify(state.config.teeSkeyMap || []));
  const [supportGuidMapInput, setSupportGuidMapInput] = useState(() => JSON.stringify(state.config.supportGuidMapping || {}));

  // Derive unique headers and sizes from dataTable for dropdowns/UI
  const headers = new Set();
  const teeSizes = new Set();
  if (state.dataTable) {
     state.dataTable.forEach(row => {
         Object.keys(row).forEach(k => {
             if (k !== 'ca' && k !== 'ep1' && k !== 'ep2' && k !== 'cp' && k !== 'bp' && k !== 'supportCoor') {
                 headers.add(k);
             }
         });
         if (row.ca) Object.keys(row.ca).forEach(k => headers.add(`ca.${k}`));

         if ((row.type || "").toUpperCase() === "TEE" && row.bore !== undefined && row.bore !== null) {
             teeSizes.add(row.bore);
         }
     });
  }
  const availableHeaders = Array.from(headers).sort();
  const availableTeeSizes = Array.from(teeSizes).sort((a,b) => a-b);

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

        {/* Validation Rules Checklist (V1-V20) */}
        <div className="border rounded shadow-sm bg-white mb-8">
           <h3 className="font-bold text-lg mb-4 text-gray-700 p-4 border-b">Validation Rules Checklist (V1-V20)</h3>
           <div className="grid grid-cols-3 gap-y-4 gap-x-6 p-4 ml-2">
              {[
                { id: "V1", desc: "No (0,0,0) coordinates" },
                { id: "V2", desc: "Decimal consistency" },
                { id: "V3", desc: "Bore consistency" },
                { id: "V4", desc: "BEND CP != EP1" },
                { id: "V5", desc: "BEND CP != EP2" },
                { id: "V6", desc: "BEND CP not collinear" },
                { id: "V7", desc: "BEND equidistant legs" },
                { id: "V8", desc: "TEE CP at midpoint" },
                { id: "V9", desc: "TEE CP bore matches" },
                { id: "V10", desc: "TEE Branch perpendicular" },
                { id: "V11", desc: "OLET has no end-points" },
                { id: "V12", desc: "SUPPORT has no CAs" },
                { id: "V13", desc: "SUPPORT bore is 0" },
                { id: "V14", desc: "Missing <SKEY>" },
                { id: "V15", desc: "Coordinate continuity" },
                { id: "V16", desc: "CA8 usage scope" },
                { id: "V17", desc: "Reserved" },
                { id: "V18", desc: "Bore unit (MM/Inch check)" },
                { id: "V19", desc: "SUPPORT MSG-SQ tokens" },
                { id: "V20", desc: "SUPPORT GUID Prefix (UCI:)" }
              ].map(rule => (
                <label key={rule.id} className="flex items-center space-x-3 text-sm text-gray-800 cursor-pointer hover:bg-gray-50 p-1 rounded">
                   <input
                     type="checkbox"
                     className="form-checkbox h-4 w-4 text-blue-600 rounded"
                     checked={state.config.validator?.[rule.id] !== false}
                     onChange={(e) => {
                        dispatch({
                          type: 'SET_CONFIG',
                          payload: {
                            validator: {
                              ...state.config.validator,
                              [rule.id]: e.target.checked
                            }
                          }
                        });
                     }}
                   />
                   <span className="font-semibold w-8">{rule.id}:</span>
                   <span className="truncate">{rule.desc}</span>
                </label>
              ))}
           </div>
        </div>

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

        {/* Formatting Config */}
        <div className="mb-6 border-b pb-6">
           <div className="flex items-center space-x-4 mb-4">
               <label className="font-semibold text-sm text-gray-700 w-48">Export Formatting:</label>
               <label className="flex items-center space-x-2 text-sm text-gray-800">
                 <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                    checked={state.config.strictIsogen === true}
                    onChange={(e) => {
                       dispatch({
                          type: 'SET_CONFIG',
                          payload: { strictIsogen: e.target.checked }
                       });
                    }}
                 />
                 <span>Customizable ISOGEN mode</span>
               </label>
           </div>

           {state.config.strictIsogen && (
             <>
               <div className="pl-52 grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2 text-sm text-gray-800">
                     <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded"
                        checked={state.config.disableCAs || false}
                        onChange={(e) => dispatch({ type: 'SET_CONFIG', payload: { disableCAs: e.target.checked } })} />
                     <span>Disable CAs (1-10, 97, 98)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-800">
                     <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded"
                        checked={state.config.disableMessageSquare || false}
                        onChange={(e) => dispatch({ type: 'SET_CONFIG', payload: { disableMessageSquare: e.target.checked } })} />
                     <span>Disable Message Squares</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-800">
                     <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded"
                        checked={state.config.disablePipelineReference || false}
                        onChange={(e) => dispatch({ type: 'SET_CONFIG', payload: { disablePipelineReference: e.target.checked } })} />
                     <span>Disable Pipeline Reference</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-800">
                     <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded"
                        checked={state.config.disableOletBlocks || false}
                        onChange={(e) => dispatch({ type: 'SET_CONFIG', payload: { disableOletBlocks: e.target.checked } })} />
                     <span>Disable OLET Blocks</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-800">
                     <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded"
                        checked={state.config.disableZeroLength || false}
                        onChange={(e) => dispatch({ type: 'SET_CONFIG', payload: { disableZeroLength: e.target.checked } })} />
                     <span>Disable Zero Length Components</span>
                  </label>
               </div>

               <div className="pl-52 mt-4">
                   <label className="block text-sm font-semibold text-gray-700 mb-1">Custom Header (overrides defaults if not empty):</label>
                   <textarea
                      className="w-full border p-2 rounded text-sm h-24"
                      placeholder="ISOGEN-FILES ISOGEN.FLS\nUNITS-BORE MM\n..."
                      value={state.config.customHeader || ""}
                      onChange={(e) => dispatch({ type: 'SET_CONFIG', payload: { customHeader: e.target.value } })}
                   />
               </div>

               <div className="pl-52 mt-4 space-y-4">
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                          TEE SKEY Mapping (JSON format: [{`"bore": 100, "skey": "TEFL"`}])
                          {availableTeeSizes.length > 0 && <span className="text-gray-500 font-normal ml-2">Available TEE sizes: {availableTeeSizes.join(', ')}</span>}
                      </label>
                      <input type="text" className="w-full border p-2 rounded text-sm"
                         placeholder='[{"bore": 100, "skey": "TEFL"}]'
                         value={teeSkeyMapInput}
                         onChange={(e) => setTeeSkeyMapInput(e.target.value)}
                         onBlur={(e) => {
                             try {
                                 const parsed = JSON.parse(e.target.value);
                                 if (Array.isArray(parsed)) {
                                     dispatch({ type: 'SET_CONFIG', payload: { teeSkeyMap: parsed } });
                                 }
                             } catch (e) {
                                 console.log(e);
                                 // Revert back to valid state if invalid on blur
                                 setTeeSkeyMapInput(JSON.stringify(state.config.teeSkeyMap || []));
                             }
                         }}
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Support GUID Mapping Column:</label>
                          <select
                              className="w-full border p-2 rounded text-sm"
                              value={state.config.supportGuidMappingColumn || ""}
                              onChange={(e) => dispatch({ type: 'SET_CONFIG', payload: { supportGuidMappingColumn: e.target.value } })}
                          >
                              <option value="">-- Select Column --</option>
                              {availableHeaders.length > 0 ? (
                                  availableHeaders.map(h => <option key={h} value={h}>{h}</option>)
                              ) : (
                                  <>
                                      <option value="1">Component Attribute 1</option>
                                      <option value="2">Component Attribute 2</option>
                                      <option value="3">Component Attribute 3</option>
                                      <option value="4">Component Attribute 4</option>
                                      <option value="5">Component Attribute 5</option>
                                      <option value="text">Message Square Text</option>
                                      <option value="supportName">Support Name</option>
                                  </>
                              )}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Support GUID Mapping (JSON format: {`{"Rest": "GUID:REST-1"}`}):</label>
                          <input type="text" className="w-full border p-2 rounded text-sm"
                             placeholder='{"Rest": "GUID:REST-1", "Guide": "GUID:GD-1"}'
                             value={supportGuidMapInput}
                             onChange={(e) => setSupportGuidMapInput(e.target.value)}
                             onBlur={(e) => {
                                 try {
                                     const parsed = JSON.parse(e.target.value);
                                     if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                                         dispatch({ type: 'SET_CONFIG', payload: { supportGuidMapping: parsed } });
                                     }
                                 } catch (e) {
                                     console.log(e);
                                     // Revert to valid state on blur if invalid
                                     setSupportGuidMapInput(JSON.stringify(state.config.supportGuidMapping || {}));
                                 }
                             }}
                          />
                      </div>
                  </div>
               </div>
             </>
           )}
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
