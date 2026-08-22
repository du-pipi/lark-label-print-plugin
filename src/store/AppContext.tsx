import { createContext, useContext, useReducer, type ReactNode, useCallback, useEffect, useRef } from 'react';
import type { LabelItem, LabelConfig, Field, RecordData, TableCell, FieldDiag } from '../types';
import { defaultLabelConfig, mockFields, mockRecords } from '../mock/data';
import { loadBitableData, onSelectionChange, onTableChange, isInFeishu, getSelectedRecordIds } from '../feishu/sdk';

// ========== 状态定义 ==========
interface AppState {
  fields: Field[];
  records: RecordData[];
  selectedRecordId: string;
  items: LabelItem[];
  selectedItemId: string | null;
  labelConfig: LabelConfig;
  isPrintMode: boolean;
  tableName: string;
  loading: boolean;
  // 当前数据来源：feishu 真实数据 / mock 演示数据
  dataSource: 'feishu' | 'mock';
  // 字段诊断（暴露飞书原始值结构，排查解析问题）
  diag: FieldDiag[];
  // 取数错误信息（loadBitableData 抛错时记录，诊断面板显示）
  loadError: string;
  // 飞书多维表格中当前勾选的记录 ID 列表（支持批量打印）
  batchRecordIds: string[];
}

const LS_KEY = 'lark-label-print-layout-v1';

interface PersistShape {
  items: LabelItem[];
  labelConfig: LabelConfig;
}

function loadPersisted(): Partial<PersistShape> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistShape>;
  } catch {
    return {};
  }
}

function persist(state: AppState) {
  try {
    const data: PersistShape = { items: state.items, labelConfig: state.labelConfig };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

const persisted = loadPersisted();

const initialState: AppState = {
  fields: mockFields,
  records: mockRecords,
  selectedRecordId: mockRecords[0]?.id ?? '',
  items: persisted.items ?? [],
  selectedItemId: null,
  labelConfig: persisted.labelConfig ?? defaultLabelConfig,
  isPrintMode: false,
  tableName: '',
  loading: true,
  dataSource: 'mock',
  diag: [],
  loadError: '',
  batchRecordIds: [],
};

// ========== Action 定义 ==========
type Action =
  | { type: 'ADD_ITEM'; item: LabelItem }
  | { type: 'UPDATE_ITEM'; id: string; patch: Partial<LabelItem> }
  | { type: 'DELETE_ITEM'; id: string }
  | { type: 'SELECT_ITEM'; id: string | null }
  | { type: 'MOVE_ITEM'; id: string; x: number; y: number }
  | { type: 'RESIZE_ITEM'; id: string; width: number; height: number }
  | { type: 'CLEAR_ITEMS' }
  | { type: 'SET_LABEL_CONFIG'; patch: Partial<LabelConfig> }
  | { type: 'SELECT_RECORD'; id: string }
  | { type: 'TOGGLE_PRINT_MODE'; value?: boolean }
  | { type: 'BRING_TO_FRONT'; id: string }
  | { type: 'SEND_TO_BACK'; id: string }
  // 数据加载
  | { type: 'SET_BITABLE'; fields: Field[]; records: RecordData[]; tableName: string; dataSource: 'feishu' | 'mock'; diag: FieldDiag[]; loadError: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_BATCH_RECORDS'; recordIds: string[] };

// ========== Reducer ==========
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.item],
        selectedItemId: action.item.id,
      };

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === action.id ? { ...it, ...action.patch } : it
        ),
      };

    case 'DELETE_ITEM':
      return {
        ...state,
        items: state.items.filter((it) => it.id !== action.id),
        selectedItemId: state.selectedItemId === action.id ? null : state.selectedItemId,
      };

    case 'SELECT_ITEM':
      return { ...state, selectedItemId: action.id };

    case 'MOVE_ITEM':
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === action.id ? { ...it, x: action.x, y: action.y } : it
        ),
      };

    case 'RESIZE_ITEM':
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === action.id ? { ...it, width: action.width, height: action.height } : it
        ),
      };

    case 'CLEAR_ITEMS':
      return { ...state, items: [], selectedItemId: null };

    case 'SET_LABEL_CONFIG':
      return { ...state, labelConfig: { ...state.labelConfig, ...action.patch } };

    case 'SELECT_RECORD':
      return { ...state, selectedRecordId: action.id };

    case 'TOGGLE_PRINT_MODE':
      return {
        ...state,
        isPrintMode: action.value !== undefined ? action.value : !state.isPrintMode,
      };

    case 'BRING_TO_FRONT': {
      const idx = state.items.findIndex((it) => it.id === action.id);
      if (idx === -1) return state;
      const newItems = [...state.items];
      const [item] = newItems.splice(idx, 1);
      newItems.push(item);
      return { ...state, items: newItems };
    }

    case 'SEND_TO_BACK': {
      const idx = state.items.findIndex((it) => it.id === action.id);
      if (idx === -1) return state;
      const newItems = [...state.items];
      const [item] = newItems.splice(idx, 1);
      newItems.unshift(item);
      return { ...state, items: newItems };
    }

    case 'SET_BITABLE':
      return {
        ...state,
        fields: action.fields,
        records: action.records,
        tableName: action.tableName,
        dataSource: action.dataSource,
        diag: action.diag,
        loadError: action.loadError,
        selectedRecordId: action.records[0]?.id ?? '',
        loading: false,
      };

    case 'SET_LOADING':
      return { ...state, loading: action.value };

    case 'SET_BATCH_RECORDS':
      return { ...state, batchRecordIds: action.recordIds };

    default:
      return state;
  }
}

