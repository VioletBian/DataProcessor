# 格式
{
  "name": "my_first_pipeline",
  "pipeline": [
    {"op": "fillna", "value": 0}
  ]
}
# 算子
在某些简单场景下（比如“对某一列取对数”），col_assign 和 series_transform 的功能是有重叠的。
但是，从底层实现机制、数据视角的维度以及适用场景来看，它们有本质的区别。
简单总结一句话：
 * col_assign 是 “横向” 的（Row-wise / Cross-column），关注列与列之间的关系。
 * series_transform 是 “纵向” 的（Column-wise / Time-series），关注这一列自身上下文的关系。
以下是详细的深度对比分析：
1. 底层机制与数据视角的区别
A. col_assign (专注于“造”新列)
它的核心代码是 df.apply(..., axis=1) (针对 lambda 模式) 或 df.eval (针对 vectorized 模式)。
 * 视角：它看到的是 “行” (Row) 或者 “整个宽表”。
 * 能力：它能同时访问同一行里的多个字段。
 * 典型逻辑：C = A + B。
 * 代码体现：
   # method="lambda"
df.apply(lambda row: row['A'] + row['B'], axis=1) 

B. series_transform (专注于“变”旧列)
它的核心代码是将函数作用于提取出来的 pd.Series 对象上。
 * 视角：它看到的是 “一整列数据” (Series)。
 * 能力：它能访问这一列的“前世今生”（上一行、下一行、过去5天的均值）。但它通常看不到隔壁列的数据。
 * 典型逻辑：A_t = A_t - A_{t-1}。
 * 代码体现：
   # 输入是一个 Series，不是 Row
transform_func(df['A']) 

2. 功能对比表
| 特性 | col_assign | series_transform |
|---|---|---|
| 操作对象 | 行 (Row) 或 多列交互 | 单列 (Series) 及其历史数据 |
| 核心优势 | 列间运算 (A列 + B列) | 时序运算 (Shift, Diff, Rolling) |
| 输入数量 | 任意多列 | 只能处理指定的单列 (One-by-One) |
| 输出数量 | 只能生成 1 个新列 | 可以批量处理 N 列生成 N 个结果 |
| 上下文感知 | 无 (不知道上一行是谁) | 有 (知道 index 顺序) |
| 性能 | Lambda模式较慢 (行遍历) | 非常快 (Series 向量化操作) |
| 典型场景 | price * volume | close / close.shift(1) - 1 |
3. 为什么必须要有 series_transform？
如果只有 col_assign，你会遇到以下痛点：
痛点一：无法高效处理时序数据 (Shift/Rolling)
如果你想算 close 的 5日均线。
 * 用 col_assign (lambda 模式)：非常痛苦，因为 apply(axis=1) 里的 lambda row 拿不到“上一行”。你很难在行遍历里实现 rolling。
 * 用 col_assign (vectorized/eval 模式)：Pandas 的 eval 字符串语法只支持基础算术，不支持 .rolling() 或 .shift() 这种方法调用。
 * 用 series_transform：lambda x: x.rolling(5).mean()，直接调用 Series 的方法，完美解决。
痛点二：批量操作繁琐
假设你有 100 个因子的列，你想对这 100 列都做一个简单的 log 变换。
 * 用 col_assign：你需要写 100 个算子配置（因为 col_assign 一次只产出一个 col_name）。
 * 用 series_transform：
   {
  "on": ["f1", "f2", ... "f100"],
  "transform_expr": "lambda x: np.log(x)"
}

   一个配置搞定所有，代码里会自动循环处理。
4. 什么时候可以用 col_assign 代替 series_transform？
当操作 既不涉及多列交互，也不涉及时间序列，只是简单的元素级数学变换时，两者是可以互通的。
例子：对列 A 取绝对值
 * 方案 1 (series_transform):
   * on: ["A"]
   * expr: lambda x: x.abs()
   * 优势：快，支持批量。
 * 方案 2 (col_assign vectorized):
   * col_name: A
   * expr: abs(A)
   * 优势：可读性也不错。
 * 方案 3 (col_assign lambda):
   * col_name: A
   * expr: lambda row: abs(row['A'])
   * 劣势：极慢，因为它把列拆成行，一个个算完再拼回去，这就是著名的 "apply loop" 性能陷阱。
总结建议
 * 涉及到“行与行”的关系（时间序列、滑窗、差分） \rightarrow 必须用 series_transform。
 * 涉及到“批量”对多列做相同处理 \rightarrow 必须用 series_transform。
 * 涉及到“列与列”的加减乘除（如 A/B） \rightarrow 必须用 col_assign。
 * 简单的数学变换（如 log, abs） \rightarrow 都可以，但推荐用 series_transform，因为它通常更快且配置更简洁（支持批量）。
