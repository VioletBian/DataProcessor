export type OperatorType =
  | 'filter'
  | 'sort'
  | 'aggregate'
  | 'tag'
  | 'col_assign'
  | 'col_apply'
  | 'constant'
  | 'value_mapping'
  | 'formatter';

export interface OperatorMeta {
  type: OperatorType;
  title: string;
  description: string;
  docHint: string;
}

export const OPERATOR_META: Record<OperatorType, OperatorMeta> = {
  filter: {
    type: 'filter',
    title: 'Filter',
    description: '',
    docHint: '',
  },
  sort: {
    type: 'sort',
    title: 'Sort',
    description: '',
    docHint: '',
  },
  aggregate: {
    type: 'aggregate',
    title: 'Aggregate',
    description: '',
    docHint: '',
  },
  tag: {
    type: 'tag',
    title: 'Tag',
    description: '',
    docHint: '',
  },
  col_apply: {
    type: 'col_apply',
    title: 'Column apply',
    description: '',
    docHint: '',
  },
  col_assign: {
    type: 'col_assign',
    title: 'Column assign',
    description: '',
    docHint: '',
  },
  constant: {
    type: 'constant',
    title: 'Constant',
    description: '',
    docHint: '',
  },
  value_mapping: {
    type: 'value_mapping',
    title: 'Value mapping',
    description: '',
    docHint: '',
  },
  formatter: {
    type: 'formatter',
    title: 'Formatter',
    description: '',
    docHint: '',
  },
};

// Params for each operator
export interface FilterParams {
  by?: string[];
  condition: string;
}

export interface SortParams {
  by: string[];
  ascending: boolean[];
}

export type AggregationMethod = 'sum' | 'count' | 'std' | 'min' | 'max';

export interface AggregateAction {
  method: string; // mean/sum/count/max/min/std...
  on: string[];
  rename?: string[];
  summary_output: string;
  summary_label: string;
}

export type AggregateActionKey = keyof AggregateAction;

export interface AggregationParams {
  by: string[];
  actions: AggregateAction[];
}

export interface TagParams {
  col_name?: string;
  conditions: string[];
  tags: string[];
  default_tag?: string;
}

export interface ColAssignParams {
  on?: string[];
  col_name: string;
  method: 'lambda' | 'vectorized';
  value_expr: string;
  condition?: string;
}

export interface ColApplyParams {
  on?: string[];
  value_expr: string;
  method?: 'lambda' | 'vectorized';
  condition?: string;
}

export interface ConstantParams {
  columns: Record<string, string>; // map格式
}

export interface ValueMappingParams {
  mode: 'map' | 'replace';
  mappings: Record<string, Record<string, string>>; // nested-map格式
  default?: string;
}

export interface FormatterParams {}

export type OperatorParamsMap = {
  filter: FilterParams;
  sort: SortParams;
  aggregate: AggregationParams;
  tag: TagParams;
  col_apply: ColApplyParams;
  col_assign: ColAssignParams;
  constant: ConstantParams;
  value_mapping: ValueMappingParams;
  formatter: FormatterParams;
};

export type OperatorParamKey<T extends OperatorType> = keyof OperatorParamsMap[T];

export type OperatorParamUiType = 'string' | 'string-list' | 'sub-action' | 'map' | 'nested-map' | 'mapped-string' | 'mapped-boolean' | 'select' | 'radio';

export interface BaseParamMeta {
  description: string;
  placeholder?: string;
  helperContent?: string;
  required?: boolean;
  actionTypes?: string[];
  options?: any[];
}

export type ParamMeta<ReferenceKey extends string = string> =
  | (BaseParamMeta & {
      uiType: 'string' | 'string-list' | 'sub-action' | 'map' | 'nested-map' | 'select' | 'radio';
      referenceKey?: undefined;
    })
  | (BaseParamMeta & {
      uiType: 'mapped-string' | 'mapped-boolean';
      referenceKey: ReferenceKey;
    });

export type ActionValue = 'mean' | 'sum' | 'count' | 'std' | 'min' | 'max';

const actionMethodOptions: {value: string, label: string}[] = [
  {value: "mean", label: "Mean"},
  {value: "count", label: "Count"},
  {value: "sum", label: "Sum"},
  {value: "max", label: "Max"},
  {value: "min", label: "Min"},
  {value: "std", label: "Standard Deviation"}
];

interface ActionOption {
  value: ActionValue;
  label: string;
}

export type OperatorParamMap = {
  [K in OperatorType]: Record<keyof OperatorParamsMap[K], ParamMeta<any>>;
};

