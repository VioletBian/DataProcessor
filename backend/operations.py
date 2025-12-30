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
    return operations