// ========== Context ==========
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // 便捷方法
  addItemFromField: (field: Field, x?: number, y?: number) => void;
  addStaticText: (x?: number, y?: number) => void;
  addTable: (x?: number, y?: number) => void;
  getFieldValue: (fieldId: string, recordId?: string) => string | number;
  reloadBitable: () => Promise<void>;
  refreshSelection: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

let idCounter = 0;
function genId() {
  idCounter += 1;
  return `item_${Date.now()}_${idCounter}`;
}

function createDefaultItem(field: Field, x: number, y: number): LabelItem {
  const base: LabelItem = {
    id: genId(),
    fieldId: field.id,
    fieldName: field.name,
    type: field.type,
    x,
    y,
    width: field.type === 'image' || field.type === 'qrcode' ? 25 : 40,
    height: field.type === 'image' || field.type === 'qrcode' ? 25 : 8,
    fontSize: 10,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000',
    textAlign: 'left',
    verticalAlign: 'middle',
    lineHeight: 1.3,
    borderStyle: 'none',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 2,
    backgroundColor: 'transparent',
    objectFit: 'contain',
  };

  if (field.type === 'barcode') {
    base.width = 40;
    base.height = 15;
    base.fontSize = 8;
  }
  if (field.type === 'number' && field.name.includes('价格')) {
    base.fontSize = 16;
    base.fontWeight = 'bold';
    base.width = 30;
    base.height = 10;
  }
  return base;
}

