# 飞书多维表格 - 数据标签打印插件

基于 React + TypeScript + Vite 的飞书多维表格**边栏插件**，用于将多维表格数据按自定义模板排版并打印标签。

## 功能特性

- **动态字段接入**：通过 `@lark-base-open/js-sdk` 读取当前多维表格的字段与记录，字段列表动态生成。
- **条码 / 二维码**：用 `jsbarcode` + `qrcode` 在浏览器本地生成，不外发数据。
- **自定义排版**：拖拽字段到画布、自由调整位置/大小/样式；支持文本、数字、日期、选择、条码、二维码、图片、表格等元素。
- **表格元素**：标签上可添加自定义表格，设置行列数、单元格绑定字段、列宽比例、边框样式。
- **批量打印**：在多维表格中勾选多行记录，自动按模板批量生成标签并打印。
- **纸张预设**：内置多种常用尺寸（60×40、40×30、50×30、70×50、80×50、100×50、100×100 物流单、A4 等），支持自定义。
- **布局持久化**：排版模板存储在本地，重开不丢失。
- **浏览器打印**：一键打印 / 导出 PDF，按标签实际尺寸出纸。

## 技术栈

- React 18 + TypeScript + Vite 5
- `@lark-base-open/js-sdk`（飞书多维表格官方 SDK）
- `jsbarcode` + `qrcode`
- CSS `@media print`

## 本地运行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物在 dist/
```

## 在飞书多维表格中使用

1. 将 `dist/` 部署到任意 HTTPS 静态托管（GitHub Pages / Vercel / 个人服务器等）。
2. 打开多维表格 → 右上角「插件」→「自定义插件」→ 填入部署地址。
3. 插件在侧边栏打开，自动读取当前表字段；拖字段排版 → 勾选记录 → 打印。

## 项目结构

```
src/
  main.tsx                # 入口
  App.tsx                 # 根组件
  types/index.ts          # 类型定义
  mock/data.ts            # 演示数据 + 标签预设
  feishu/sdk.ts           # 飞书 SDK 接入层
  store/AppContext.tsx    # 全局状态
  utils/index.ts          # 工具函数
  styles/index.css        # 全局 + 打印样式
  components/
    Toolbar.tsx           # 顶部工具栏
    FieldPanel.tsx        # 左侧字段面板 + 诊断
    Canvas.tsx            # 中间画布（含批量预览）
    LabelItemView.tsx     # 标签元素渲染
    Barcode.tsx           # 条码/二维码组件
    PropertyPanel.tsx     # 右侧属性面板
```

## License

MIT
