import React, { useState } from "react";
import { Input } from "@gs-ux-uitoolkit-react/input";
import { Button } from "@gs-ux-uitoolkit-react/button";
import { Row, Col } from "@gs-ux-uitoolkit-react/layout";
import MapEditor from "./MapEditor"; // 确保引用路径正确

type StringMap = Record<string, string>;
type NestedStringMap = Record<string, StringMap>;

interface NestedMapEditorProps {
  value: NestedStringMap | undefined;
  onChange: (next: NestedStringMap) => void;
  outerKeyPlaceholder?: string;
  innerKeyPlaceholder?: string;
  innerValuePlaceholder?: string;
}

const NestedMapEditor: React.FC<NestedMapEditorProps> = ({
  value,
  onChange,
  outerKeyPlaceholder = "Column name",
  innerKeyPlaceholder = "Original value",
  innerValuePlaceholder = "Mapped value",
}) => {
  // 1. 引入 useState 管理本地行状态
  const [rows, setRows] = useState<[string, StringMap][]>(() => {
    const entries = Object.entries(value || {}) as [string, StringMap][];
    return entries.length ? entries : [["", {} as StringMap]];
  });

  // 2. 辅助函数：将 UI 状态转回对象并提交给父组件
  // 依然保留过滤逻辑，保证提交的数据是干净的
  const triggerChange = (currentRows: [string, StringMap][]) => {
    const result: NestedStringMap = {};
    currentRows.forEach(([k, inner]) => {
      if (k.trim() !== "") {
        result[k] = inner || {};
      }
    });
    onChange(result);
  };

  // 3. 处理外层 Key (Column name) 变化
  const handleOuterKeyChange = (index: number, newKey: string) => {
    const newRows = [...rows];
    // 更新 Key，但保留内部的 innerMap
    newRows[index] = [newKey, newRows[index][1]]; 
    
    setRows(newRows); // 立即更新 UI
    triggerChange(newRows); // 尝试更新数据
  };

  // 4. 处理内部 Map 的变化
  const handleInnerChange = (index: number, newInner: StringMap) => {
    const newRows = [...rows];
    // 保留 Key，更新 innerMap
    newRows[index] = [newRows[index][0], newInner];
    
    setRows(newRows); // 这里的 setRows 主要是为了保持状态一致
    triggerChange(newRows);
  };

  // 5. 处理添加外层列
  const handleAddOuter = () => {
    const newRows: [string, StringMap][] = [...rows, ["", {} as StringMap]];
    setRows(newRows); // 必须：这会让新的一行立即在 UI 上渲染出来
    
    // 可选：调用 triggerChange。
    // 虽然因为 key 是空会被过滤掉，导致父组件数据没变，
    // 但 UI 已经通过 setRows 更新了，用户就能看到新行了。
  };

  // 6. 处理移除外层列
  const handleRemoveOuter = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    // (可选) 如果删空了，保留一个空行
    if (newRows.length === 0) {
      newRows.push(["", {} as StringMap]);
    }
    setRows(newRows);
    triggerChange(newRows);
  };

  return (
    <div style={{ width: "100%" }}>
      {rows.map(([outerKey, innerMap], outerIdx) => (
        <div key={outerIdx} style={{ marginBottom: 16, border: "1px solid #e0e0e0", padding: 8, borderRadius: 4 }}>
          {/* 外层列名 */}
          <Row style={{ marginBottom: 8 }}>
            <Col xs={22} lg={22}>
              <Input
                style={{ width: "98%" }}
                className="pjg-input"
                placeholder={outerKeyPlaceholder}
                value={outerKey}
                onChange={(e) => handleOuterKeyChange(outerIdx, e.target.value)}
                clearable={true}
                // 记得加上 onClearClick
                onClearClick={() => handleOuterKeyChange(outerIdx, "")}
              />
            </Col>
          </Row>

          {/* 内层映射表 */}
          <Row style={{ marginBottom: 8 }}>
            <Col xs={24} lg={24}>
              <MapEditor
                value={innerMap}
                // 这里当内部 MapEditor 触发 onChange 时，我们更新本地状态并冒泡
                onChange={(next) => handleInnerChange(outerIdx, next)}
                keyPlaceholder={innerKeyPlaceholder}
                valuePlaceholder={innerValuePlaceholder}
              />
            </Col>
          </Row>

          {/* 操作按钮 */}
          <Row>
            <Col xs={24} lg={24} style={{ textAlign: "right" }}>
              <Button
                type="button"
                size="sm"
                emphasis="subtle"
                onClick={() => handleRemoveOuter(outerIdx)}
                // 允许删光或者只剩一行时禁止，看你需要
                // disabled={rows.length === 1}
                style={{ marginRight: 4 }}
              >
                Remove Column
              </Button>
              {outerIdx === rows.length - 1 && (
                <Button type="button" size="sm" emphasis="subtle" onClick={handleAddOuter}>
                  Add Column
                </Button>
              )}
            </Col>
          </Row>
        </div>
      ))}
    </div>
  );
};

export default NestedMapEditor;