export const OPERATOR_PARAM_META_CONFIG: OperatorParamMap = {
  filter: {
    by: {
      description: 'columns you want to keep',
      placeholder: 'ClientId, ClientName, Position',
      helperContent: 'string list of column names, separated by ,',
      uiType: 'string-list',
    },
    condition: {
      description: 'condition to select rows',
      placeholder: "ClientAccountId!='123456' && ClientName != '123456'",
      helperContent: 'multiple logic align with sql/python',
      uiType: 'string',
      required: true,
    },
  },
  sort: {
    by: {
      description: 'columns you want to sort by',
      placeholder: 'ClientId, ClientName, Date',
      helperContent: 'reference for multiple sort level',
      uiType: 'string-list',
    },
    ascending: {
      description: 'ascending or descending for each index',
      placeholder: 'bool: true/false',
      helperContent: 'false: descent for column in by, true for ascending',
      uiType: 'mapped-boolean',
      referenceKey: 'by',
    },
  },
  aggregate: {
    by: {
      description: 'columns you want to aggregate by',
      placeholder: 'ClientId, ClientName etc',
      helperContent: 'multiple select align with sql/python',
      uiType: 'string-list',
      required: true,
    },
    actions: {
      description: 'what function to do with grouped data',
      placeholder: 'choose from count/sum/max/...',
      helperContent:
        "[{value:'mean',label:'mean'},{value:'count',label:'count'},{value:'sum',label:'sum'},{value:'min',label:'min'},{value:'max',label:'max'},{value:'std',label:'Standard Deviation'}]",
      uiType: 'sub-action',
      actionTypes: ['sum', 'mean', 'count', 'min', 'max', 'std'],
    },
  },
  tag: {
    col_name: {
      description: 'your tag column name',
      placeholder: 'AlertNotice',
      helperContent: 'if not set, with a new column name, its value will be tags',
      uiType: 'string',
    },
    tags: {
      description: 'tags align with the condition case level',
      placeholder: 'tag option: xyz, green, match etc.',
      helperContent: 'first tag for all row matches in first condition, etc.',
      uiType: 'string-list',
    },
    conditions: {
      description: 'conditions to filter data rows',
      placeholder: "ClientAccountId > 0 || ClientAccountID > 2023100001",
      helperContent: 'condition list, with FIRST match to fill into logic',
      uiType: 'mapped-string',
      referenceKey: 'tags',
    },
    default_tag: {
      description: 'for rows unmatched, set the tag value as this',
      placeholder: 'null',
      helperContent: 'if not set, unmatched rows still have NULL value in tag column',
      uiType: 'string',
    },
  },
  col_apply: {
    on: {
      description: 'columns calculate in time series index',
      placeholder: 'apply: npv/decay/etc.',
      helperContent: 'apply function on this column list',
      uiType: 'string-list',
    },
    value_expr: {
      description: 'applied columns for calculated result',
      placeholder: 'last Price Change, Last OpenClose Change',
      helperContent: 'rename column names if needed',
      uiType: 'mapped-string',
      referenceKey: 'on',
    },
    method: {
      description: 'function logic applied for each column',
      placeholder: 'lambda or vectorized',
      helperContent: 'choose between lambda or vectorized',
      uiType: 'string',
    },
    condition: {
      description: 'condition to select rows',
      placeholder: "Client Account > xxxxxxx, with field match",
      helperContent: 'multiple logic align with sql/python',
      uiType: 'string',
    },
  },
  col_assign: {
    on: {
      description: 'columns calculate in time series index',
      placeholder: 'vectorized or lambda',
      helperContent: 'vectorized or lambda',
      uiType: 'string',
    },
    col_name: {
      description: 'new column name for result',
      placeholder: 'transformedColumn',
      helperContent: 'can be new column or overwrite existing column',
      uiType: 'string',
    },
    method: {
      description: 'function logic applied for each column',
      placeholder: 'lambda x: x.shift(1)',
      helperContent: 'language align with pandas',
      uiType: 'string',
    },
    value_expr: {
      description: 'calculate expression for each row data',
      placeholder:
        "vectorized sample: quantity * price / 100000, lambda sample: lambda x: x['quantity'] * x['price'] if str(x['Client Account']).startswith('1') else None",
      helperContent: 'need use existing column name and keep expression correct',
      uiType: 'string',
    },
    condition: {
      description: 'condition to select rows',
      placeholder: "Client Account > xxxxxxx, with field match",
      helperContent: 'multiple logic align with sql/python',
      uiType: 'string',
    },
  },
  constant: {
    columns: {
      description: 'assign constant values to columns',
      placeholder: 'e.g., columnA: value1, columnB: value2',
      helperContent: 'map format: column name -> constant value',
      uiType: 'map',
      required: true,
    },
  },
  value_mapping: {
    mode: {
      description: 'mapping mode',
      placeholder: 'select map or replace',
      helperContent: 'map: create new mapped column, replace: overwrite existing column',
      uiType: 'select',
      required: true,
      options: [
        { value: 'map', label: 'Map (Create New)' },
        { value: 'replace', label: 'Replace (Overwrite)' },
      ],
    },
    mappings: {
      description: 'value mapping rules',
      placeholder: 'e.g., columnA: {AAA: aaa, BBB: bbb}',
      helperContent: 'nested map format: column name -> {original value -> mapped value}',
      uiType: 'nested-map',
      required: true,
    },
    default: {
      description: 'default value for unmapped items',
      placeholder: 'e.g., unknown',
      helperContent: 'if value not found in mapping, use this default',
      uiType: 'string',
      required: false,
    },
  },
  formatter: {},
};

export const AGGREGATE_ACTION_META_CONFIG: Record<AggregateActionKey, ParamMeta<any>> = {
  method: {
    uiType: "select",
    description: "",
    placeholder: "",
    helperContent: "the method you want to do with grouped data",
    required: true,
    options: actionMethodOptions
  },
  on: {
    uiType: "string-list",
    description: "",
    placeholder: "",
    helperContent: "after grouped, which columns you want to operate on",
    required: true,
  },
  rename: {
    uiType: "mapped-string",
    description: "",
    placeholder: "",
    helperContent: "mapped to `on`, rename the calculate result column name",
    required: false,
    referenceKey: 'on'
  },
  summary_label: {
    uiType: "string",
    description: "only use in appended mode, default as SubGroup",
    placeholder: "",
    helperContent: "heading value of group result row",
    required: false,
  },
  summary_output: {
    uiType: "radio",
    description: "two mode for table returned",
    placeholder: "",
    helperContent: "grouped mode returns only grouped result, appended mode sort and insert group result row",
    required: false,
    options: ["grouped", "appended"],
  },
};