// 创建默认表格元素（默认 3 行 2 列）
function createTableItem(x: number, y: number): LabelItem {
  const rows = 3;
  const cols = 2;
  const cells: TableCell[] = Array.from({ length: rows * cols }, () => ({
    fieldId: null,
    staticText: '',
    prefix: '',
  }));
  return {
    id: genId(),
    fieldId: '',
    fieldName: '表格',
    type: 'table',
    x,
    y,
    width: 50,
    height: 30,
    fontSize: 9,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000',
    textAlign: 'left',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    borderStyle: 'none',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 2,
    backgroundColor: 'transparent',
    objectFit: 'contain',
    tableRows: rows,
    tableCols: cols,
    tableCells: cells,
    tableShowBorder: true,
    tableHeader: false,
    tableFontSize: 9,
    tableBorderWidth: 0.5,
    tableColWidths: [1, 1], // 默认两列等宽
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const addItemFromField = useCallback((field: Field, x = 5, y = 5) => {
    const item = createDefaultItem(field, x, y);
    dispatch({ type: 'ADD_ITEM', item });
  }, []);

  const addStaticText = useCallback((x = 5, y = 5) => {
    const item: LabelItem = {
      ...createDefaultItem({ id: 'static', name: '静态文本', type: 'text' }, x, y),
      isStatic: true,
      staticText: '双击编辑文本',
      width: 30,
      height: 8,
    };
    dispatch({ type: 'ADD_ITEM', item });
  }, []);

  const addTable = useCallback((x = 5, y = 5) => {
    const item = createTableItem(x, y);
    dispatch({ type: 'ADD_ITEM', item });
  }, []);

  const getFieldValue = useCallback(
    (fieldId: string, recordId?: string) => {
      const s = stateRef.current;
      if (!fieldId) return '';
      // 优先用指定 recordId（批量模式）；否则用当前选中记录；匹配不到回退第一条
      const rid = recordId || s.selectedRecordId;
      const rec = s.records.find((r) => r.id === rid) || s.records[0];
      if (!rec) return '';
      const f = s.fields.find((x) => x.id === fieldId);
      const v = rec.fields[fieldId];
      if (v !== undefined && v !== '') return v;
      // 双键兜底：按字段名取值（飞书返回键为 name 时）
      if (f && rec.fields[f.name] !== undefined) return rec.fields[f.name];
      return '';
    },
    []
  );

  const refreshSelection = useCallback(async () => {
    if (!isInFeishu()) return;
    const ids = await getSelectedRecordIds();
    dispatch({ type: 'SET_BATCH_RECORDS', recordIds: ids });
  }, []);

  const reloadBitable = useCallback(async () => {
    if (!isInFeishu()) {
      // 非飞书环境：保留 mock 演示数据，方便本地开发与预览
      dispatch({ type: 'SET_BITABLE', fields: mockFields, records: mockRecords, tableName: '演示数据（未接入飞书）', dataSource: 'mock', diag: [], loadError: '' });
      return;
    }
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const data = await loadBitableData();
      const errMsg = data.records.length === 0 ? '记录数为 0：getRecordsByPage 可能未返回数据或被权限限制' : '';
      dispatch({ type: 'SET_BITABLE', fields: data.fields, records: data.records, tableName: data.tableName, dataSource: 'feishu', diag: data.diag, loadError: errMsg });
    } catch (err) {
      // 保留错误信息到诊断面板，不再静默吞掉
      const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error('[飞书SDK] 读取数据失败：', err);
      dispatch({ type: 'SET_BITABLE', fields: mockFields, records: mockRecords, tableName: '读取失败（回退演示数据）', dataSource: 'mock', diag: [], loadError: errMsg });
    }
  }, []);

  // 首次加载 + 监听选中/表切换
  useEffect(() => {
    reloadBitable();

    let offSel: (() => void) | undefined;
    let offTable: (() => void) | undefined;
    if (isInFeishu()) {
      onSelectionChange((recordIds) => {
        // 更新批量勾选列表
        dispatch({ type: 'SET_BATCH_RECORDS', recordIds });
        // 单选时同步预览记录
        if (recordIds.length === 1) {
          dispatch({ type: 'SELECT_RECORD', id: recordIds[0] });
        }
      }).then((off) => { offSel = off; }).catch(() => {});
      onTableChange(() => { reloadBitable(); }).then((off) => { offTable = off; }).catch(() => {});
      // 初始获取一次选中状态
      refreshSelection();
    }
    return () => {
      offSel?.();
      offTable?.();
    };
  }, [reloadBitable]);

  // 布局持久化（仅 items + labelConfig，不存数据）
  useEffect(() => {
    persist(stateRef.current);
  }, [state.items, state.labelConfig]);

  return (
    <AppContext.Provider value={{ state, dispatch, addItemFromField, addStaticText, addTable, getFieldValue, reloadBitable, refreshSelection }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
