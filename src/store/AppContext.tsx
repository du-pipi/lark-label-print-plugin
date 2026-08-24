import { createContext, useContext, useReducer, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import type { LabelItem, LabelConfig, Field, RecordData, TableCell, FieldDiag, LabelTemplate } from '../types';
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
  tableName: string;
  loading: boolean;
  dataSource: 'feishu' | 'mock';
  diag: FieldDiag[];
  loadError: string;
  batchRecordIds: string[];
  // onSelectionChange 触发计数（诊断用）
  selectionChangeCount: number;
  // 撤销/重做历史栈
  history: { items: LabelItem[]; labelConfig: LabelConfig }[];
  historyIndex: number;
  // 批量打印份数（每条记录打印几份）
  printCopies: number;
}

const LS_KEY = 'lark-label-print-layout-v1';
const LS_TPL_KEY = 'lark-label-print-templates-v1';

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

// ========== 模板管理 ==========
export function loadTemplates(): LabelTemplate[] {
  try {
    const raw = localStorage.getItem(LS_TPL_KEY);
    return raw ? (JSON.parse(raw) as LabelTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveTemplates(tpls: LabelTemplate[]): void {
  try {
    localStorage.setItem(LS_TPL_KEY, JSON.stringify(tpls));
  } catch {
    /* ignore */
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
  tableName: '',
  loading: true,
  dataSource: 'mock',
  diag: [],
  loadError: '',
  batchRecordIds: [],
  selectionChangeCount: 0,
  history: [],
  historyIndex: -1,
  printCopies: 1,
};

// ========== Action 定义 ==========
type Action =
  | { type: 'ADD_ITEM'; item: LabelItem }
  | { type: 'UPDATE_ITEM'; id: string; patch: Partial<LabelItem> }
  | { type: 'DELETE_ITEM'; id: string }
  | { type: 'SELECT_ITEM'; id: string | null }
  | { type: 'MOVE_ITEM'; id: string; x: number; y: number }
  | { type: 'RESIZE_ITEM'; id: string; width: number; height: number }
  | { type: 'DUPLICATE_ITEM'; id: string }
  | { type: 'CLEAR_ITEMS' }
  | { type: 'SET_LABEL_CONFIG'; patch: Partial<LabelConfig> }
  | { type: 'SELECT_RECORD'; id: string }
  | { type: 'BRING_TO_FRONT'; id: string }
  | { type: 'SEND_TO_BACK'; id: string }
  | { type: 'SET_BITABLE'; fields: Field[]; records: RecordData[]; tableName: string; dataSource: 'feishu' | 'mock'; diag: FieldDiag[]; loadError: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_BATCH_RECORDS'; recordIds: string[] }
  | { type: 'SET_PRINT_COPIES'; value: number }
  | { type: 'LOAD_TEMPLATE'; items: LabelItem[]; labelConfig: LabelConfig }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// 记录会改变 items/config 的操作（用于撤销栈）
const HISTORY_ACTIONS = new Set(['ADD_ITEM', 'DELETE_ITEM', 'DUPLICATE_ITEM', 'CLEAR_ITEMS', 'MOVE_ITEM', 'RESIZE_ITEM', 'UPDATE_ITEM', 'LOAD_TEMPLATE']);

function pushHistory(state: AppState): { items: LabelItem[]; labelConfig: LabelConfig }[] {
  const snapshot = { items: state.items, labelConfig: state.labelConfig };
  // 截断 redo 部分
  const truncated = state.history.slice(0, state.historyIndex + 1);
  const newHistory = [...truncated, snapshot];
  // 限制历史栈大小 50
  const trimmed = newHistory.length > 50 ? newHistory.slice(newHistory.length - 50) : newHistory;
  return trimmed;
}

// ========== Reducer ==========
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const newItems = [...state.items, action.item];
      return { ...state, items: newItems, selectedItemId: action.item.id, history: pushHistory(state), historyIndex: state.historyIndex + 1 };
    }

    case 'UPDATE_ITEM': {
      // lockedPosition 只锁位置，不锁属性编辑（行列数、样式等都能改）
      return {
        ...state,
        items: state.items.map((it) => it.id === action.id ? { ...it, ...action.patch } : it),
        history: pushHistory(state), historyIndex: state.historyIndex + 1,
      };
    }

    case 'DELETE_ITEM': {
      return {
        ...state,
        items: state.items.filter((it) => it.id !== action.id),
        selectedItemId: state.selectedItemId === action.id ? null : state.selectedItemId,
        history: pushHistory(state), historyIndex: state.historyIndex + 1,
      };
    }

    case 'SELECT_ITEM':
      return { ...state, selectedItemId: action.id };

    case 'MOVE_ITEM': {
      const item = state.items.find((it) => it.id === action.id);
      if (item?.lockedPosition) return state; // 位置锁定：不可拖动
      return {
        ...state,
        items: state.items.map((it) => it.id === action.id ? { ...it, x: action.x, y: action.y } : it),
        history: pushHistory(state), historyIndex: state.historyIndex + 1,
      };
    }

    case 'RESIZE_ITEM': {
      // lockedPosition 不锁缩放（表格可调大小）
      return {
        ...state,
        items: state.items.map((it) => it.id === action.id ? { ...it, width: action.width, height: action.height } : it),
        history: pushHistory(state), historyIndex: state.historyIndex + 1,
      };
    }

    case 'DUPLICATE_ITEM': {
      const orig = state.items.find((it) => it.id === action.id);
      if (!orig) return state;
      const copy: LabelItem = {
        ...orig,
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        x: orig.x + 5,
        y: orig.y + 5,
        // 表格深拷贝
        tableCells: orig.tableCells ? orig.tableCells.map(c => ({ ...c })) : undefined,
      };
      return {
        ...state,
        items: [...state.items, copy],
        selectedItemId: copy.id,
        history: pushHistory(state), historyIndex: state.historyIndex + 1,
      };
    }

    case 'CLEAR_ITEMS':
      return { ...state, items: [], selectedItemId: null, history: pushHistory(state), historyIndex: state.historyIndex + 1 };

    case 'SET_LABEL_CONFIG':
      return { ...state, labelConfig: { ...state.labelConfig, ...action.patch }, history: pushHistory(state), historyIndex: state.historyIndex + 1 };

    case 'SELECT_RECORD':
      return { ...state, selectedRecordId: action.id };

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
      return { ...state, batchRecordIds: action.recordIds, selectionChangeCount: state.selectionChangeCount + 1 };

    case 'SET_PRINT_COPIES':
      return { ...state, printCopies: action.value };

    case 'LOAD_TEMPLATE':
      return {
        ...state,
        items: action.items.map(it => ({ ...it, id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, tableCells: it.tableCells?.map(c => ({ ...c })) })),
        labelConfig: action.labelConfig,
        selectedItemId: null,
        history: pushHistory(state), historyIndex: state.historyIndex + 1,
      };

    case 'UNDO': {
      if (state.historyIndex < 0) return state;
      const prev = state.history[state.historyIndex];
      if (!prev) return state;
      return { ...state, items: prev.items, labelConfig: prev.labelConfig, historyIndex: state.historyIndex - 1 };
    }

    case 'REDO': {
      const nextIdx = state.historyIndex + 1;
      if (nextIdx >= state.history.length) return state;
      const next = state.history[nextIdx];
      if (!next) return state;
      return { ...state, items: next.items, labelConfig: next.labelConfig, historyIndex: nextIdx };
    }

    default:
      return state;
  }
}

// ========== Context ==========
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addItemFromField: (field: Field, x?: number, y?: number) => void;
  addStaticText: (x?: number, y?: number) => void;
  addTable: (x?: number, y?: number) => void;
  duplicateSelected: () => void;
  undo: () => void;
  redo: () => void;
  saveTemplate: (name: string) => void;
  loadTemplateById: (id: string) => void;
  deleteTemplate: (id: string) => void;
  getFieldValue: (fieldId: string, recordId?: string) => string | number;
  reloadBitable: () => Promise<void>;
  refreshSelection: () => Promise<void>;
  selectAllRecords: (ids?: string[]) => void;
  toggleBatchRecord: (recordId: string) => void;
  clearBatch: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function genId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultItem(field: Field, x: number, y: number): LabelItem {
  const base: LabelItem = {
    id: genId(),
    fieldId: field.id,
    fieldName: field.name,
    type: field.type,
    x, y,
    width: field.type === 'image' || field.type === 'qrcode' ? 25 : 40,
    height: field.type === 'image' || field.type === 'qrcode' ? 25 : 8,
    fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', color: '#000000',
    textAlign: 'left', verticalAlign: 'middle', lineHeight: 1.3,
    borderStyle: 'none', borderWidth: 1, borderColor: '#000000',
    borderRadius: 0, padding: 2, backgroundColor: 'transparent', objectFit: 'contain',
  };
  if (field.type === 'barcode') { base.width = 40; base.height = 15; base.fontSize = 8; }
  return base;
}

// 创建默认表格元素——距边界 2mm，位置锁定（不可拖动，但可编辑属性/行列数）
function createTableItem(labelConfig: LabelConfig): LabelItem {
  const rows = 3;
  const cols = 2;
  const cells: TableCell[] = Array.from({ length: rows * cols }, () => ({ fieldId: null, staticText: '', prefix: '' }));
  const margin = 2; // 距边界 2mm
  return {
    id: genId(),
    fieldId: '', fieldName: '表格', type: 'table',
    x: margin,
    y: margin,
    width: labelConfig.labelWidth - margin * 2,
    height: labelConfig.labelHeight - margin * 2,
    fontSize: 9, fontWeight: 'normal', fontStyle: 'normal', color: '#000000',
    textAlign: 'left', verticalAlign: 'middle', lineHeight: 1.2,
    borderStyle: 'none', borderWidth: 1, borderColor: '#000000',
    borderRadius: 0, padding: 2, backgroundColor: 'transparent', objectFit: 'contain',
    tableRows: rows, tableCols: cols, tableCells: cells,
    tableShowBorder: true, tableHeader: false, tableFontSize: 9, tableBorderWidth: 0.5,
    tableColWidths: [1, 1],
    tableCellPaddingV: 2, tableCellPaddingH: 3,
    lockedPosition: true, // 位置锁定：不可拖动，但可选中编辑
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // 画布预览缩放（仅屏幕预览用，打印时临时置 1 输出物理尺寸）
  const [scale, setScale] = useState(1.5);
  const stateRef = useRef(state);
  stateRef.current = state;

  const addItemFromField = useCallback((field: Field, x = 5, y = 5) => {
    const item = createDefaultItem(field, x, y);
    dispatch({ type: 'ADD_ITEM', item });
  }, []);

  const addStaticText = useCallback((x = 5, y = 5) => {
    const item: LabelItem = {
      ...createDefaultItem({ id: 'static', name: '静态文本', type: 'text' }, x, y),
      isStatic: true, staticText: '双击编辑文本', width: 30, height: 8,
    };
    dispatch({ type: 'ADD_ITEM', item });
  }, []);

  const addTable = useCallback(() => {
    const item = createTableItem(stateRef.current.labelConfig);
    dispatch({ type: 'ADD_ITEM', item });
  }, []);

  const duplicateSelected = useCallback(() => {
    const id = stateRef.current.selectedItemId;
    if (id) dispatch({ type: 'DUPLICATE_ITEM', id });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const saveTemplate = useCallback((name: string) => {
    const s = stateRef.current;
    const tpl: LabelTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      items: s.items,
      labelConfig: s.labelConfig,
      createdAt: Date.now(),
    };
    const existing = loadTemplates();
    const updated = [...existing, tpl];
    saveTemplates(updated);
  }, []);

  const loadTemplateById = useCallback((id: string) => {
    const tpls = loadTemplates();
    const tpl = tpls.find(t => t.id === id);
    if (tpl) dispatch({ type: 'LOAD_TEMPLATE', items: tpl.items, labelConfig: tpl.labelConfig });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    const existing = loadTemplates();
    saveTemplates(existing.filter(t => t.id !== id));
  }, []);

  const getFieldValue = useCallback((fieldId: string, recordId?: string) => {
    const s = stateRef.current;
    if (!fieldId) return '';
    const rid = recordId || s.selectedRecordId;
    const rec = s.records.find((r) => r.id === rid) || s.records[0];
    if (!rec) return '';
    const f = s.fields.find((x) => x.id === fieldId);
    const v = rec.fields[fieldId];
    if (v !== undefined && v !== '') return v;
    if (f && rec.fields[f.name] !== undefined) return rec.fields[f.name];
    return '';
  }, []);

  const refreshSelection = useCallback(async () => {
    if (!isInFeishu()) return;
    const ids = await getSelectedRecordIds();
    dispatch({ type: 'SET_BATCH_RECORDS', recordIds: ids });
  }, []);

  const selectAllRecords = useCallback((ids?: string[]) => {
    const s = stateRef.current;
    const target = ids && ids.length > 0 ? ids : s.records.map(r => r.id);
    dispatch({ type: 'SET_BATCH_RECORDS', recordIds: target });
  }, []);

  // 插件内勾选/取消勾选单条记录（多选由插件自行管理，不依赖飞书 SDK）
  const toggleBatchRecord = useCallback((recordId: string) => {
    const s = stateRef.current;
    const exists = s.batchRecordIds.includes(recordId);
    const next = exists
      ? s.batchRecordIds.filter(id => id !== recordId)
      : [...s.batchRecordIds, recordId];
    dispatch({ type: 'SET_BATCH_RECORDS', recordIds: next });
  }, []);

  const clearBatch = useCallback(() => {
    dispatch({ type: 'SET_BATCH_RECORDS', recordIds: [] });
  }, []);

  const reloadBitable = useCallback(async () => {
    if (!isInFeishu()) {
      dispatch({ type: 'SET_BITABLE', fields: mockFields, records: mockRecords, tableName: '演示数据（未接入飞书）', dataSource: 'mock', diag: [], loadError: '' });
      return;
    }
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const data = await loadBitableData();
      const errMsg = data.records.length === 0 ? '记录数为 0：getRecordsByPage 可能未返回数据或被权限限制' : '';
      dispatch({ type: 'SET_BITABLE', fields: data.fields, records: data.records, tableName: data.tableName, dataSource: 'feishu', diag: data.diag, loadError: errMsg });
    } catch (err) {
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
      // onSelectionChange：单选时同步预览记录（飞书 SDK Selection 只支持单选）
      // 多选由插件内 RecordPicker 自行管理（SDK 不暴露多选 API）
      onSelectionChange((recordIds) => {
        if (recordIds.length === 1) dispatch({ type: 'SELECT_RECORD', id: recordIds[0] });
      }).then((off) => { offSel = off; }).catch(() => {});
      onTableChange(() => { reloadBitable(); }).then((off) => { offTable = off; }).catch(() => {});
      refreshSelection();
    }
    return () => {
      offSel?.();
      offTable?.();
    };
  }, [reloadBitable, refreshSelection]);

  // 布局持久化
  useEffect(() => { persist(stateRef.current); }, [state.items, state.labelConfig]);

  // 全局快捷键：Ctrl+Z 撤销 / Ctrl+Shift+Z 或 Ctrl+Y 重做 / Ctrl+D 复制
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // 批量预览模式不响应快捷键
      if (stateRef.current.batchRecordIds.length > 1) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
        else if (e.key === 'd') { e.preventDefault(); duplicateSelected(); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo, duplicateSelected]);

  return (
    <AppContext.Provider value={{
      state, dispatch, addItemFromField, addStaticText, addTable,
      duplicateSelected, undo, redo, saveTemplate, loadTemplateById, deleteTemplate,
      getFieldValue, reloadBitable, refreshSelection, selectAllRecords, toggleBatchRecord, clearBatch,
      scale, setScale,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
