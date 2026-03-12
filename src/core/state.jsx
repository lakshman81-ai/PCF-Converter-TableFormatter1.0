import { createContext, useReducer, useContext } from 'react';

const DEFAULT_CONFIG = {
  devMode: false,
  decimals: 4,
  angleFormat: "degrees",
  crlfMode: true,
  autoMultiPassMode: false, // Overall toggle
  operatingMode: "Auto", // Auto, Sequential, Non-Sequential
  pte: {
    sequentialData: true,
    lineKeyEnabled: false,
    lineKeyColumn: "Line No",
    refPtPptAvailable: "auto",
  },
  smartFixer: {
    connectionTolerance: 25.0,
    gridSnapResolution: 1.0,
    microPipeThreshold: 6.0,
    microFittingThreshold: 1.0,
    negligibleGap: 1.0,
    autoFillMaxGap: 25.0,
    reviewGapMax: 100.0,
    autoTrimMaxOverlap: 25.0,
    silentSnapThreshold: 2.0,
    warnSnapThreshold: 10.0,
    autoDeleteFoldbackMax: 25.0,
    offAxisThreshold: 0.5,
    diagonalMinorThreshold: 2.0,
    fittingDimensionTolerance: 0.20,
    bendRadiusTolerance: 0.05,
    minTangentMultiplier: 1.0,
    closureWarningThreshold: 5.0,
    closureErrorThreshold: 50.0,
    maxBoreForInchDetection: 48,
    oletMaxRatioWarning: 0.5,
    oletMaxRatioError: 0.8,
    branchPerpendicularityWarn: 5.0,
    branchPerpendicularityError: 15.0,
    horizontalElevationDrift: 2.0,
    minPipeRatio: 0.10,
    noSupportAlertLength: 10000.0,
  }
};

const initialState = {
  inputType: null,
  rawInput: null,
  pteMode: null,
  pteIntermediateRows: [],
  pteConversionLog: [],
  headerRows: [],
  dataTable: [],
  config: { ...DEFAULT_CONFIG },
  log: [],
  validationResults: [],
  smartFix: {
    status: "idle",
    graph: null,
    chains: [],
    orphans: [],
    summary: null,
  },
  finalPcf: "",
  tallyBefore: {},
  tallyAfter: {},
  activeTab: "datatable",
  devMode: false,
  ruleRegistry: {},
  previewModal: { open: false, file: null, detected: null, headers: [], firstRows: [], text: null },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_INPUT_TYPE':
      return { ...state, inputType: action.payload };
    case 'SET_RAW_INPUT':
      return { ...state, rawInput: action.payload };
    case 'SET_DATA_TABLE':
      return { ...state, dataTable: action.payload };
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'ADD_LOG_ENTRY':
      return { ...state, log: [...state.log, action.payload] };
    case 'SET_SMART_FIX_STATUS':
      return { ...state, smartFix: { ...state.smartFix, status: action.payload } };
    case 'SMART_FIX_COMPLETE':
      return {
        ...state,
        smartFix: {
          ...state.smartFix,
          status: "previewing",
          graph: action.payload.graph,
          chains: action.payload.chains,
          summary: action.payload.summary,
        }
      };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'TOGGLE_DEV_MODE':
      return { ...state, devMode: !state.devMode };
    case 'SET_PREVIEW_MODAL':
      return { ...state, previewModal: action.payload };
    case 'REGISTER_RULE':
      return {
        ...state,
        ruleRegistry: {
          ...state.ruleRegistry,
          [action.payload.id]: action.payload.rule
        }
      };
    default:
      return state;
  }
}

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
