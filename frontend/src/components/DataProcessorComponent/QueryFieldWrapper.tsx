import React, { useMemo } from 'react';
// 假设这是根据你截图OCR出来的库引用
import {
  QueryField,
  DimensionConfig,
  QueryChangeEvent
} from '@gs-ux-uitoolkit-react/queryfield';

interface QueryFieldWrapperProps {
  value: string;
  onChange: (val: string) => void;
  columns: string[]; // 从CSV读取到的列名
  placeholder?: string;
}

export const QueryFieldWrapper: React.FC<QueryFieldWrapperProps> = ({
  value,
  onChange,
  columns,
  placeholder
}) => {
  
  // 将简单的字符串列名转换为 QueryField 需要的 DimensionConfig
  const dimensions: DimensionConfig[] = useMemo(() => {
    return columns.map(col => ({
      name: col,
      viewConfig: {
        displayText: col
      },
      operators: [
        { name: 'equals', displayText: '==' },
        { name: 'not equals', displayText: '!=' },
        { name: 'contains', displayText: 'contains' },
        { name: 'greater than', displayText: '>' },
        { name: 'less than', displayText: '<' }
        // 根据截图，你可以扩展更多 pandas 支持的操作符
      ]
    }));
  }, [columns]);

  // 处理 QueryField 的变化，将其转换为 pandas query string
  // 注意：真实的 QueryField 回调通常很复杂，这里做一个简化适配
  const handleQueryChange = (event: QueryChangeEvent) => {
    // 假设 event.filter.value 返回的是构建好的类似 SQL 的字符串
    // 或者我们需要手动拼接 event.predicates
    // 这里为了演示，假设组件能返回个字符串表示
    if (event.filter && event.filter.value) {
        onChange(event.filter.value);
    } 
    // 如果是 predicate 模式（截图中的 chips）
    else if (event.predicates && event.predicates.length > 0) {
        // 将 predicates 拼装成 pandas query 字符串
        // 示例: "City == 'New York'"
        const queryStr = event.predicates.map((p: any) => {
             const opMap: Record<string, string> = {
                 'equals': '==',
                 'not equals': '!=',
                 'greater than': '>',
                 'less than': '<',
                 'contains': 'contains' // contains在pandas需特殊处理，暂不做深究
             };
             const operator = opMap[p.operator] || p.operator;
             const val = isNaN(Number(p.rightOperand)) ? `'${p.rightOperand}'` : p.rightOperand;
             
             if (p.operator === 'contains') {
                 return `${p.leftOperand}.str.contains(${val})`;
             }
             return `${p.leftOperand} ${operator} ${val}`;
        }).join(' and ');
        
        onChange(queryStr);
    } else {
        onChange("");
    }
  };

  // 如果没有列信息，回退到普通输入框或提示
  if (!columns || columns.length === 0) {
      return (
          <div style={{color: '#999', fontSize: 12}}>
             Upload data to enable smart query
             {/* 这里依然需要渲染一个 Input 以免阻断输入 */}
             <input 
                className="pjg-input" 
                style={{width: '98%'}} 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                placeholder={placeholder}
             />
          </div>
      );
  }

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 4 }}>
      <QueryField
        dimensions={dimensions}
        // 如果有 dimensionValues (每列的枚举值)，也可传入
        dimensionValues={[]} 
        onQueryChange={handleQueryChange}
        // 传入当前已有的 predicates (这就需要复杂的反解析逻辑，这里暂略，仅做单向生成)
        // predicates={...}
        size="sm"
        placeholder={placeholder || "Search for filters..."}
      />
      {/* 这是一个隐式的 Text 用于显示生成的 query string 供用户检查 */}
      <div style={{fontSize: 10, color: '#666', marginTop: 4}}>
          Generated: {value}
      </div>
    </div>
  );
};