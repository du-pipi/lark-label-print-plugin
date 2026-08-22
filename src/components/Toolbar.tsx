import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { labelPresets } from '../mock/data';
import type { LabelConfig } from '../types';

export default function Toolbar() {
  const { state, dispatch } = useApp();
  const { labelConfig, records, selectedRecordId, items } = state;
  const [showSettings, setShowSettings] = useState(false);

  const handlePrint = () => {
    // 动态写入 @page 尺寸，让打印机按标签纸实际大小出纸（而不是默认 A4）
    const pageW = labelConfig.labelWidth * labelConfig.columns
      + (labelConfig.columns - 1) * labelConfig.gapX
      + labelConfig.pageMarginLeft + labelConfig.pageMarginRight;
    const pageH = labelConfig.labelHeight * labelConfig.rows
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

    dispatch({ type: 'TOGGLE_PRINT_MODE', value: true });
    // 延迟一帧让 DOM 更新后再打印
    setTimeout(() => {
      window.print();
      // 打印后恢复编辑模式
      setTimeout(() => {
        dispatch({ type: 'TOGGLE_PRINT_MODE', value: false });
      }, 500);
    }, 100);
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

  // 记录下拉显示名：优先用第一个文本/数字字段的值，否则用 id
  const recordLabel = (r: typeof records[number]) => {
    const firstText = state.fields.find((f) => f.type === 'text' || f.type === 'number');
    const v = firstText ? r.fields[firstText.id] : undefined;
    return (v !== undefined && v !== '') ? String(v) : r.id;
  };

  return (
    <>
      <div className="toolbar no-print">
        <div className="toolbar-left">
          <span className="toolbar-title">🏷️ 商品标签打印</span>
          {state.tableName && (
            <span style={{ fontSize: 11, color: '#86909c' }}>· {state.tableName}</span>
          )}
          {state.dataSource === 'feishu' && (
            <span style={{ fontSize: 11, color: '#00b42a' }}>· 已接入飞书</span>
          )}
          {state.dataSource === 'mock' && (
            <span style={{ fontSize: 11, color: '#ff7d00' }}>· 演示数据</span>
          )}
          <div className="toolbar-divider" />
          <div className="record-selector">
            <label>预览记录:</label>
            <select
              className="toolbar-select"
              value={selectedRecordId}
              onChange={(e) => dispatch({ type: 'SELECT_RECORD', id: e.target.value })}
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {recordLabel(r)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar-right">
          <button className="toolbar-btn" onClick={() => setShowSettings(true)}>
            ⚙️ 标签设置
          </button>
          <button className="toolbar-btn danger" onClick={handleClear}>
            🗑️ 清空
          </button>
          <div className="toolbar-divider" />
          <button className="toolbar-btn primary" onClick={handlePrint}>
            🖨️ 打印
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
              borderRadius: 12,
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
    </>
  );
}
