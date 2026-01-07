import numpy as np
import pandas as pd
from typing import Any, Callable, Dict, Generic, List, TypeVar


T = TypeVar("T", pd.DataFrame, Any)


class Operation(Generic[T]):
    """
    A thin callable wrapper that remembers the parameters used to build the
    operation. This mirrors the lightweight class in the screenshots.
    """

    def __init__(self, func: Callable[[T], T], **params: Any) -> None:
        self.func = func
        self.params = params

    def __call__(self, data: T) -> T:
        return self.func(data, **self.params)


class OperationFactory:
    """
    Factory methods that produce `Operation` instances for each supported
    operator type. The structure follows the captured notebook implementation.
    """

    @staticmethod
    def agg(by: List[str], actions: Dict[str, Any]) -> Operation:
        method = actions["method"]
        on = actions["on"]

        # dynamic expression
        if method == "func":
            if "rename" not in actions:
                return Operation(lambda df, **k: df.groupby(by)[on].agg(method).reset_index())
            rename_map = dict(zip(on, actions["rename"]))
            return Operation(lambda df, **k: df.groupby(by)[on].agg(method).rename(columns=rename_map).reset_index())

        if "rename" not in actions:
            return Operation(lambda df, **k: df.groupby(by)[on].agg(method).reset_index())
        rename_map = dict(zip(on, actions["rename"]))
        return Operation(lambda df, **k: df.groupby(by)[on].agg(method).rename(columns=rename_map).reset_index())

    @staticmethod
    def sort(by: List[str], ascending: List[bool]) -> Operation:
        return Operation(lambda df, **k: df.sort_values(by=by, ascending=ascending))

    @staticmethod
    def filter(by: List[str], condition: str) -> Operation:
        # if condition and by:
        #     return Operation(lambda df, **k: df[by].query(condition))
        # elif condition:
        #     return Operation(lambda df, **k: df.query(condition))
        # elif by:
        #     return Operation(lambda df, **k: df[by])
        if by:
            return Operation(lambda df, **k: df[df.columns.intersection(by)].query(condition))
        return Operation(lambda df, **k: df.query(condition))

    @staticmethod
    def rename(map: Dict[str, str]) -> Operation:
        return Operation(lambda df, **k: df.rename(columns=map))

    @staticmethod
    def tag(conditions: List[str], tag_col_name: str, tags: List[str], default_tag: str = None) -> Operation:
        return Operation(
            lambda df, **k: df.assign(
                **{
                    tag_col_name: np.select(
                        condlist=[df.eval(x) for x in conditions],
                        choicelist=tags,
                        default=default_tag,
                    )
                }
            )
        )

    @staticmethod
    def col_assign(method: str, col_name: str, value_expr: str, condition: str = "index > -1") -> Operation:
        if method == "lambda":
            value_func = eval(value_expr)
            return Operation(lambda df, **k: df.assign(**{col_name: df.query(condition).apply(func=value_func, axis=1)}))
        if method == "vectorized":
            return Operation(lambda df, **k: df.assign(**{col_name: df.query(condition).eval(value_expr)}))
        raise ValueError(f"Unsupported col_assign method: {method}")


    @staticmethod
    def series_transform(on: List[str], transform_expr: str, rename: List[str] = None, condition: str = "index > -1") -> Operation:
        """
        Series 变换算子 (原 col_apply):
        针对单列进行向量化或时序变换 (如 shift, diff, log, rolling)。
        
        :param on: 输入列名列表 (e.g. ["close"])
        :param transform_expr: 变换逻辑字符串 (e.g. "lambda x: x - x.shift(1)")
        :param rename: 输出列名列表 (e.g. ["close_diff"])。如果为 None，则直接覆盖 on 指定的列。
        :param condition: 筛选条件 (注意：shift/diff 等操作若在筛选后执行，是基于筛选后的相邻行)
        """
        columns = on or []
        
        # 1. 确定输出列名 (dest_columns)
        dest_columns = columns # 默认覆盖原列
        if rename:
            if isinstance(rename, str):
                rename = [rename]
            if len(rename) != len(columns):
                raise ValueError(f"Length mismatch: 'on' has {len(columns)} cols, but 'rename' has {len(rename)}.")
            dest_columns = rename

        # 2. 解析变换函数
        def resolve_func(expression: str) -> Callable:
            if not expression or not isinstance(expression, str):
                raise ValueError("series_transform requires a string 'transform_expr'.")
            
            # 注入常用库，方便 lambda 编写
            namespace = {"np": np, "pd": pd} 
            try:
                # 期望 expression 计算结果是一个 Callable
                func = eval(expression, namespace)
            except Exception as exc:
                raise ValueError(f"Failed to eval transform_expr: {expression}") from exc
            
            if not callable(func):
                raise ValueError(f"transform_expr must resolve to a callable, got type: {type(func)}")
            return func

        # 预先解析函数，避免在 _op 内部重复解析
        transform_func = resolve_func(transform_expr)

        def _op(df: pd.DataFrame, **k) -> pd.DataFrame:
            if not columns:
                return df
            
            working_df = df.copy()
            
            # 3. 处理筛选条件
            # 如果 condition 为 "index > -1" 或空，则 target_indices 为全量索引
            try:
                target_indices = df.query(condition).index
            except Exception as e:
                # 容错处理，防止 query 失败
                print(f"Warning: query failed in series_transform ({e}), using full index.")
                target_indices = df.index

            if target_indices.empty:
                return working_df

            # 4. 逐列计算并回填
            for src_col, dest_col in zip(columns, dest_columns):
                if src_col not in df.columns:
                    continue
                
                # 提取源数据 Series
                series_data = df.loc[target_indices, src_col]
                
                try:
                    # 执行变换 (e.g. lambda x: x.shift(1))
                    transformed = transform_func(series_data)
                except Exception as e:
                    raise RuntimeError(f"Error executing {transform_expr} on column '{src_col}': {e}")

                # 确保结果是 Series 并且索引对齐
                if not isinstance(transformed, pd.Series):
                    # 如果返回的是 scalar 或 numpy array，强制转为 Series 并对齐索引
                    transformed = pd.Series(transformed, index=target_indices)
                
                # 将变换后的数据写回 (reindex 确保索引顺序一致)
                working_df.loc[target_indices, dest_col] = transformed.reindex(target_indices)

            return working_df

        return Operation(_op, on=columns, transform_expr=transform_expr, rename=dest_columns, condition=condition)



    @staticmethod
    def col_apply(on: List[str], method: str, value_expr: Any = None, condition: str = "index > -1") -> Operation:
        columns = on or []

        def normalize_mapping(columns: List[str], mapping: Any) -> Dict[str, str]:
            normalized: Dict[str, str] = {}
            if mapping is None:
                return {col: col for col in columns}
            if isinstance(mapping, dict):
                for col in columns:
                    target = mapping.get(col)
                    normalized[col] = target if target else col
                return normalized
            if isinstance(mapping, list):
                for idx, col in enumerate(columns):
                    target = mapping[idx] if idx < len(mapping) else None
                    normalized[col] = target if target else col
                return normalized
            if isinstance(mapping, str):
                return {col: mapping if mapping else col for col in columns}
            return {col: col for col in columns}

        def resolve_callable(expression: str) -> Callable:
            if not expression or not expression.strip():
                raise ValueError("col_apply requires a callable `method` expression.")
            namespace = {"np": np, "pd": pd}
            try:
                candidate = eval(expression, namespace)
            except Exception as exc:
                raise ValueError(f"Unable to evaluate col_apply method: {expression}") from exc
            if not callable(candidate):
                raise ValueError(f"col_apply method must be callable, got: {expression}")
            return candidate

        apply_callable = resolve_callable(method)
        rename_map = normalize_mapping(columns, value_expr)

        def _op(df: pd.DataFrame, **k) -> pd.DataFrame:
            if not columns:
                return df
            working_df = df.copy()
            target_df = df.query(condition) if condition else df
            if target_df.empty:
                return working_df
            for col in columns:
                if col not in df.columns:
                    continue
                dest_col = rename_map.get(col, col)
                try:
                    transformed = apply_callable(target_df, col)
                except TypeError:
                    transformed = apply_callable(target_df[col])
                if not isinstance(transformed, pd.Series):
                    transformed = pd.Series(transformed, index=target_df.index)
                transformed = transformed.reindex(target_df.index)
                working_df.loc[target_df.index, dest_col] = transformed
            return working_df

        return Operation(_op, on=columns, method=method, value_expr=value_expr, condition=condition)


