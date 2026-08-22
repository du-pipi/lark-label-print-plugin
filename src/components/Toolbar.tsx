import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useApp, loadTemplates } from '../store/AppContext';
import { labelPresets } from '../mock/data';
import type { LabelConfig, LabelTemplate } from '../types';

export default function Toolbar() {
  const { state, dispatch, undo, redo, saveTemplate, loadTemplateById, deleteTemplate, selectAllRecords, clearBatch } = useApp();
  const { labelConfig, records, selectedRecordId, items, batchRecordIds } = state;
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [tplName, setTplName] = useState('');

  const isBatchMode = batchRecordIds.length > 1;
  const canUndo = state.historyIndex >= 0;
  const canRedo = state.historyIndex + 1 < state.history.length;

  useEffect(() => {
    setTemplates(loadTemplates());
  }, [showTemplates]);

  const handlePrint = () => {
    // 动态设置 @page 尺寸，让打印机按标签纸实际大小出纸
    // 批量模式：每个标签一页，页面尺寸 = 单个标签尺寸
    // 单条模式：页面尺寸 = columns×rows 排列后的整页尺寸
    const pageW = isBatchMode
      ? labelConfig.labelWidth
      : labelConfig.labelWidth * labelConfig.columns
        + (labelConfig.columns - 1) * labelConfig.gapX
        + labelConfig.pageMarginLeft + labelConfig.pageMarginRight;
    const pageH = isBatchMode
      ? labelConfig.labelHeight
      : labelConfig.labelHeight * labelConfig.rows
        + (labelConfig.rows - 1) * labelConfig.gapY
        + labelConfig.pageMarginTop + labelConfig.pageMarginBottom;
    const pageStyleId = 'dynamic-page-size';
    let styleEl = document.getElementById(pageStyleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = pageStyleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@page { size: ${pageW}mm ${pageH}mm; margin: 0; }`;

    // 直接调用系统打印对话框，打印当前页面（所见即所得）
    // @media print CSS 自动隐藏编辑 UI，只保留标签内容
    // 留足 @page 尺寸生效时间，避免打印时标签被缩放裁切
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleClear = () => {
    if (items.length === 0) return;
    if (window.confirm('确定要清空所有元素吗？')) {
      dispatch({ type: 'CLEAR_ITEMS' });
    }
  };

  const applyPreset = (preset: typeof labelPresets[0]) => {
    dispatch({ type: 'SET_LABEL_CONFIG', patch: preset.config });
  };

  const updateConfig = (patch: Partial<LabelConfig>) => {
    dispatch({ type: 'SET_LABEL_CONFIG', patch });
  };

  const selectedRecord = records.find((r) => r.id === selectedRecordId);

  // 预览记录下拉显示名：优先按「角色名称」字段，找不到则回退首个文本/数字字段
  const roleField =
    state.fields.find((f) => f.name.includes('角色名称')) ||
    state.fields.find((f) => f.type === 'text' || f.type === 'number');
  const recordLabel = (r: typeof records[number]) => {
    const v = roleField ? (r.fields[roleField.id] ?? r.fields[roleField.name]) : undefined;
    return v !== undefined && v !== '' ? String(v) : r.id;
  };

  return (
    <>
      <div className="toolbar no-print">
        <div className="toolbar-left">
          <span className="toolbar-title"><Icon name="tag" size={18} /> 数据标签打印</span>
          {state.tableName && (
            <span className="tb-chip">{state.tableName}</span>
          )}
          {state.dataSource === 'feishu' && (
            <span className="tb-chip tb-chip-green">已接入飞书</span>
          )}
          {state.dataSource === 'mock' && (
            <span className="tb-chip tb-chip-orange">演示数据</span>
          )}
          <span className="tb-chip">记录 {records.length} 条</span>
          {isBatchMode && (
            <span className="tb-chip tb-chip-blue">已选中 {batchRecordIds.length} 条</span>
          )}
          <div className="toolbar-divider" />

          {/* 撤销/重做 */}
          <button className="toolbar-btn" onClick={undo} disabled={!canUndo} title="撤销 (Ctrl+Z)" style={{ opacity: canUndo ? 1 : 0.4 }}><Icon name="undo" /></button>
          <button className="toolbar-btn" onClick={redo} disabled={!canRedo} title="重做 (Ctrl+Y)" style={{ opacity: canRedo ? 1 : 0.4 }}><Icon name="redo" /></button>
          <div className="toolbar-divider" />

          {/* 模板管理 */}
          <button className="toolbar-btn" onClick={() => setShowTemplates(true)}><Icon name="template" /> 模板</button>
          <div className="toolbar-divider" />

          {/* 批量选择控制 */}
          {!isBatchMode ? (
            <div className="record-selector">
              <label className="tb-label">预览记录</label>
              <select
                className="toolbar-select"
                value={selectedRecordId}
                onChange={(e) => dispatch({ type: 'SELECT_RECORD', id: e.target.value })}
              >
                {records.map((r) => (
                  <option key={r.id} value={r.id}>{recordLabel(r)}</option>
                ))}
              </select>
            </div>
          ) : (
            <span className="tb-chip tb-chip-blue">批量预览中</span>
          )}
          <button className="toolbar-btn" onClick={selectAllRecords} title="全选所有记录" style={{ fontSize: 11, padding: '2px 8px' }}>全选</button>
          <button className="toolbar-btn" onClick={clearBatch} title="清空选择" style={{ fontSize: 11, padding: '2px 8px' }}>清空</button>
        </div>

        <div className="toolbar-right">
          {/* 批量打印份数 */}
          {isBatchMode && (
            <div className="record-selector" style={{ marginRight: 8 }}>
              <label>每条份数:</label>
              <input
                type="number"
                className="property-input"
                style={{ width: 50 }}
                value={state.printCopies}
                min={1}
                max={99}
                onChange={(e) => dispatch({ type: 'SET_PRINT_COPIES', value: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </div>
          )}
          <button className="toolbar-btn" onClick={() => setShowSettings(true)}><Icon name="settings" /> 标签设置</button>
          <button className="toolbar-btn danger" onClick={handleClear}><Icon name="trash" /> 清空</button>
          <div className="toolbar-divider" />
          <button className="toolbar-btn primary" onClick={handlePrint}>
            {isBatchMode ? <><Icon name="print" /> 批量打印 ({batchRecordIds.length * state.printCopies})</> : <><Icon name="print" /> 打印</>}
          </button>
        </div>
      </div>

      {/* 标签设置弹窗 */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSettings(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              width: 480,
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>标签纸张设置</h3>

            {/* 预设 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>快速预设</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {labelPresets.map((preset) => (
                  <button
                    key={preset.name}
                    className="toolbar-btn"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 标签尺寸 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>单个标签尺寸</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>宽度 (mm)</label>
                  <input
                    type="number"
                    className="property-input"
                    value={labelConfig.labelWidth}
                    min={10}
                    max={297}
                    onChange={(e) => updateConfig({ labelWidth: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>高度 (mm)</label>
                  <input
                    type="number"
                    className="property-input"
                    value={labelConfig.labelHeight}
                    min={10}
                    max={297}
                    onChange={(e) => updateConfig({ labelHeight: parseInt(e.target.value) || 40 })}
                  />
                </div>
              </div>
            </div>

            {/* 行列数 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>每页排列</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>列数</label>
                  <input
                    type="number"
                    className="property-input"
                    value={labelConfig.columns}
                    min={1}
                    max={20}
                    onChange={(e) => updateConfig({ columns: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>行数</label>
                  <input
                    type="number"
                    className="property-input"
                    value={labelConfig.rows}
                    min={1}
                    max={30}
                    onChange={(e) => updateConfig({ rows: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            {/* 间距 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>标签间距</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>水平 (mm)</label>
                  <input
                    type="number"
                    className="property-input"
                    value={labelConfig.gapX}
                    min={0}
                    max={20}
                    onChange={(e) => updateConfig({ gapX: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>垂直 (mm)</label>
                  <input
                    type="number"
                    className="property-input"
                    value={labelConfig.gapY}
                    min={0}
                    max={20}
                    onChange={(e) => updateConfig({ gapY: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* 页面边距 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>页面边距 (mm)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>上</label>
                  <input
                    type="number"
                    className="property-input"
                    value={labelConfig.pageMarginTop}
                    min={0}
                    onChange={(e) => updateConfig({ pageMarginTop: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>下</label>
                  <input
                    type="number"
                    className="property-input"
                    value={labelConfig.pageMarginBottom}
                    min={0}
                    onChange={(e) => updateConfig({ pageMarginBottom: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>左</label>
                  <input
                    type="number"
                    className="property-input"
                    value={labelConfig.pageMarginLeft}
                    min={0}
                    onChange={(e) => updateConfig({ pageMarginLeft: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>右</label>
                  <input
                    type="number"
                    className="property-input"
                    value={labelConfig.pageMarginRight}
                    min={0}
                    onChange={(e) => updateConfig({ pageMarginRight: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* 背景 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>标签背景色</div>
              <input
                type="color"
                className="property-input"
                value={labelConfig.background}
                onChange={(e) => updateConfig({ background: e.target.value })}
                style={{ width: 40, height: 28 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="toolbar-btn" onClick={() => setShowSettings(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 模板管理弹窗 */}
      {showTemplates && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setShowTemplates(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 12, padding: 24, width: 440, maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="template" size={18} /> 模板管理</h3>

            {/* 保存当前模板 */}
            <div style={{ marginBottom: 20, padding: 12, background: '#f7f8fa', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>保存当前排版为模板</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="property-input"
                  style={{ flex: 1 }}
                  placeholder="模板名称（如：价格标签）"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                />
                <button
                  className="toolbar-btn primary"
                  onClick={() => {
                    if (!tplName.trim()) return;
                    saveTemplate(tplName.trim());
                    setTplName('');
                    setTemplates(loadTemplates());
                  }}
                >
                  保存
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#86909c', marginTop: 6 }}>
                当前有 {items.length} 个元素，尺寸 {labelConfig.labelWidth}×{labelConfig.labelHeight}mm
              </div>
            </div>

            {/* 已保存模板列表 */}
            <div style={{ fontSize: 12, color: '#86909c', marginBottom: 8 }}>已保存模板（{templates.length}）</div>
            {templates.length === 0 ? (
              <div style={{ fontSize: 12, color: '#c9cdd4', textAlign: 'center', padding: 20 }}>暂无保存的模板</div>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', marginBottom: 4, background: '#f7f8fa', borderRadius: 6 }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 'bold' }}>{tpl.name}</div>
                    <div style={{ fontSize: 11, color: '#86909c' }}>
                      {tpl.items.length} 元素 · {tpl.labelConfig.labelWidth}×{tpl.labelConfig.labelHeight}mm
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="toolbar-btn"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => { loadTemplateById(tpl.id); setShowTemplates(false); }}
                    >
                      加载
                    </button>
                    <button
                      className="toolbar-btn danger"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => { deleteTemplate(tpl.id); setTemplates(loadTemplates()); }}
                    >
                      删
                    </button>
                  </div>
                </div>
              ))
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="toolbar-btn" onClick={() => setShowTemplates(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
