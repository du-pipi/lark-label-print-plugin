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
};

export default function FieldPanel() {
  const { state, addItemFromField, addStaticText } = useApp();
  const [draggingField, setDraggingField] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, field: Field) => {
    e.dataTransfer.setData('fieldId', field.id);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingField(field.id);
  };

  const handleDragEnd = () => {
    setDraggingField(null);
  };

  const handleDoubleClick = (field: Field) => {
    addItemFromField(field);
  };

  return (
    <div className="field-panel no-print">
      <div className="panel-header">
        <span>字段列表</span>
        <span style={{ fontSize: 11, color: '#86909c' }}>
          {state.fields.length} 个
        </span>
      </div>
      <div className="field-list">
        {state.fields.map((field) => (
          <div
            key={field.id}
            className={`field-item ${draggingField === field.id ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, field)}
            onDragEnd={handleDragEnd}
            onDoubleClick={() => handleDoubleClick(field)}
            title={`${field.name}（拖拽到标签，或双击添加）`}
          >
            <span className={`field-icon ${field.type}`}>
              {typeLabels[field.type]}
            </span>
            <span className="field-name">{field.name}</span>
          </div>
        ))}
      </div>
      <button className="add-static-btn" onClick={() => addStaticText()}>
        + 添加静态文本
      </button>
    </div>
  );
}
