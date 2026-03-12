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
  columnAliases: {
    'East': ['East', 'X Coordinate', 'X'],
    'North': ['North', 'Y Coordinate', 'Y'],
    'Up': ['Up', 'Z Coordinate', 'Z'],
    'Type': ['Type', 'Real_Type', 'Component', 'Comp Type', 'Component Type', 'Fitting', 'Item'],
    'Point': ['Point'],
    'PPoint': ['PPoint', 'Port'],
    'RefNo': ['RefNo', 'Reference', 'Node No'],
    'Bore': ['Bore', 'Size', 'NB'],
    'Sequence': ['Sequence', 'Seq', '#'],
    'Line_Key': ['Line No', 'Pipeline', 'Line_Key', 'Line'],
    'EP1 COORDS': ['EP1 COORDS', 'EP1', 'Start Point', 'From', 'From Coord', 'Start Coord'],
    'EP2 COORDS': ['EP2 COORDS', 'EP2', 'End Point', 'To', 'To Coord', 'End Coord'],
    'CP COORDS': ['CP COORDS', 'CP', 'Center Point', 'Centre Point'],
    'BP COORDS': ['BP COORDS', 'BP', 'Branch Point']
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

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext();


export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  return useContext(AppContext);
}
