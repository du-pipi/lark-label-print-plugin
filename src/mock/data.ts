import type { Field, RecordData, LabelConfig, LabelPreset } from '../types';

// ========== Mock 多维表格字段 ==========
// 原型阶段使用模拟数据，后续替换为飞书 SDK 调用
export const mockFields: Field[] = [
  { id: 'fld_1', name: '名称', type: 'text' },
  { id: 'fld_2', name: '编码', type: 'text' },
  { id: 'fld_3', name: '条码', type: 'barcode' },
  { id: 'fld_4', name: '价格', type: 'number' },
  { id: 'fld_5', name: '原价', type: 'number' },
  { id: 'fld_6', name: '规格', type: 'text' },
  { id: 'fld_7', name: '产地', type: 'text' },
  { id: 'fld_8', name: '日期', type: 'date' },
  { id: 'fld_9', name: '图片', type: 'image' },
  { id: 'fld_10', name: '二维码', type: 'qrcode' },
  { id: 'fld_11', name: '分类', type: 'select' },
  { id: 'fld_12', name: '数量', type: 'number' },
];

// ========== Mock 记录数据 ==========
export const mockRecords: RecordData[] = [
  {
    id: 'rec_1',
    fields: {
      fld_1: '有机红富士苹果',
      fld_2: 'SKU-APL-001',
      fld_3: '6901234567890',
      fld_4: 12.90,
      fld_5: 15.90,
      fld_6: '500g/盒',
      fld_7: '山东烟台',
      fld_8: '2026-08-20',
      fld_9: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200',
      fld_10: 'https://example.com/p/APL-001',
      fld_11: '水果',
      fld_12: 320,
    },
  },
  {
    id: 'rec_2',
    fields: {
      fld_1: '进口香蕉',
      fld_2: 'SKU-BAN-002',
      fld_3: '6902345678901',
      fld_4: 8.50,
      fld_5: 10.00,
      fld_6: '1kg/把',
      fld_7: '菲律宾',
      fld_8: '2026-08-21',
      fld_9: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200',
      fld_10: 'https://example.com/p/BAN-002',
      fld_11: '水果',
      fld_12: 150,
    },
  },
  {
    id: 'rec_3',
    fields: {
      fld_1: '纯牛奶 250ml',
      fld_2: 'SKU-MLK-003',
      fld_3: '6903456789012',
      fld_4: 3.50,
      fld_5: 4.00,
      fld_6: '250ml/盒',
      fld_7: '内蒙古',
      fld_8: '2026-08-15',
      fld_9: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200',
      fld_10: 'https://example.com/p/MLK-003',
      fld_11: '乳品',
      fld_12: 500,
    },
  },
  {
    id: 'rec_4',
    fields: {
      fld_1: '全麦面包',
      fld_2: 'SKU-BRD-004',
      fld_3: '6904567890123',
      fld_4: 9.90,
      fld_5: 12.00,
      fld_6: '400g/袋',
      fld_7: '本地烘焙',
      fld_8: '2026-08-22',
      fld_9: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200',
      fld_10: 'https://example.com/p/BRD-004',
      fld_11: '烘焙',
      fld_12: 80,
    },
  },
];

// ========== 默认标签配置 ==========
// 默认：单张 60×40mm，一页一个（用户需求：标签纸就是 60×40，一页一个）
export const defaultLabelConfig: LabelConfig = {
  labelWidth: 60,
  labelHeight: 40,
  pageMarginTop: 0,
  pageMarginBottom: 0,
  pageMarginLeft: 0,
  pageMarginRight: 0,
  gapX: 0,
  gapY: 0,
  columns: 1,
  rows: 1,
  showBorder: true,
  background: '#ffffff',
};

