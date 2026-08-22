// 字段类型（对应多维表格字段类型的子集）
export type FieldType = 'text' | 'number' | 'image' | 'barcode' | 'qrcode' | 'date' | 'select' | 'table';

// 多维表格字段定义
export interface Field {
  id: string;
  name: string;
  type: FieldType;
}

// 表格单元格：可绑定字段或填写静态文本
export interface TableCell {
  fieldId: string | null;  // 绑定字段 id；null 表示纯静态文本
  staticText: string;      // 静态文本内容
  prefix: string;          // 字段值前显示的前缀（仅 fieldId 非空时生效）
}

// 画布上的标签元素
export interface LabelItem {
  id: string;
  fieldId: string;
  fieldName: string;
  type: FieldType;
  // 位置和尺寸（单位：mm，相对于标签画布左上角）
  x: number;
  y: number;
  width: number;
  height: number;
  // 文字样式
  fontSize: number;       // pt
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  lineHeight: number;
  // 边框
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted';
  borderWidth: number;    // px
  borderColor: string;
  borderRadius: number;   // px
  // 内边距
  padding: number;        // px
  // 背景
  backgroundColor: string;
  // 图片/条码特有
  objectFit: 'contain' | 'cover' | 'fill';
  // 静态文本（非字段绑定）
  isStatic?: boolean;
  staticText?: string;
  // 锁定：不可移动/缩放/删除（如置底表格）
  locked?: boolean;
  // 表格元素特有
  tableRows?: number;
  tableCols?: number;
  tableCells?: TableCell[];
  tableShowBorder?: boolean;
  tableHeader?: boolean;   // 首行作为表头（加粗 + 底色）
  tableFontSize?: number;
  tableBorderWidth?: number; // 表格单元格边框宽度（px 逻辑单位，渲染时 ×scale；0 表示无边框）
  tableColWidths?: number[]; // 各列宽度比例（如 [1,2,1] 表示中间列是两侧两倍宽）；未设则等宽
}

// 标签纸张配置
export interface LabelConfig {
  labelWidth: number;     // 单个标签宽度 mm
  labelHeight: number;    // 单个标签高度 mm
  pageMarginTop: number;  // 页面上边距 mm
  pageMarginBottom: number;
  pageMarginLeft: number;
  pageMarginRight: number;
  gapX: number;           // 标签水平间距 mm
  gapY: number;           // 标签垂直间距 mm
  columns: number;        // 每行标签数
  rows: number;           // 每页行数
  showBorder: boolean;    // 编辑时显示标签边框
  background: string;     // 标签背景色
}

// 记录数据
export interface RecordData {
  id: string;
  fields: Record<string, string | number>;
}

// 字段诊断信息（排查飞书字段值解析问题用）
export interface FieldDiag {
  name: string;
  feishuTypeId: number;
  feishuTypeName: string;
  rawValue: unknown;            // 飞书返回的原始值
  parsedValue: string | number; // normalizeValue 后的值
  isEmpty: boolean;             // 解析后是否为空
}

// 预设标签尺寸
export interface LabelPreset {
  name: string;
  config: Partial<LabelConfig>;
}

// 自定义模板（保存的排版方案）
export interface LabelTemplate {
  id: string;
  name: string;
  items: LabelItem[];
  labelConfig: LabelConfig;
  createdAt: number;
}
