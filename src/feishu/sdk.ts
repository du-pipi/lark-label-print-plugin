// 飞书多维表格 SDK 接入层
// 负责：读取当前表的字段、记录，监听选中/表变化；把飞书字段类型映射为本插件的 FieldType。
// 数据安全红线：所有解析都在浏览器本地完成，不把多维表格数据发往任何外部服务。

import { bitable } from '@lark-base-open/js-sdk';
import type { Field, RecordData, FieldDiag } from '../types';

// 飞书字段类型枚举（FieldType$1，详见 SDK 类型定义）
// Text=1 Number=2 SingleSelect=3 MultiSelect=4 DateTime=5 Checkbox=7
// User=11 Phone=13 Url=15 Email=18 Barcode(条码)=? Attachment=?
// 注意：飞书多维表格没有"图片"专有类型，图片以"附件"字段存储。
const FEISHU_TEXT_TYPES = new Set([1, 15, 18]); // 文本/超链接/邮箱 -> text
const FEISHU_NUMBER_TYPES = new Set([2, 13]); // 数字/电话 -> number
const FEISHU_DATE_TYPES = new Set([5]); // 日期
const FEISHU_SELECT_TYPES = new Set([3, 4]); // 单选/多选 -> select
const FEISHU_ATTACHMENT_TYPES = new Set([11]); // 附件 -> image（默认当图片渲染，用户可手动改条码/二维码）

// 飞书字段类型 ID -> 可读名（用于诊断面板）
const FEISHU_TYPE_NAMES: Record<number, string> = {
  1: '多行文本',
  2: '数字',
  3: '单选',
  4: '多选',
  5: '日期',
  7: '复选框',
  11: '人员',
  13: '电话',
  15: '超链接',
  17: '附件',
  18: '地理位置',
  19: '群组',
  20: '关联记录',
  21: '查找引用',
  22: '公式',
  23: '双向关联',
  1001: '创建时间',
  1002: '修改时间',
  1003: '创建人',
  1004: '修改人',
  1005: '自动编号',
};

export function mapFeishuType(feishuType: number, name: string): Field['type'] {
  if (FEISHU_ATTACHMENT_TYPES.has(feishuType)) return 'image';
  if (FEISHU_NUMBER_TYPES.has(feishuType)) return 'number';
  if (FEISHU_DATE_TYPES.has(feishuType)) return 'date';
  if (FEISHU_SELECT_TYPES.has(feishuType)) return 'select';
  if (FEISHU_TEXT_TYPES.has(feishuType)) return 'text';
  // 兜底：纯文本（包含条码字段，用户可在属性面板手动切换成 barcode/qrcode）
  return 'text';
}

// 把飞书单元格值转为本插件可用的字符串/数字。
// feishuTypeId 可选：传入后可按字段类型精准处理（如日期裸数字、自动编号的 {status,value}）
// 飞书各字段类型的原始值格式差异很大，这里做统一提取：
// - 文本/数字/电话/邮箱/网址: string / number
// - 单选: { text }
// - 多选: [{ text }]
// - 日期(5): 裸数字（毫秒时间戳）或 { timestamp }
// - 复选框: boolean
// - 用户/群组: [{ name }]
// - 附件: [{ name, url, token, ... }]
// - 自动编号(1005): { status, value }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeValue(val: any, feishuTypeId?: number): string | number {
  if (val == null) return '';

  // 日期类型(5/1001/1002)：裸数字 → 格式化时间戳
  if (feishuTypeId && (feishuTypeId === 5 || feishuTypeId === 1001 || feishuTypeId === 1002)) {
    if (typeof val === 'number') return formatFeishuTimestamp(val);
    if (typeof val === 'object' && !Array.isArray(val) && typeof val?.timestamp === 'number') {
      return formatFeishuTimestamp(val.timestamp);
    }
  }

  // 自动编号(1005)：{ status, value } → 取 value
  if (feishuTypeId === 1005 && typeof val === 'object' && !Array.isArray(val) && 'value' in val) {
    return String(val.value ?? '');
  }

  if (typeof val === 'string') return val;
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? '是' : '否';

  if (Array.isArray(val)) {
    // 附件：元素含 url -> 取首个真实 url（供图片渲染）
    const first = val[0];
    if (first && typeof first === 'object' && 'url' in first) {
      const withUrl = val.find((x: any) => typeof x?.url === 'string' && x.url);
      return withUrl?.url || first.name || '';
    }
    // 其它数组（多选 / 用户 / 群组 / 关联记录等）：逐元素提取后拼接
    return val.map((x: any) => normalizeValue(x, feishuTypeId)).filter(Boolean).join(' / ');
  }

  if (typeof val === 'object') {
    // 日期：{ timestamp }
    if ('timestamp' in val && typeof val.timestamp === 'number') {
      return formatFeishuTimestamp(val.timestamp);
    }
    // 进度：{ percentage }
    if ('percentage' in val && typeof val.percentage === 'number') {
      return `${val.percentage}%`;
    }
    // 通用提取优先级：text > name > link > url
    if (typeof val.text === 'string') return val.text;
    if (typeof val.name === 'string') return val.name;
    if (typeof val.link === 'string') return val.link;
    if (typeof val.url === 'string') return val.url;
    // 兜底：取对象里第一个标量值
    const firstScalar = Object.values(val).find(
      (v) => typeof v === 'string' || typeof v === 'number'
    );
    if (firstScalar !== undefined) return String(firstScalar);
    return '';
  }
  return String(val);
}

