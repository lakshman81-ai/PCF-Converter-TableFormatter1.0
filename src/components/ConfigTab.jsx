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

  const handleRootConfigChange = (field, value) => {
    dispatch({ type: 'SET_CONFIG', payload: { [field]: value } });
  };

  return (
    <div className="bg-white p-6 shadow rounded flex flex-col h-full overflow-auto">
      <h2 className="font-bold text-xl mb-6 border-b pb-2">Configuration Settings</h2>

      <div className="space-y-8 max-w-4xl">
        {/* General */}
        <section>
          <h3 className="font-bold text-lg mb-3 text-gray-700 bg-gray-100 p-2 rounded">General Formatting</h3>
          <div className="grid grid-cols-2 gap-4 ml-2">
            <div>
              <label className="block text-sm font-semibold mb-1">Decimal Precision</label>
              <select
                className="border p-1 w-full rounded"
                value={state.config.decimals}
                onChange={(e) => handleRootConfigChange('decimals', parseInt(e.target.value))}
              >
                <option value={1}>1 (.x)</option>
                <option value={4}>4 (.xxxx)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Angle Format</label>
              <select
                className="border p-1 w-full rounded"
                value={state.config.angleFormat}
                onChange={(e) => handleRootConfigChange('angleFormat', e.target.value)}
              >
                <option value="degrees">Degrees (Decimal)</option>
                <option value="hundredths">Hundredths (Integer)</option>
              </select>
            </div>
          </div>
        </section>

        {/* PTE Converter */}
        <section>
          <h3 className="font-bold text-lg mb-3 text-gray-700 bg-gray-100 p-2 rounded">PTE Conversion Rules</h3>
          <div className="grid grid-cols-2 gap-4 ml-2">
            <div>
              <label className="block text-sm font-semibold mb-1">Sequential Data Assumption</label>
              <select
                className="border p-1 w-full rounded"
                value={state.config.pte.sequentialData.toString()}
                onChange={(e) => handleConfigChange('pte', 'sequentialData', e.target.value === "true")}
              >
                <option value="true">ON (Rows are connected)</option>
                <option value="false">OFF (Pure geometry sweep)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Line_Key Grouping</label>
              <select
                className="border p-1 w-full rounded"
                value={state.config.pte.lineKeyEnabled.toString()}
                onChange={(e) => handleConfigChange('pte', 'lineKeyEnabled', e.target.value === "true")}
              >
                <option value="true">ON (Restrict connection to line)</option>
                <option value="false">OFF (Ignore line number)</option>
              </select>
            </div>
          </div>
        </section>

      </div>

      <div className="mt-8 text-right text-xs text-gray-400">
        Configuration state updates immediately. Reloading drops changes.
      </div>
    </div>
  );
}
