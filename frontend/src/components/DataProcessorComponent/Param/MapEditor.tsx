import React, { useState, useEffect } from "react";
import { Row, Col } from "@gs-ux-uitoolkit-react/layout";
import { Input } from "@gs-ux-uitoolkit-react/input";
import { Button } from "@gs-ux-uitoolkit-react/button";

type StringMap = Record<string, string>;

interface MapEditorProps {
  value: StringMap | undefined;
  onChange: (next: StringMap) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export const MapEditor: React.FC<MapEditorProps> = ({
  value,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
}) => {
  // 1. 使用本地 state 来管理 UI 上的行，允许空 Key 或重复 Key 存在于 UI 中
  const [rows, setRows] = useState<[string, string][]>(() => {
    const entries = Object.entries(value || {});
    return entries.length ? entries : [['', '']];
  });

  // 2. 辅助函数：将当前的 rows 数组转换为对象并触发 onChange
  // 注意：这里依然保留过滤空 Key 的逻辑，确保传给父组件的数据是干净的
  const triggerChange = (currentRows: [string, string][]) => {
    const result: StringMap = {};
    currentRows.forEach(([k, v]) => {
      if (k.trim() !== '') {
        result[k] = v;
      }
    });
    onChange(result);
  };

  // 3. 处理 Key 变化
  const handleKeyChange = (index: number, newKey: string) => {
    const newRows = [...rows];
    newRows[index] = [newKey, newRows[index][1]];
    setRows(newRows); // 更新 UI
    triggerChange(newRows); // 更新底层数据
  };

  // 4. 处理 Value 变化
  const handleValueChange = (index: number, newVal: string) => {
    const newRows = [...rows];
    newRows[index] = [newRows[index][0], newVal];
    setRows(newRows);
    triggerChange(newRows);
  };

  // 5. 处理添加行
  const handleAddRow = () => {
    const newRows: [string, string][] = [...rows, ['', '']];
    setRows(newRows); // UI 上立即显示空行
    // 这里不需要立即 triggerChange，因为新行是空的，转换后数据没变，
    // 但为了保持逻辑一致性或如果有特殊处理，也可以调用。
    // 通常为了防止父组件因为"数据没变"而不更新导致某些边缘副作用，仅更新 UI 即可。
    // 但如果想让父组件知道"用户在操作"，调用也无妨。
  };

  // 6. 处理删除行
  const handleRemoveRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    // 如果删光了，至少保留一行空的（可选逻辑，视需求而定）
    if (newRows.length === 0) {
        newRows.push(['', '']);
    }
    setRows(newRows);
    triggerChange(newRows);
  };

  // (可选) 7. 如果外部 value 发生了非用户输入的剧烈变化（比如重置表单），需要同步回 rows
  // 注意：这个 useEffect 有风险，如果此时用户正在输入造成了临时重复 Key，
  // 这里的同步可能会导致输入焦点跳动或正在编辑的内容被"清洗"掉。
  // 如果你的应用场景主要是单向数据流（从上到下），可以加上；
  // 但对于 MapEditor 这种由于 Object 自身限制导致数据有损转换的组件，
  // 建议只在初始化时读取 value，或者当 value 和当前 rows 转换出的对象差异极大时才同步。
  // 简单起见，如果父组件不会通过其他方式修改这个 value，可以不加下面这个 useEffect。
  /*
  useEffect(() => {
    // 只有当 value 真的变了，且不是我们刚才发出的那个 value 时才更新...
    // 这是一个复杂的受控组件同步问题。
    // 简单做法：如果不要求"父组件重置表单"功能，可以忽略此 useEffect。
  }, [value]); 
  */

  return (
    <>
      {rows.map(([k, v], idx) => (
        <Row key={idx} className="pjg-map-row" style={{ marginBottom: 4 }}>
          <Col xs={5} lg={5}>
            <Input
              style={{ width: '98%' }}
              className="pjg-input"
              placeholder={keyPlaceholder || '原值 / 列名'}
              value={k}
              onChange={e => handleKeyChange(idx, e.target.value)}
              clearable={true}
              // 添加 onClearClick 支持
              onClearClick={() => handleKeyChange(idx, "")}
            />
          </Col>

          <Col xs={5} lg={5}>
            <Input
              style={{ width: '98%' }}
              className="pjg-input"
              placeholder={valuePlaceholder || '映射后的值'}
              value={v}
              onChange={e => handleValueChange(idx, e.target.value)}
              clearable={true}
               // 添加 onClearClick 支持
               onClearClick={() => handleValueChange(idx, "")}
            />
          </Col>

          <Col
            xs={2}
            lg={2}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Button
              type="button"
              size="sm"
              onClick={() => handleRemoveRow(idx)}
              // 允许删除最后一行，如果不允许请取消注释下面这行
              // disabled={rows.length === 1}
              style={{ marginRight: 4 }}
            >
              -
            </Button>
            {idx === rows.length - 1 && (
              <Button type="button" size="sm" onClick={handleAddRow}>
                +
              </Button>
            )}
          </Col>
        </Row>
      ))}
    </>
  );
};

export default MapEditor;