// 飞书日期 timestamp 可能是秒（10 位）或毫秒（13 位），按位数修复后格式化为可读字符串
function formatFeishuTimestamp(ts: number): string {
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return String(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface BitableData {
  fields: Field[];
  records: RecordData[];
  tableName: string;
  diag: FieldDiag[];
}

// 生成字段诊断（基于第一条记录的原始值，暴露飞书返回结构供排查）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDiag(fieldMetas: any[], firstRawFields: Record<string, any>): FieldDiag[] {
  return fieldMetas.map((f: any) => {
    const raw = firstRawFields[f.id] !== undefined ? firstRawFields[f.id] : firstRawFields[f.name];
    const parsed = normalizeValue(raw, Number(f.type));
    const isEmpty = parsed === '' || parsed === undefined || parsed === null;
    return {
      name: f.name,
      feishuTypeId: Number(f.type),
      feishuTypeName: FEISHU_TYPE_NAMES[Number(f.type)] || `未知(${f.type})`,
      rawValue: raw,
      parsedValue: parsed,
      isEmpty,
    };
  });
}

// 是否已处于飞书插件运行环境
export function isInFeishu(): boolean {
  try {
    return typeof bitable !== 'undefined' && !!bitable?.base;
  } catch {
    return false;
  }
}

// 读取当前表结构 + 记录（最多翻页取 1000 条，足够标签场景）
export async function loadBitableData(): Promise<BitableData> {
  const table = await bitable.base.getActiveTable();
  const tableMeta = await table.getMeta(); // { id, name }
  const tableName = tableMeta?.name || '未命名表';

  // 字段元数据
  const fieldMetas = await table.getFieldMetaList();
  const fields: Field[] = fieldMetas.map((f: any) => ({
    id: f.id,
    name: f.name,
    type: mapFeishuType(Number(f.type), f.name),
  }));

  // 记录（翻页）。优先用 getRecordsByPage（非废弃接口），失败时回退 getRecords。
  // 兼容多种返回结构：res.records / res.data.records；字段键可能是 fieldId 或 fieldName。
  const records: RecordData[] = [];
  // 保留第一条记录的原始字段值（未经过 normalizeValue），用于生成诊断
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let firstRawFields: Record<string, any> | null = null;
  let pageToken: any = undefined;
  let guard = 0;
  do {
    let res: any = null;
    try {
      const t: any = table;
      if (typeof t.getRecordsByPage === 'function') {
        res = await t.getRecordsByPage({ pageSize: 200, pageToken });
      } else {
        res = await t.getRecords({ pageSize: 200, pageToken });
      }
    } catch (e) {
      console.error('[飞书SDK] 读取记录失败：', e);
      break;
    }
    const list: any[] = res?.records || res?.data?.records || [];
    for (const r of list) {
      const fieldsObj: Record<string, string | number> = {};
      const cellMap = r?.fields || r?.record?.fields || {};
      // 保留第一条记录原始值（诊断用）
      if (!firstRawFields) {
        firstRawFields = {};
        for (const f of fieldMetas) {
          firstRawFields[f.id] = cellMap[f.id] !== undefined ? cellMap[f.id] : cellMap[f.name];
        }
      }
      for (const f of fieldMetas) {
        // 双键兜底：飞书字段键可能是 fieldId 也可能是 fieldName
        const raw = cellMap[f.id] !== undefined ? cellMap[f.id] : cellMap[f.name];
        const val = normalizeValue(raw, Number(f.type));
        fieldsObj[f.id] = val;
        if (cellMap[f.name] !== undefined) fieldsObj[f.name] = val;
      }
      records.push({ id: r?.recordId || r?.id || '', fields: fieldsObj });
    }
    const nextToken = res?.pageToken ?? res?.data?.pageToken;
    pageToken = res?.hasMore ? nextToken : undefined;
    guard += 1;
  } while (pageToken && guard < 10);

  const diag = firstRawFields ? buildDiag(fieldMetas, firstRawFields) : [];
  return { fields, records, tableName, diag };
}

// 监听选中记录变化，返回取消监听函数
// 回调参数为当前选中的所有记录 ID 列表（支持飞书多选）
export async function onSelectionChange(
  cb: (recordIds: string[]) => void
): Promise<() => void> {
  const off = bitable.base.onSelectionChange((e: { data: { recordId?: string | null; recordIds?: string[] } }) => {
    // 飞书多选时返回 recordIds 数组，单选时返回 recordId
    const ids = e?.data?.recordIds ?? (e?.data?.recordId ? [e.data.recordId] : []);
    cb(ids);
  });
  return () => { try { off && off(); } catch { /* noop */ } };
}

// 主动获取当前选中的记录 ID 列表（支持飞书多选）
export async function getSelectedRecordIds(): Promise<string[]> {
  try {
    const sel = await bitable.base.getSelection();
    // Selection 含 recordIds（新版）或 recordId（旧版单选）
    const ids = (sel as any)?.recordIds ?? ((sel as any)?.recordId ? [(sel as any).recordId] : []);
    return ids;
  } catch {
    return [];
  }
}

// 监听表增删（飞书无 onTableChange，用 add/delete 近似；切换表时选中变化也会触发）
export async function onTableChange(cb: () => void): Promise<() => void> {
  const off1 = bitable.base.onTableAdd(() => cb());
  const off2 = bitable.base.onTableDelete(() => cb());
  return () => {
    try { off1 && off1(); } catch { /* noop */ }
    try { off2 && off2(); } catch { /* noop */ }
  };
}
