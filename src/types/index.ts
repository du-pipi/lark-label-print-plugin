// 字段类型（对应多维表格字段类型的子集）
export type FieldType = 'text' | 'number' | 'image' | 'barcode' | 'qrcode' | 'date' | 'select';

// 多维表格字段定义
export interface Field {
  id: string;
  name: string;
  type: FieldType;
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

// 预设标签尺寸
export interface LabelPreset {
  name: string;
  config: Partial<LabelConfig>;
}
