// 单位转换工具
// 打印时使用 mm，屏幕预览时需要转换为 px

const MM_TO_PX = 3.7795275591; // 1mm = 3.7795px (96 DPI)

export function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

export function pxToMm(px: number): number {
  return px / MM_TO_PX;
}

// pt 转 px (1pt = 1.333px)
export function ptToPx(pt: number): number {
  return pt * 1.333;
}

// 格式化价格
export function formatPrice(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return String(value);
  return `¥${num.toFixed(2)}`;
}

// 格式化日期
export function formatDate(value: string | number): string {
  if (!value) return '';
  const str = String(value);
  // 如果已经是 YYYY-MM-DD 格式，直接返回
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str;
  const date = new Date(str);
  if (isNaN(date.getTime())) return str;
  return date.toISOString().slice(0, 10);
}

// 获取字段显示值
export function getDisplayValue(
  type: string,
  value: string | number
): string {
  if (value === '' || value === null || value === undefined) return '';
  switch (type) {
    case 'number':
      return String(value);
    case 'date':
      return formatDate(value);
    default:
      return String(value);
  }
}

// 限制数值范围
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
