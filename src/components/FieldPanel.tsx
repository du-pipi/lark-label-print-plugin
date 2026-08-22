import { useState } from 'react';
import { useApp } from '../store/AppContext';
import type { Field, FieldType } from '../types';

const typeLabels: Record<FieldType, string> = {
  text: '文',
  number: '数',
  image: '图',
  barcode: '条',
  qrcode: '码',
  date: '日',
  select: '选',
  table: '表',
};

export default function FieldPanel() {
  const { state, addItemFromField, addStaticText, addTable, getFieldValue } = useApp();
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // 字段搜索过滤
  const filteredFields = search.trim()
    ? state.fields.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : state.fields;

  const handleDragStart = (e: React.DragEvent, field: Field) => {
    e.dataTransfer.setData('fieldId', field.id);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingField(field.id);
  };

  const handleDragEnd = () => setDraggingField(null);
  const handleDoubleClick = (field: Field) => addItemFromField(field);

  return (
    <div className="field-panel no-print">
      <div className="panel-header">
        <span>字段列表</span>
        <span style={{ fontSize: 11, color: '#86909c' }}>{state.fields.length} 个</span>
      </div>

      {/* 字段搜索框 */}
      <input
        type="text"
        className="property-input field-search"
        placeholder="🔍 搜索字段..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: 8, padding: '4px 8px' }}
      />

      <div className="field-list">
        {filteredFields.length === 0 ? (
          <div style={{ fontSize: 12, color: '#c9cdd4', textAlign: 'center', padding: 20 }}>无匹配字段</div>
        ) : (
          filteredFields.map((field) => {
            // 字段值预览（当前选中记录的值）
            const previewVal = getFieldValue(field.id);
            const previewStr = previewVal !== '' && previewVal !== undefined ? String(previewVal) : '';
            const truncated = previewStr.length > 20 ? previewStr.slice(0, 20) + '…' : previewStr;
            return (
              <div
                key={field.id}
                className={`field-item ${draggingField === field.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, field)}
                onDragEnd={handleDragEnd}
                onDoubleClick={() => handleDoubleClick(field)}
                title={`${field.name}（拖拽到标签，或双击添加）`}
              >
                <span className={`field-icon ${field.type}`}>{typeLabels[field.type]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="field-name">{field.name}</div>
                  {truncated && (
                    <div style={{ fontSize: 10, color: '#86909c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {truncated}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <button className="add-static-btn" onClick={() => addStaticText()}>+ 添加静态文本</button>
      <button className="add-static-btn" onClick={() => addTable()} style={{ marginTop: 0 }}>+ 添加表格</button>

      {/* 字段诊断面板：任何情况都显示，暴露飞书原始值结构与取数错误，定位"字段名显示但值取不到"问题 */}
      <div style={{ marginTop: 8, borderTop: '1px solid #e5e6eb', paddingTop: 8 }}>
        <div style={{ fontSize: 11, color: '#86909c', marginBottom: 4 }}>
          <div>数据源: <b style={{ color: state.dataSource === 'feishu' ? '#009a29' : '#ff7d00' }}>{state.dataSource === 'feishu' ? '飞书真实数据' : (state.tableName.includes('演示') ? 'Mock 演示' : '未知/回退')}</b></div>
          <div>记录数: <b style={{ color: state.records.length > 0 ? '#009a29' : '#f53f3f' }}>{state.records.length}</b> · 字段数: <b>{state.fields.length}</b></div>
          {state.loadError && (
            <div style={{ color: '#f53f3f', marginTop: 4, wordBreak: 'break-all' }}>
              ⚠️ {state.loadError}
            </div>
          )}
        </div>
        {(state.diag.length > 0 || state.loading) && (
          <details>
            <summary style={{ fontSize: 12, color: '#4e5969', cursor: 'pointer', userSelect: 'none' }}>
              🔍 字段诊断{state.diag.length > 0 ? `（${state.diag.length} 个 · 空值 ${state.diag.filter((d) => d.isEmpty).length} 个）` : '（加载中…）'}
            </summary>
            <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 6 }}>
              {state.diag.map((d, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: '4px 6px',
                    marginBottom: 3,
                    background: d.isEmpty ? '#fff7e8' : '#f7f8fa',
                    borderLeft: `3px solid ${d.isEmpty ? '#ff7d00' : '#00b42a'}`,
                    borderRadius: 3,
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#1d2129' }}>
                    {d.name}{' '}
                    <span style={{ color: '#86909c', fontWeight: 'normal' }}>
                      · {d.feishuTypeName}（type={d.feishuTypeId}）
                    </span>
                  </div>
                  <div style={{ color: '#4e5969', marginTop: 2, wordBreak: 'break-all' }}>
                    <span style={{ color: '#86909c' }}>原始:</span>{' '}
                    <code>{safeStringify(d.rawValue)}</code>
                  </div>
                  <div style={{ color: '#4e5969' }}>
                    <span style={{ color: '#86909c' }}>解析:</span>{' '}
                    <span
                      style={{
                        color: d.isEmpty ? '#f53f3f' : '#009a29',
                        fontWeight: d.isEmpty ? 'normal' : 'bold',
                      }}
                    >
                      {d.isEmpty ? '（空）' : String(d.parsedValue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// 安全序列化（处理 undefined / 循环引用 / bigint）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeStringify(val: any): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  try {
    return JSON.stringify(val, (_, v) => (typeof v === 'bigint' ? String(v) : v), 0);
  } catch {
    return String(val);
  }
}
