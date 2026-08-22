// 飞书多维表格 SDK 接入层
// 负责：读取当前表的字段、记录，监听选中/表变化；把飞书字段类型映射为本插件的 FieldType。
// 数据安全红线：所有解析都在浏览器本地完成，不把多维表格数据发往任何外部服务。

import { bitable } from '@lark-base-open/js-sdk';
import type { Field, RecordData } from '../types';

// 飞书字段类型枚举（FieldType$1，详见 SDK 类型定义）
// Text=1 Number=2 SingleSelect=3 MultiSelect=4 DateTime=5 Checkbox=7
// User=11 Phone=13 Url=15 Email=18 Barcode(条码)=? Attachment=?
// 注意：飞书多维表格没有"图片"专有类型，图片以"附件"字段存储。
const FEISHU_TEXT_TYPES = new Set([1, 15, 18]); // 文本/超链接/邮箱 -> text
const FEISHU_NUMBER_TYPES = new Set([2, 13]); // 数字/电话 -> number
const FEISHU_DATE_TYPES = new Set([5]); // 日期
const FEISHU_SELECT_TYPES = new Set([3, 4]); // 单选/多选 -> select
const FEISHU_ATTACHMENT_TYPES = new Set([11]); // 附件 -> image（默认当图片渲染，用户可手动改条码/二维码）

export function mapFeishuType(feishuType: number, name: string): Field['type'] {
  if (FEISHU_ATTACHMENT_TYPES.has(feishuType)) return 'image';
  if (FEISHU_NUMBER_TYPES.has(feishuType)) return 'number';
  if (FEISHU_DATE_TYPES.has(feishuType)) return 'date';
  if (FEISHU_SELECT_TYPES.has(feishuType)) return 'select';
  if (FEISHU_TEXT_TYPES.has(feishuType)) return 'text';
  // 兜底：纯文本（包含条码字段，用户可在属性面板手动切换成 barcode/qrcode）
  return 'text';
}

// 把飞书单元格值转为本插件可用的字符串/数字
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeValue(val: any): string | number {
  if (val == null) return '';
  if (typeof val === 'number' || typeof val === 'string') return val;

  // 附件：数组，每项 { name, type, url?, token }
  if (Array.isArray(val)) {
    const first = val[0];
    if (first && typeof first === 'object') {
      if (typeof first.url === 'string' && first.url) return first.url;
      // 没有临时 url 时回退到文件名（避免空白）
      if (typeof first.name === 'string') return first.name;
      return '';
    }
    return String(first ?? '');
  }

  if (typeof val === 'object') {
    // 单选/多选: { text } 或 [{ text }]
    if ('text' in val) {
      const t = val.text;
      if (typeof t === 'string') return t;
      if (Array.isArray(t)) return t.map((x: any) => x?.text ?? '').join(' / ');
    }
    // 用户/群组: { name } 或 [{ name }]
    if ('name' in val) {
      const n = val.name;
      if (typeof n === 'string') return n;
      if (Array.isArray(n)) return n.map((x: any) => x?.name ?? '').join(' / ');
    }
    return '';
  }
  return String(val);
}

export interface BitableData {
  fields: Field[];
  records: RecordData[];
  tableName: string;
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

  // 记录（翻页）
  const records: RecordData[] = [];
  let pageToken: string | number | undefined;
  let guard = 0;
  do {
    const res: any = await table.getRecords({ pageSize: 200, pageToken } as any);
    const list: any[] = res?.records || [];
    for (const r of list) {
      const fieldsObj: Record<string, string | number> = {};
      const cellMap = r.fields || {};
      for (const f of fieldMetas) {
        fieldsObj[f.id] = normalizeValue(cellMap[f.id]);
      }
      records.push({ id: r.recordId || '', fields: fieldsObj });
    }
    pageToken = res?.hasMore ? res?.pageToken : undefined;
    guard += 1;
  } while (pageToken && guard < 10);

  return { fields, records, tableName };
}

// 监听选中记录变化，返回取消监听函数
export async function onSelectionChange(
  cb: (recordId: string | null) => void
): Promise<() => void> {
  const off = bitable.base.onSelectionChange((e: { data: { recordId?: string | null } }) => {
    cb(e?.data?.recordId ?? null);
  });
  return () => { try { off && off(); } catch { /* noop */ } };
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
