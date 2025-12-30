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
    return operations