// ========== 预设标签尺寸 ==========
export const labelPresets: LabelPreset[] = [
  {
    name: '单张 60×40mm（一页一个）',
    config: { labelWidth: 60, labelHeight: 40, columns: 1, rows: 1, pageMarginTop: 0, pageMarginBottom: 0, pageMarginLeft: 0, pageMarginRight: 0, gapX: 0, gapY: 0 },
  },
  {
    name: '单张 40×30mm（一页一个）',
    config: { labelWidth: 40, labelHeight: 30, columns: 1, rows: 1, pageMarginTop: 0, pageMarginBottom: 0, pageMarginLeft: 0, pageMarginRight: 0, gapX: 0, gapY: 0 },
  },
  {
    name: '单张 50×30mm（一页一个）',
    config: { labelWidth: 50, labelHeight: 30, columns: 1, rows: 1, pageMarginTop: 0, pageMarginBottom: 0, pageMarginLeft: 0, pageMarginRight: 0, gapX: 0, gapY: 0 },
  },
  {
    name: '单张 70×50mm（一页一个）',
    config: { labelWidth: 70, labelHeight: 50, columns: 1, rows: 1, pageMarginTop: 0, pageMarginBottom: 0, pageMarginLeft: 0, pageMarginRight: 0, gapX: 0, gapY: 0 },
  },
  {
    name: '单张 80×50mm（一页一个）',
    config: { labelWidth: 80, labelHeight: 50, columns: 1, rows: 1, pageMarginTop: 0, pageMarginBottom: 0, pageMarginLeft: 0, pageMarginRight: 0, gapX: 0, gapY: 0 },
  },
  {
    name: '单张 100×50mm（一页一个）',
    config: { labelWidth: 100, labelHeight: 50, columns: 1, rows: 1, pageMarginTop: 0, pageMarginBottom: 0, pageMarginLeft: 0, pageMarginRight: 0, gapX: 0, gapY: 0 },
  },
  {
    name: '物流单 100×100mm',
    config: { labelWidth: 100, labelHeight: 100, columns: 1, rows: 1, pageMarginTop: 0, pageMarginBottom: 0, pageMarginLeft: 0, pageMarginRight: 0, gapX: 0, gapY: 0 },
  },
  {
    name: '物流单 100×150mm',
    config: { labelWidth: 100, labelHeight: 150, columns: 1, rows: 1, pageMarginTop: 0, pageMarginBottom: 0, pageMarginLeft: 0, pageMarginRight: 0, gapX: 0, gapY: 0 },
  },
  {
    name: '物流单 100×200mm',
    config: { labelWidth: 100, labelHeight: 200, columns: 1, rows: 1, pageMarginTop: 0, pageMarginBottom: 0, pageMarginLeft: 0, pageMarginRight: 0, gapX: 0, gapY: 0 },
  },
  {
    name: '整页 A4 210×297mm',
    config: { labelWidth: 210, labelHeight: 297, columns: 1, rows: 1, pageMarginTop: 0, pageMarginBottom: 0, pageMarginLeft: 0, pageMarginRight: 0, gapX: 0, gapY: 0 },
  },
  {
    name: '多张 60×40（一页 3×7）',
    config: { labelWidth: 60, labelHeight: 40, columns: 3, rows: 7, pageMarginTop: 10, pageMarginBottom: 10, pageMarginLeft: 10, pageMarginRight: 10, gapX: 2, gapY: 2 },
  },
  {
    name: '多张 40×30（一页 4×9）',
    config: { labelWidth: 40, labelHeight: 30, columns: 4, rows: 9, pageMarginTop: 10, pageMarginBottom: 10, pageMarginLeft: 10, pageMarginRight: 10, gapX: 2, gapY: 2 },
  },
  {
    name: '多张 50×30（一页 3×9）',
    config: { labelWidth: 50, labelHeight: 30, columns: 3, rows: 9, pageMarginTop: 10, pageMarginBottom: 10, pageMarginLeft: 10, pageMarginRight: 10, gapX: 2, gapY: 2 },
  },
];