def parse_pipeline_operations(pipeline: List[Dict[str, Any]]) -> List[Operation]:
    operations: List[Operation] = []
    for op in pipeline:
        params = op["params"]
        condition = "index > -1" if ("condition" not in params or params["condition"] == "") else params["condition"]
        if op["type"] == "filter":
            requiredCols = None if "requiredCols" not in params else params["requiredCols"]
            if "map" in params:
                map_ = params["map"]
                operations.append(OperationFactory.rename(map=map_))
                operations.append(OperationFactory.filter(by=list(map_.values()), condition=condition))
            else:
                operations.append(OperationFactory.filter(by=requiredCols, condition=condition))
        elif op["type"] == "rename":
            operations.append(OperationFactory.rename(map=params["map"]))
        elif op["type"] == "aggregate":
            actions = params["actions"]
            operations.append(OperationFactory.agg(by=params["by"], actions=actions))
            continue
        elif op["type"] == "sort":
            operations.append(OperationFactory.sort(by=params["by"], ascending=params["ascending"]))
        elif op["type"] == "tag":
            default_tag = None if "default_tag" not in params else params["default_tag"]
            operations.append(
                OperationFactory.tag(
                    conditions=params["conditions"],
                    tag_col_name=params["tag_col_name"],
                    tags=params["tags"],
                    default_tag=default_tag,
                )
            )
        elif op["type"] == "col_assign":
            operations.append(
                OperationFactory.col_assign(
                    params["method"],
                    col_name=params["col_name"],
                    value_expr=params["value_expr"],
                    condition=condition,
                )
            )
        elif op["type"] == "col_apply":
            operations.append(
                OperationFactory.col_apply(
                    on=params["on"],
                    method=params["method"],
                    value_expr=params.get("value_expr"),
                    condition=condition,
                )
            )

        elif op["type"] == "series_transform":
            operations.append(
                OperationFactory.series_transform(
                    on=params["on"],
                    transform_expr=params["transform_expr"],
                    # 使用 rename 参数，如果没有则为 None (表示覆盖)
                    rename=params.get("rename"), 
                    condition=condition,
                )
            )

    return operations
