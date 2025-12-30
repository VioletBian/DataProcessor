Data Processor 项目说明
1. 背景与目标
行业与场景：金融期货 broker 公司，日常有大量报表和下游（downstream）复杂数据处理需求，Operation 部门也依赖 Excel 做繁琐的清洗、聚合与校验。
既有形态：初版仅有后端（Python + pandas），通过 JSON DSL 描述流水线算子，自动执行 filter/sort/aggregate/tag/列赋值等操作，生成报表或处理结果。
新需求来源：同事与潜在用户反馈 JSON 定义容易出错（拼写/字段遗漏/格式错误），非技术用户改动成本高。于是新增前端，提供 可视化算子编排、拖拽排序、配置校验与在线 sample 测试，降低门槛、减少配置错误。
2. 业务痛点
DSL 成本高：手写 JSON 易有笔误，参数缺失、字段错写导致执行失败。
沟通成本高：业务同事需依赖开发/数据同学修改流水线，迭代慢。
可视化缺失：缺少对数据处理步骤的直观呈现，不易审阅和调试。
多场景需求：报表、异常校验、运营数据处理等都需要灵活拼装算子。
3. 核心设计与实际应用
JSON 流水线 DSL：operators: [{ type, params }, ...]，支持 filter / aggregate / sort / tag / col_apply / col_assign / rename 等。按顺序执行，得到最终 DataFrame。
后端执行引擎（Python + pandas）：将 JSON 解析为 Operation 列表，依次执行，结果可返回报表或中间数据。
前端可视化编排（React + TS）：基于元数据驱动的动态表单，用户选算子、填参数、拖拽排序，实时生成 JSON，并可用 sample data 做在线测试/预览。
实际应用：
日报、周报的标准化流水线。
Operation 部门的 Excel 流程替代与自动化。
风控/运营的小批量数据试跑和校验。
4. 后端功能与实现
Operation 抽象：Operation(func, **params) 可调用对象；OperationFactory 生成具体算子（filter/sort/agg/tag/col_assign/rename 等）。
算子示例：
filter：按 condition 过滤，可基于列子集。
agg：groupby + agg 支持 rename、func 动态选择。
tag：np.select 基于多条件打标，支持 default。
col_assign：lambda/vectorized 两种模式，按条件 eval/assign。
rename/sort：列重命名与排序。
DSL 解析：parse_pipeline_operations(pipeline) 将 JSON 转成有序算子链，遍历执行。保留兜底逻辑（condition 缺失等）。
技术要点：
pandas query/eval/select 结合，兼顾性能与灵活度。
Lambda 与 vectorized 双模式，兼容表达式/函数。
轻量 wrapper，便于扩展新算子。
5. 前端功能与实现
两大页面：
PipelineJsonGenerator：算子选择、拖拽排序、参数填写、实时 JSON 预览/复制。
DataProcessorPage（在线测试）：上传/粘贴 sample 数据 + 导入已写好的 pipeline JSON，跑一遍看输出与错误。
元数据驱动表单：
MetaData.ts 定义算子类型、参数接口、UI 元数据（OPERATOR_META & OPERATOR_PARAM_META_CONFIG）。
ParamInput 根据 uiType 动态渲染输入：string/string-list/mapped-boolean/mapped-string/sub-action。
OperatorForm 遍历元数据生成字段，避免硬编码 switch。
交互与体验：
拖拽/上下移算子，选中后展开编辑。
JSON 实时预览 + 一键复制。
依赖型字段（如 by vs ascending）长度对齐检查。
技术要点：
TypeScript 联合类型 + as any 策略规避动态键的推断陷阱，保证运行时可用。
元数据驱动避免表单分支爆炸，新增算子仅需扩展 MetaData。
兜底 return null 解决 React/TSX 无返回的类型报错。
6. 技术闪光点与难点
配置即算子：用一份元数据同时约束“类型定义 + UI 渲染 + 校验提示”，让前端与 DSL 语义对齐。
依赖映射输入：mapped-boolean/mapped-string 保证与参考字段一一对应（典型：sort 的 ascending 对应 by）。
可扩展性：新增算子只需在 MetaData 增加类型和参数元数据，OperatorForm/ParamInput 自动生成表单。
健壮性处理：后端 DSL 解析对缺失/空字段做默认处理；前端有默认值与占位提示，降低错误率。
复杂表达式支持：col_assign/col_apply 允许 lambda 与向量化表达式，兼顾灵活度与性能。
7. 未来开发方向
更强校验与提示：前端参数校验（必填、参考长度一致、表达式快速检测），后端返回定位到具体算子/字段。
可视化数据流：节点/边形式展示每步输入输出示例，支持高亮差异。
模板与版本管理：常用 Pipeline 模板库、历史版本对比与回滚。
权限与审计：区分业务/技术角色，操作日志与审批流。
性能与批处理：针对大数据量场景引入分块/流式处理，或替换为分布式执行引擎。
国际化与可访问性：多语言、无障碍支持，提升易用性。
8. 面试可强调的价值
将原本“黑盒”式 pandas DSL 配置转为 可视化、可校验、可复制 的工具，显著降低非技术人员的使用门槛和错误率。
元数据驱动 + 类型系统的设计兼顾了 扩展性与一致性，减少重复开发。
前后端协同：后端提供稳定的执行抽象，前端提供低门槛编排与快速试跑，覆盖报表、运营、风控等多场景。