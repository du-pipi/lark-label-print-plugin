import { useState } from 'react';
import { useApp } from '../store/AppContext';

// 记录选择器：插件内自行管理勾选（飞书 SDK Selection 不支持多选）
// 样式采用飞书 UI 设计语言；搜索按「角色名称」字段进行，无默认列表，输入后显示候选。
export default function RecordPicker() {
  const { state, toggleBatchRecord, selectAllRecords, clearBatch, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  const { records, batchRecordIds, fields, selectedRecordId } = state;

  // 搜索字段：优先用「角色名称」字段，找不到则回退第一个文本/数字字段
  const roleField =
    fields.find((f) => f.name.includes('角色名称')) ||
    fields.find((f) => f.type === 'text' || f.type === 'number');

  // 用搜索字段的值作为记录显示名
  const recordLabel = (r: typeof records[number]): string => {
    if (roleField) {
      const v = r.fields[roleField.id];
      const vName = r.fields[roleField.name];
      const val = v !== undefined && v !== '' ? v : vName;
      if (val !== undefined && val !== '') return String(val);
    }
    return r.id.slice(0, 8);
  };

  const kw = search.trim().toLowerCase();
  // 不提供默认显示：只有输入搜索后才展示候选
  const filtered = kw
    ? records.filter((r) => recordLabel(r).toLowerCase().includes(kw))
    : [];

  const selectedCount = batchRecordIds.length;

  return (
    <div className="rp no-print">
      <button
        type="button"
        className={`rp-toggle ${expanded ? 'open' : ''}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="rp-caret">{expanded ? '▾' : '▸'}</span>
        <span className="rp-title">选择记录</span>
        {selectedCount > 0 && <span className="rp-badge">{selectedCount}</span>}
        {selectedCount > 0 && (
          <span
            className="rp-clear"
            onClick={(e) => {
              e.stopPropagation();
              clearBatch();
            }}
          >
            清空
          </span>
        )}
      </button>

      {expanded && (
        <div className="rp-body">
          <div className="rp-search">
            <span className="rp-search-ico">🔍</span>
            <input
              type="text"
              className="rp-input"
              placeholder={roleField ? `搜索「${roleField.name}」…` : '搜索记录…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <span className="rp-search-clear" onClick={() => setSearch('')}>
                ✕
              </span>
            )}
          </div>

          <div className="rp-list">
            {kw === '' ? (
              <div className="rp-empty">
                输入{roleField ? `「${roleField.name}」` : '关键词'}后显示候选记录
              </div>
            ) : filtered.length === 0 ? (
              <div className="rp-empty">未找到匹配的记录</div>
            ) : (
              filtered.slice(0, 100).map((r) => {
                const checked = batchRecordIds.includes(r.id);
                const isPreview = selectedRecordId === r.id && !checked;
                return (
                  <div
                    key={r.id}
                    className={`rp-row ${checked ? 'on' : ''} ${isPreview ? 'pv' : ''}`}
                    onClick={() => {
                      toggleBatchRecord(r.id);
                      if (!checked) dispatch({ type: 'SELECT_RECORD', id: r.id });
                    }}
                  >
                    <span className={`rp-check ${checked ? 'on' : ''}`}>{checked ? '✓' : ''}</span>
                    <span className="rp-row-label">{recordLabel(r)}</span>
                  </div>
                );
              })
            )}
          </div>

          {filtered.length > 100 && (
            <div className="rp-more">仅显示前 100 条，请缩小搜索范围</div>
          )}

          <div className="rp-foot">
            <button
              type="button"
              className="rp-foot-btn"
              disabled={filtered.length === 0}
              onClick={() => selectAllRecords(filtered.map((r) => r.id))}
            >
              全选
            </button>
            <span className="rp-foot-info">已选 {selectedCount} 条</span>
          </div>
        </div>
      )}
    </div>
  );
}
