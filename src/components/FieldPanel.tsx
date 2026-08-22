import { useState } from 'react';
import { useApp } from '../store/AppContext';
import type { Field, FieldType } from '../types';
import RecordPicker from './RecordPicker';

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
      {/* 记录选择器：插件内勾选记录（飞书 SDK 不支持多选） */}
      <RecordPicker />

      <div className="panel-header">
        <span>字段列表</span>
        <input
          type="text"
          className="field-search-inline"
          placeholder="搜索字段"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            fontSize: 11, width: 80, padding: '1px 4px',
            border: '1px solid #e5e6eb', borderRadius: 3, marginLeft: 'auto',
          }}
        />
      </div>

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
      {/* 添加元素：表格在上（醒目蓝底），静态文本在下；带底色 + 底边距，避免贴底看不见 */}
      <div className="add-actions">
        <button className="add-btn add-btn-table" onClick={addTable}>+ 添加表格</button>
        <button className="add-btn add-btn-static" onClick={addStaticText}>+ 添加静态文本</button>
      </div>

      {/* 仅在真实取数出错时提示，正常工作不展示任何诊断信息 */}
      {state.loadError && (
        <div className="rp-loaderr">{state.loadError}</div>
      )}
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
