import { useApp } from '../store/AppContext';
import type { LabelItem } from '../types';

export default function PropertyPanel() {
  const { state, dispatch } = useApp();
  const { selectedItemId, items } = state;
  const selectedItem = items.find((it) => it.id === selectedItemId);

  if (!selectedItem) {
    return (
      <div className="property-panel no-print">
        <div className="panel-header">属性设置</div>
        <div className="empty-property">
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div>选中标签中的元素</div>
          <div style={{ marginTop: 4, fontSize: 11 }}>可调整位置、大小、字体、颜色等</div>
        </div>
      </div>
    );
  }

  const update = (patch: Partial<LabelItem>) => {
    dispatch({ type: 'UPDATE_ITEM', id: selectedItem.id, patch });
  };

  const handleDelete = () => {
    dispatch({ type: 'DELETE_ITEM', id: selectedItem.id });
  };

  const isTextType = ['text', 'number', 'date', 'select'].includes(selectedItem.type);

  return (
    <div className="property-panel no-print">
      <div className="panel-header">
        <span>属性设置</span>
        <span style={{ fontSize: 11, color: '#86909c', fontWeight: 'normal' }}>
          {selectedItem.isStatic ? '静态文本' : selectedItem.fieldName}
        </span>
      </div>

      {/* 位置和尺寸 */}
      <div className="property-section">
        <div className="property-section-title">位置与尺寸</div>
        <div className="property-row">
          <span className="property-label">X (mm)</span>
          <input
            type="number"
            className="property-input"
            value={selectedItem.x}
            step={0.5}
            onChange={(e) => update({ x: parseFloat(e.target.value) || 0 })}
          />
          <span className="property-label">Y (mm)</span>
          <input
            type="number"
            className="property-input"
            value={selectedItem.y}
            step={0.5}
            onChange={(e) => update({ y: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="property-row">
          <span className="property-label">宽 (mm)</span>
          <input
            type="number"
            className="property-input"
            value={selectedItem.width}
            step={0.5}
            min={5}
            onChange={(e) => update({ width: parseFloat(e.target.value) || 5 })}
          />
          <span className="property-label">高 (mm)</span>
          <input
            type="number"
            className="property-input"
            value={selectedItem.height}
            step={0.5}
            min={3}
            onChange={(e) => update({ height: parseFloat(e.target.value) || 3 })}
          />
        </div>
      </div>

      {/* 静态文本编辑 */}
      {selectedItem.isStatic && (
        <div className="property-section">
          <div className="property-section-title">文本内容</div>
          <textarea
            className="static-text-input"
            value={selectedItem.staticText || ''}
            onChange={(e) => update({ staticText: e.target.value })}
            placeholder="输入静态文本..."
          />
        </div>
      )}

      {/* 文字样式 */}
      {isTextType && (
        <div className="property-section">
          <div className="property-section-title">文字样式</div>
          <div className="property-row">
            <span className="property-label">字号</span>
            <input
              type="number"
              className="property-input"
              value={selectedItem.fontSize}
              min={4}
              max={72}
              onChange={(e) => update({ fontSize: parseInt(e.target.value) || 10 })}
            />
            <span style={{ fontSize: 11, color: '#86909c' }}>pt</span>
            <span className="property-label" style={{ width: 'auto', marginLeft: 8 }}>行高</span>
            <input
              type="number"
              className="property-input"
              value={selectedItem.lineHeight}
              step={0.1}
              min={1}
              max={3}
              onChange={(e) => update({ lineHeight: parseFloat(e.target.value) || 1.3 })}
            />
          </div>
          <div className="property-row">
            <span className="property-label">颜色</span>
            <input
              type="color"
              className="property-input"
              value={selectedItem.color}
              onChange={(e) => update({ color: e.target.value })}
            />
            <div className="property-btn-group" style={{ marginLeft: 8 }}>
              <button
                className={`property-btn ${selectedItem.fontWeight === 'bold' ? 'active' : ''}`}
                onClick={() => update({ fontWeight: selectedItem.fontWeight === 'bold' ? 'normal' : 'bold' })}
                style={{ fontWeight: 'bold' }}
              >
                B
              </button>
              <button
                className={`property-btn ${selectedItem.fontStyle === 'italic' ? 'active' : ''}`}
                onClick={() => update({ fontStyle: selectedItem.fontStyle === 'italic' ? 'normal' : 'italic' })}
                style={{ fontStyle: 'italic' }}
              >
                I
              </button>
            </div>
          </div>
          <div className="property-row">
            <span className="property-label">水平</span>
            <div className="property-btn-group" style={{ flex: 1 }}>
              <button
                className={`property-btn ${selectedItem.textAlign === 'left' ? 'active' : ''}`}
                onClick={() => update({ textAlign: 'left' })}
              >
                左
              </button>
              <button
                className={`property-btn ${selectedItem.textAlign === 'center' ? 'active' : ''}`}
                onClick={() => update({ textAlign: 'center' })}
              >
                中
              </button>
              <button
                className={`property-btn ${selectedItem.textAlign === 'right' ? 'active' : ''}`}
                onClick={() => update({ textAlign: 'right' })}
              >
                右
              </button>
            </div>
          </div>
          <div className="property-row">
            <span className="property-label">垂直</span>
            <div className="property-btn-group" style={{ flex: 1 }}>
              <button
                className={`property-btn ${selectedItem.verticalAlign === 'top' ? 'active' : ''}`}
                onClick={() => update({ verticalAlign: 'top' })}
              >
                上
              </button>
              <button
                className={`property-btn ${selectedItem.verticalAlign === 'middle' ? 'active' : ''}`}
                onClick={() => update({ verticalAlign: 'middle' })}
              >
                中
              </button>
              <button
                className={`property-btn ${selectedItem.verticalAlign === 'bottom' ? 'active' : ''}`}
                onClick={() => update({ verticalAlign: 'bottom' })}
              >
                下
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 图片/条码设置 */}
      {selectedItem.type === 'image' && (
        <div className="property-section">
          <div className="property-section-title">图片设置</div>
          <div className="property-row">
            <span className="property-label">填充</span>
            <select
              className="property-select"
              value={selectedItem.objectFit}
              onChange={(e) => update({ objectFit: e.target.value as LabelItem['objectFit'] })}
            >
              <option value="contain">包含</option>
              <option value="cover">覆盖</option>
              <option value="fill">拉伸</option>
            </select>
          </div>
        </div>
      )}

      {/* 边框 */}
      <div className="property-section">
        <div className="property-section-title">边框与背景</div>
        <div className="property-row">
          <span className="property-label">样式</span>
          <select
            className="property-select"
            value={selectedItem.borderStyle}
            onChange={(e) => update({ borderStyle: e.target.value as LabelItem['borderStyle'] })}
          >
            <option value="none">无</option>
            <option value="solid">实线</option>
            <option value="dashed">虚线</option>
            <option value="dotted">点线</option>
          </select>
        </div>
        {selectedItem.borderStyle !== 'none' && (
          <>
            <div className="property-row">
              <span className="property-label">宽度</span>
              <input
                type="number"
                className="property-input"
                value={selectedItem.borderWidth}
                min={1}
                max={10}
                onChange={(e) => update({ borderWidth: parseInt(e.target.value) || 1 })}
              />
              <span style={{ fontSize: 11, color: '#86909c' }}>px</span>
              <span className="property-label" style={{ width: 'auto', marginLeft: 8 }}>颜色</span>
              <input
                type="color"
                className="property-input"
                value={selectedItem.borderColor}
                onChange={(e) => update({ borderColor: e.target.value })}
              />
            </div>
            <div className="property-row">
              <span className="property-label">圆角</span>
              <input
                type="number"
                className="property-input"
                value={selectedItem.borderRadius}
                min={0}
                max={50}
                onChange={(e) => update({ borderRadius: parseInt(e.target.value) || 0 })}
              />
              <span style={{ fontSize: 11, color: '#86909c' }}>px</span>
            </div>
          </>
        )}
        <div className="property-row">
          <span className="property-label">背景</span>
          <input
            type="color"
            className="property-input"
            value={selectedItem.backgroundColor === 'transparent' ? '#ffffff' : selectedItem.backgroundColor}
            onChange={(e) => update({ backgroundColor: e.target.value })}
          />
          <button
            className="property-btn"
            style={{ flex: 'none', padding: '4px 8px', marginLeft: 8 }}
            onClick={() => update({ backgroundColor: 'transparent' })}
          >
            透明
          </button>
        </div>
        <div className="property-row">
          <span className="property-label">内边距</span>
          <input
            type="number"
            className="property-input"
            value={selectedItem.padding}
            min={0}
            max={20}
            onChange={(e) => update({ padding: parseInt(e.target.value) || 0 })}
          />
          <span style={{ fontSize: 11, color: '#86909c' }}>px</span>
        </div>
      </div>

      {/* 层级 */}
      <div className="property-section">
        <div className="property-section-title">层级</div>
        <div className="property-row">
          <button
            className="property-btn"
            style={{ flex: 1 }}
            onClick={() => dispatch({ type: 'BRING_TO_FRONT', id: selectedItem.id })}
          >
            置顶
          </button>
          <button
            className="property-btn"
            style={{ flex: 1 }}
            onClick={() => dispatch({ type: 'SEND_TO_BACK', id: selectedItem.id })}
          >
            置底
          </button>
        </div>
      </div>

      {/* 删除 */}
      <div className="property-section">
        <button className="delete-btn" onClick={handleDelete}>
          删除元素
        </button>
      </div>
    </div>
  );
}
