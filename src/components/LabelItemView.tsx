import { useRef, useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import type { LabelItem, TableCell } from '../types';
import { mmToPx, ptToPx, getDisplayValue } from '../utils';
import { BarcodeView, QrcodeView } from './Barcode';
import { Icon } from './Icon';

interface Props {
  item: LabelItem;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  recordId?: string;  // 批量模式：指定记录取值；不传则用 selectedRecordId
  readOnly?: boolean; // 批量预览模式：禁用拖拽/缩放
}

export default function LabelItemView({ item, scale, isSelected, onSelect, recordId, readOnly }: Props) {
  const { dispatch, getFieldValue, state } = useApp();
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  // 对齐吸附辅助线（拖动时显示）
  const [guides, setGuides] = useState<{ v?: number; h?: number }>({});
  const dragStart = useRef({ x: 0, y: 0, itemX: 0, itemY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const isLockedPosition = !!item.lockedPosition;

  // 元素位置（mm -> px * scale）
  const style: React.CSSProperties = {
    left: `${mmToPx(item.x) * scale}px`,
    top: `${mmToPx(item.y) * scale}px`,
    width: `${mmToPx(item.width) * scale}px`,
    height: `${mmToPx(item.height) * scale}px`,
    fontSize: `${ptToPx(item.fontSize) * scale}px`,
    fontWeight: item.fontWeight,
    fontStyle: item.fontStyle,
    color: item.color,
    textAlign: item.textAlign,
    justifyContent:
      item.textAlign === 'center' ? 'center' :
      item.textAlign === 'right' ? 'flex-end' : 'flex-start',
    alignItems:
      item.verticalAlign === 'middle' ? 'center' :
      item.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
    lineHeight: item.lineHeight,
    borderStyle: item.borderStyle,
    borderWidth: item.borderStyle !== 'none' ? `${item.borderWidth * scale}px` : 0,
    borderColor: item.borderColor,
    borderRadius: `${item.borderRadius * scale}px`,
    padding: `${item.padding * scale}px`,
    backgroundColor: item.backgroundColor === 'transparent' ? undefined : item.backgroundColor,
  };

  // 拖动元素（位置锁定时不可拖）
  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly || isLockedPosition) return;
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      itemX: item.x,
      itemY: item.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.x) / mmToPx(1) / scale;
      const dy = (e.clientY - dragStart.current.y) / mmToPx(1) / scale;
      let newX = Math.max(0, Math.round((dragStart.current.itemX + dx) * 10) / 10);
      let newY = Math.max(0, Math.round((dragStart.current.itemY + dy) * 10) / 10);

      // 对齐吸附：检测与其他元素边缘/中心、画布边缘的对齐
      const threshold = 1; // 1mm 吸附阈值
      const newGuides: { v?: number; h?: number } = {};
      const lc = state.labelConfig;
      // 画布中心线
      const canvasCenterX = lc.labelWidth / 2;
      const canvasCenterY = lc.labelHeight / 2;
      // 当前元素中心
      const itemCenterX = newX + item.width / 2;
      const itemCenterY = newY + item.height / 2;

      // 吸附到画布中心
      if (Math.abs(itemCenterX - canvasCenterX) < threshold) {
        newX = canvasCenterX - item.width / 2;
        newGuides.v = canvasCenterX;
      }
      if (Math.abs(itemCenterY - canvasCenterY) < threshold) {
        newY = canvasCenterY - item.height / 2;
        newGuides.h = canvasCenterY;
      }
      // 吸附到画布边缘
      if (Math.abs(newX) < threshold) { newX = 0; newGuides.v = 0; }
      if (Math.abs(newY) < threshold) { newY = 0; newGuides.h = 0; }
      if (Math.abs(newX + item.width - lc.labelWidth) < threshold) {
        newX = lc.labelWidth - item.width; newGuides.v = lc.labelWidth;
      }
      if (Math.abs(newY + item.height - lc.labelHeight) < threshold) {
        newY = lc.labelHeight - item.height; newGuides.h = lc.labelHeight;
      }
      // 吸附到其他元素
      for (const other of state.items) {
        if (other.id === item.id) continue;
        // 水平对齐：左边缘、中心、右边缘
        const otherLeft = other.x;
        const otherCenterX = other.x + other.width / 2;
        const otherRight = other.x + other.width;
        if (Math.abs(newX - otherLeft) < threshold) { newX = otherLeft; newGuides.v = otherLeft; }
        if (Math.abs(itemCenterX - otherCenterX) < threshold) { newX = otherCenterX - item.width / 2; newGuides.v = otherCenterX; }
        if (Math.abs(newX + item.width - otherRight) < threshold) { newX = otherRight - item.width; newGuides.v = otherRight; }
        // 垂直对齐
        const otherTop = other.y;
        const otherCenterY = other.y + other.height / 2;
        const otherBottom = other.y + other.height;
        if (Math.abs(newY - otherTop) < threshold) { newY = otherTop; newGuides.h = otherTop; }
        if (Math.abs(itemCenterY - otherCenterY) < threshold) { newY = otherCenterY - item.height / 2; newGuides.h = otherCenterY; }
        if (Math.abs(newY + item.height - otherBottom) < threshold) { newY = otherBottom - item.height; newGuides.h = otherBottom; }
      }
      setGuides(newGuides);
      dispatch({ type: 'MOVE_ITEM', id: item.id, x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setGuides({});
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, item.id, item.width, item.height, scale, dispatch, state.items, state.labelConfig]);

  // 调整大小（位置锁定不锁缩放，表格可调大小）
  const handleResizeStart = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    onSelect();
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: item.width,
      h: item.height,
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dw = (e.clientX - resizeStart.current.x) / mmToPx(1) / scale;
      const dh = (e.clientY - resizeStart.current.y) / mmToPx(1) / scale;
      const newW = Math.max(5, Math.round((resizeStart.current.w + dw) * 10) / 10);
      const newH = Math.max(3, Math.round((resizeStart.current.h + dh) * 10) / 10);
      dispatch({ type: 'RESIZE_ITEM', id: item.id, width: newW, height: newH });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, item.id, scale, dispatch]);

  // 渲染内容
  const renderContent = () => {
    // 表格渲染：整体作为标签上的一个元素，内部用 grid 画 N×M 单元格
    if (item.type === 'table') {
      const rows = item.tableRows || 1;
      const cols = item.tableCols || 1;
      const cells = item.tableCells || [];
      const fontSizePx = ptToPx(item.tableFontSize ?? item.fontSize) * scale;
      const bw = Math.max(0, (item.tableBorderWidth ?? 0.5)); // 逻辑边框宽
      const bwPx = `${bw * scale}px`;
      // 列宽：tableColWidths 指定比例，未设则等宽
      const colWidths = item.tableColWidths && item.tableColWidths.length === cols
        ? item.tableColWidths
        : Array(cols).fill(1);
      const gridCols = colWidths.map((w) => `${w}fr`).join(' ');

      const renderTableCell = (cell?: TableCell): { text: string; placeholder: boolean } => {
        if (!cell) return { text: '', placeholder: false };
        if (cell.fieldId) {
          const f = state.fields.find((x) => x.id === cell.fieldId);
          const raw = getFieldValue(cell.fieldId, recordId);
          const val = getDisplayValue(f?.type ?? 'text', raw);
          if (!val) return { text: f?.name ?? '', placeholder: true };
          return { text: (cell.prefix || '') + val, placeholder: false };
        }
        return { text: cell.staticText, placeholder: false };
      };

      return (
        <div
          className="label-item-content"
          style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            width: '100%',
            height: '100%',
            fontSize: `${fontSizePx}px`,
            pointerEvents: 'none',
            // 外边框由容器提供（top + left），单元格提供 right + bottom，避免重叠双倍
            ...(item.tableShowBorder && bw > 0 ? {
              borderTop: `${bwPx} solid #000`,
              borderLeft: `${bwPx} solid #000`,
            } : {}),
          }}
        >
          {Array.from({ length: rows * cols }, (_, idx) => {
            const cell = cells[idx];
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            const isHeader = !!item.tableHeader && r === 0;
            const { text, placeholder } = renderTableCell(cell);
            return (
              <div
                key={idx}
                className="label-table-cell"
                style={{
                  // 内部边框：每个单元格画 right + bottom（最后一列/行不画，由容器外框闭合）
                  ...(item.tableShowBorder && bw > 0 ? {
                    borderRight: c < cols - 1 ? `${bwPx} solid #000` : `${bwPx} solid #000`,
                    borderBottom: `${bwPx} solid #000`,
                  } : {}),
                  ...(isHeader ? { fontWeight: 'bold', background: '#f2f3f5' } : {}),
                  textAlign: item.textAlign,
                  color: placeholder ? '#c9cdd4' : item.color,
                  display: 'flex',
                  alignItems: item.verticalAlign === 'middle' ? 'center' : item.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
                  justifyContent:
                    item.textAlign === 'center' ? 'center' : item.textAlign === 'right' ? 'flex-end' : 'flex-start',
                  padding: `${(item.tableCellPaddingV ?? 2) * scale}px ${(item.tableCellPaddingH ?? 3) * scale}px`,
                  overflow: 'hidden',
                  wordBreak: 'break-all',
                }}
              >
                {text}
              </div>
            );
          })}
        </div>
      );
    }

    const value = item.isStatic ? (item.staticText || '') : getFieldValue(item.fieldId, recordId);

    if (item.type === 'image') {
      const imgUrl = typeof value === 'string' ? value : '';
      return (
        <div className="label-item-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
          {imgUrl ? (
            <img src={imgUrl} alt="" className="label-image" style={{ objectFit: item.objectFit }} />
          ) : (
            <span style={{ color: '#c9cdd4', fontSize: `${8 * scale}px` }}>图片</span>
          )}
        </div>
      );
    }

    if (item.type === 'barcode') {
      const code = String(value || '');
      const pxW = Math.max(40, mmToPx(item.width) * scale);
      const pxH = Math.max(12, mmToPx(item.height) * scale);
      return (
        <div className="label-item-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <BarcodeView value={code} width={pxW} height={pxH} scale={scale} />
        </div>
      );
    }

    if (item.type === 'qrcode') {
      const code = String(value || '');
      const pxSize = Math.max(24, Math.min(mmToPx(item.width) * scale, mmToPx(item.height) * scale));
      return (
        <div className="label-item-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <QrcodeView value={code} size={pxSize} />
        </div>
      );
    }

    // 文本/数字/日期/选择
    const displayValue = item.isStatic ? String(value) : getDisplayValue(item.type, value);
    return (
      <div className="label-item-content" style={{
        alignItems: item.verticalAlign === 'middle' ? 'center' : item.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
      }}>
        <span style={{ width: '100%', textAlign: item.textAlign }}>
          {displayValue || <span style={{ color: '#c9cdd4' }}>{item.fieldName}</span>}
        </span>
      </div>
    );
  };

  return (
    <div
      ref={itemRef}
      className={`label-item ${isSelected ? 'selected' : ''} ${isLockedPosition ? 'locked-position' : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
    >
      {renderContent()}
      {/* 对齐吸附辅助线 */}
      {isDragging && guides.v !== undefined && (
        <div style={{
          position: 'absolute', left: `${mmToPx(guides.v) * scale}px`, top: -2,
          width: 0, height: '200%', borderLeft: '1px dashed #165dff',
          pointerEvents: 'none', zIndex: 9999,
        }} />
      )}
      {isDragging && guides.h !== undefined && (
        <div style={{
          position: 'absolute', top: `${mmToPx(guides.h) * scale}px`, left: -2,
          height: 0, width: '200%', borderTop: '1px dashed #165dff',
          pointerEvents: 'none', zIndex: 9999,
        }} />
      )}
      {/* 位置锁定标记（仅屏幕显示，打印隐藏） */}
      {isLockedPosition && (
        <div className="lock-badge" style={{
          position: 'absolute', top: 2, right: 2, fontSize: 8, color: '#86909c',
          background: 'rgba(255,255,255,0.8)', borderRadius: 2, padding: '0 2px',
          pointerEvents: 'none',
        }}><Icon name="lock" size={10} /></div>
      )}
      {isSelected && !readOnly && (
        <>
          <div className="resize-handle e" onMouseDown={handleResizeStart} />
          <div className="resize-handle s" onMouseDown={handleResizeStart} />
          <div className="resize-handle se" onMouseDown={handleResizeStart} />
        </>
      )}
    </div>
  );
}
