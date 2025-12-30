# Data Processor 项目说明

本文档面向技术同事与面试场景，总结项目背景、业务痛点、架构设计、前后端实现要点、技术亮点/难点以及未来方向。项目代码位于 `data-processor/`（后端 Python + pandas，前端 React + TypeScript）。

## 背景与业务痛点
- 行业场景：金融期货 broker，公司内大量报表与下游（downstream）复杂数据处理，Operation 部门也常用 Excel 做清洗/聚合/校验。
- 早期形态：仅有后端 JSON DSL + pandas 执行，用户需要手写 JSON 定义算子流水线，容易出现字段/拼写错误，非技术用户修改成本高。
- 新需求来源：同事和潜在用户反馈 JSON 拼写/遗漏问题多，故增加“可视化前端”帮助编排流水线、校验参数，并支持 sample data 在线试跑。

## 总体架构与数据流
1) 用户在前端选择算子、填写参数、拖拽排序，实时生成符合 DSL 的 JSON（`{ pipeline: [{type, params}, ...] }`）。
2) JSON 可复制或传递给后端；后端解析成 `Operation` 列表（`OperationFactory` 生成具体算子），按顺序对 DataFrame 执行。
3) 前端测试页可上传/粘贴样例数据 + 输入 JSON，调用后端运行，查看输出和错误，帮助调试。

## 后端实现（Python + pandas）
- 核心抽象：`Operation(func, **params)` 可调用对象，`OperationFactory` 生成算子：
  - `filter`：条件过滤（可限定列子集）。
  - `agg`：`groupby + agg`，支持动态 method 与 rename。
  - `sort`：多字段排序。
  - `tag`：`np.select` 按条件打标签，支持 default。
  - `col_assign`：lambda / vectorized 两种模式，对列进行条件计算与赋值。
  - `rename`：列重命名。
- 解析执行：`parse_pipeline_operations(pipeline)` 将 JSON 转成算子链并依次执行；对缺省 condition、requiredCols 等提供兜底处理。
- 设计取舍：轻量 wrapper，方便扩展新算子；利用 pandas query/eval/select 兼顾灵活度与性能。

## 前端实现（React + TypeScript）
- 主要页面：
  - **PipelineJsonGenerator**：算子面板 + 拖拽/上下移 + 参数表单 + JSON 预览/复制。
  - **DataProcessorPage**：上传/粘贴 sample data，导入 JSON 流水线，运行并查看结果/错误。
- 元数据驱动表单：
  - `MetaData.ts` 定义算子类型、参数接口、UI 元数据（`OPERATOR_META`、`OPERATOR_PARAM_META_CONFIG`）。
  - `OperatorForm` 遍历元数据生成表单字段，避免硬编码 switch。
  - `ParamInput` 依据 `uiType` 渲染输入：`string`/`string-list`/`mapped-boolean`/`mapped-string`/`sub-action`（聚合动作）。
- 交互特性：
  - 算子列表可展开/折叠、上下移动、删除；选中后显示参数表单。
  - JSON 实时预览 + 一键复制。
  - 参考字段对齐（如 sort 的 `by` vs `ascending`），尽量减少长度不一致导致的错误。
- TypeScript 策略：在动态遍历参数时使用 `as any` 兜底，优先保证运行时正确性；组件分支均有 `return null` 兜底以消除 TSX 返回类型告警。

## 关键技术亮点
- **元数据即单一真相源**：一份 `MetaData` 同时约束类型定义、UI 生成与校验提示，新增算子仅需补充元数据即可联动前端表单。
- **依赖型输入处理**：`mapped-boolean` / `mapped-string` 依赖 reference 字段长度与顺序（典型：sort 的升降序列表必须与 `by` 对齐）。
- **表达式灵活度**：后端 `col_assign` 支持 lambda 与向量化表达式；`tag` 支持多条件匹配与默认值。
- **可维护性**：轻量 `Operation` wrapper + 工厂模式，便于添加新算子；前端抽象表单减少分支爆炸。

## 当前难点与解决思路
- **JSON 配置易错**：通过前端元数据驱动的表单和默认值降低用户犯错概率，后端对缺省值做兜底。
- **联合类型动态索引**：TS 对 union key 推断为 never，采用运行时 `as any` 搭配严格的元数据校验；兜底 `return null` 避免 TSX 报错。
- **依赖字段对齐**：前端在 `mapped-*` 输入中对参考列表与当前值进行长度对齐检查/转换，减少排序等场景的崩溃风险。

## 使用方式（示例）
1) 在 PipelineJsonGenerator 中：
   - 选择算子类型（filter/sort/aggregate/tag/col_apply/col_assign…），点击 Add。
   - 填写参数：string、string-list、或映射型输入；必要时调整顺序/删除。
   - 复制右侧 JSON，用于后端执行或测试页试跑。
2) 在 DataProcessorPage 中：
   - 上传/粘贴样例数据（CSV/JSON），导入或粘贴流水线 JSON。
   - 运行查看输出与错误，用于快速验算和调试。

## 未来规划
- 校验与提示：更强的前端必填校验、依赖长度校验、表达式快速检测；后端错误回溯到具体算子/字段。
- 数据流可视化：节点/边方式展示每步输入输出示例，支持高亮差异。
- 模板与版本：常用 Pipeline 模板库，版本对比/回滚。
- 权限与审计：按角色/部门的操作记录与审批流。
- 性能与批处理：大数据量分块/流式或分布式执行的扩展。
- 国际化与可访问性：多语言与无障碍支持，覆盖更多用户群体。

## 价值总结（面试可重点强调）
- 将“手写 DSL”转为“可视化、可校验、可复制”的工具，显著降低非技术用户门槛与错误率。
- 元数据驱动的表单与类型定义，确保前端 UI 与 DSL 语义一致，扩展性强。
- 前后端协同：后端稳健的算子执行抽象 + 前端低门槛编排/试跑，覆盖报表、运营、风控等多场景。***
