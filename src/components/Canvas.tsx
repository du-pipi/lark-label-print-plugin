import { useState, useRef } from 'react';
import { useApp } from '../store/AppContext';
import LabelItemView from './LabelItemView';
import { mmToPx } from '../utils';

export default function Canvas() {
  const { state, dispatch, addItemFromField } = useApp();
  const { items, selectedItemId, labelConfig, fields, batchRecordIds } = state;
  const [scale, setScale] = useState(1.5);
  const [dragOverCell, setDragOverCell] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // 是否批量预览模式（勾选了多条记录）
  const isBatchMode = batchRecordIds.length > 1;

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
        {/* 批量预览模式：展示所有勾选记录的标签 */}
        {isBatchMode && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#e8f3ff', borderRadius: 8, fontSize: 12, color: '#165dff' }}>
            📋 批量预览：已选中 {batchRecordIds.length} 条记录，每条按模板生成一个标签。点击「🖨️ 批量打印」输出全部。
          </div>
        )}

        {/* 批量预览区域：每条记录一个标签，纵向排列 */}
        {isBatchMode && batchRecordIds.map((rid, batchIdx) => (
          <div
            key={rid}
            className="batch-label-page"
            style={{
              width: `${mmToPx(labelConfig.labelWidth) * scale}px`,
              height: `${mmToPx(labelConfig.labelHeight) * scale}px`,
              background: labelConfig.background,
              border: '1px dashed #c9cdd4',
              marginBottom: `${mmToPx(5) * scale}px`,
              position: 'relative',
              overflow: 'hidden',
              breakAfter: 'page' as React.CSSProperties['breakAfter'],
              pageBreakAfter: 'always' as React.CSSProperties['pageBreakAfter'],
            }}
          >
            {/* 标签序号 */}
            <div style={{ position: 'absolute', top: -16, left: 0, fontSize: 10, color: '#86909c' }}>
              #{batchIdx + 1}
            </div>
            {items.map((item) => (
              <LabelItemView
                key={item.id}
                item={item}
                scale={scale}
                isSelected={false}
                onSelect={() => {}}
                recordId={rid}
                readOnly
              />
            ))}
          </div>
        ))}

        {/* 编辑模式：单标签编辑画布（批量模式时隐藏） */}
        {!isBatchMode && (
          <>
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
          </>
        )}

        <div className="canvas-controls no-print">
          <button className="zoom-btn" onClick={zoomOut} title="缩小">−</button>
          <span className="zoom-level" onClick={zoomReset} style={{ cursor: 'pointer' }}>
            {Math.round(scale * 100)}%
          </span>
          <button className="zoom-btn" onClick={zoomIn} title="放大">+</button>
          <span style={{ fontSize: 11, color: '#86909c', marginLeft: 8 }}>
            {labelConfig.labelWidth}×{labelConfig.labelHeight}mm
            {isBatchMode ? ` · 批量 ${batchRecordIds.length} 条` : ` · ${labelConfig.columns}×${labelConfig.rows}`}
          </span>
        </div>
      </div>
    </div>
  );
}
