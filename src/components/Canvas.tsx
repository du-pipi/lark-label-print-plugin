import { useState, useRef } from 'react';
import { useApp } from '../store/AppContext';
import LabelItemView from './LabelItemView';
import { mmToPx } from '../utils';

export default function Canvas() {
  const { state, dispatch, addItemFromField } = useApp();
  const { items, selectedItemId, labelConfig, fields } = state;
  const [scale, setScale] = useState(1.5);
  const [dragOverCell, setDragOverCell] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // 计算页面尺寸
  const pageWidth = labelConfig.pageMarginLeft + labelConfig.pageMarginRight +
    labelConfig.columns * labelConfig.labelWidth +
    (labelConfig.columns - 1) * labelConfig.gapX;
  const pageHeight = labelConfig.pageMarginTop + labelConfig.pageMarginBottom +
    labelConfig.rows * labelConfig.labelHeight +
    (labelConfig.rows - 1) * labelConfig.gapY;

  const pageStyle: React.CSSProperties = {
    width: `${mmToPx(pageWidth) * scale}px`,
    height: `${mmToPx(pageHeight) * scale}px`,
    padding: `${mmToPx(labelConfig.pageMarginTop) * scale}px ${mmToPx(labelConfig.pageMarginRight) * scale}px ${mmToPx(labelConfig.pageMarginBottom) * scale}px ${mmToPx(labelConfig.pageMarginLeft) * scale}px`,
  };

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${labelConfig.columns}, ${mmToPx(labelConfig.labelWidth) * scale}px)`,
    gridTemplateRows: `repeat(${labelConfig.rows}, ${mmToPx(labelConfig.labelHeight) * scale}px)`,
    columnGap: `${mmToPx(labelConfig.gapX) * scale}px`,
    rowGap: `${mmToPx(labelConfig.gapY) * scale}px`,
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('label-cell')) {
      dispatch({ type: 'SELECT_ITEM', id: null });
    }
  };

  const handleDragOver = (e: React.DragEvent, cellIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverCell(cellIndex);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, cellIndex: number) => {
    e.preventDefault();
    setDragOverCell(null);
    const fieldId = e.dataTransfer.getData('fieldId');
    if (!fieldId) return;

    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    // 计算放置位置（相对于标签的 mm 坐标）
    const cellEl = e.currentTarget as HTMLElement;
    const rect = cellEl.getBoundingClientRect();
    const x = Math.max(0, (e.clientX - rect.left) / mmToPx(1) / scale);
    const y = Math.max(0, (e.clientY - rect.top) / mmToPx(1) / scale);

    addItemFromField(field, Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  const zoomIn = () => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)));
  const zoomReset = () => setScale(1.5);

  // 生成标签单元格
  const totalCells = labelConfig.columns * labelConfig.rows;
  const cells = Array.from({ length: totalCells }, (_, i) => i);

  return (
    <div className="canvas-area" ref={canvasRef} onClick={handleCanvasClick}>
      <div className="canvas-wrapper">
        <div className="canvas-page" style={pageStyle}>
          <div className="label-grid" style={gridStyle}>
            {cells.map((cellIndex) => (
              <div
                key={cellIndex}
                className={`label-cell edit-mode ${dragOverCell === cellIndex ? 'drag-over' : ''}`}
                style={{ background: labelConfig.background }}
                onDragOver={(e) => handleDragOver(e, cellIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, cellIndex)}
              >
                {items.map((item) => (
                  <LabelItemView
                    key={item.id}
                    item={item}
                    scale={scale}
                    isSelected={selectedItemId === item.id}
                    onSelect={() => dispatch({ type: 'SELECT_ITEM', id: item.id })}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="canvas-controls no-print">
          <button className="zoom-btn" onClick={zoomOut} title="缩小">−</button>
          <span className="zoom-level" onClick={zoomReset} style={{ cursor: 'pointer' }}>
            {Math.round(scale * 100)}%
          </span>
          <button className="zoom-btn" onClick={zoomIn} title="放大">+</button>
          <span style={{ fontSize: 11, color: '#86909c', marginLeft: 8 }}>
            {labelConfig.labelWidth}×{labelConfig.labelHeight}mm · {labelConfig.columns}×{labelConfig.rows}
          </span>
        </div>
      </div>
    </div>
  );
}
