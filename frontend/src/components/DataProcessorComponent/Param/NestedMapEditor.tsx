import React from "react";
import { Input } from "@gs-ux-uitoolkit-react/input";
import { Button } from "@gs-ux-uitoolkit-react/button";
import { Row, Col } from "@gs-ux-uitoolkit-react/layout";
import { MapEditor } from "./MapEditor";

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
  const entries = Object.entries(value || {}) as [string, StringMap][];
  const rows: [string, StringMap][] = entries.length
    ? entries
    : [["", {} as StringMap]];

  const buildNestedObject = (pairs: [string, StringMap][]): NestedStringMap => {
    const result: NestedStringMap = {};
    pairs.forEach(([k, inner]) => {
      if (k.trim() !== "") {
        result[k] = inner || {};
      }
    });
    return result;
  };

  const updateOuter = (index: number, nextKey: string, nextInner: StringMap) => {
    const next = rows.map(([k, inner], i) =>
      i === index ? [nextKey, nextInner] : [k, inner]
    ) as [string, StringMap][];
    onChange(buildNestedObject(next));
  };

  const handleOuterKeyChange = (index: number, newKey: string) => {
    const [, inner] = rows[index];
    updateOuter(index, newKey, inner);
  };

  const handleInnerChange = (index: number, newInner: StringMap) => {
    const [outerKey] = rows[index];
    updateOuter(index, outerKey, newInner);
  };

  const handleAddOuter = () => {
    const next = [...rows, ["", {} as StringMap]];
    onChange(buildNestedObject(next));
  };

  const handleRemoveOuter = (index: number) => {
    const next = rows.filter((_, i) => i !== index) as [string, StringMap][];
    onChange(buildNestedObject(next));
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
              />
            </Col>
          </Row>

          {/* 内层映射表 */}
          <Row style={{ marginBottom: 8 }}>
            <Col xs={24} lg={24}>
              <MapEditor
                value={innerMap}
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
                disabled={rows.length === 1}
                style={{ marginRight: 4 }}
              >
                Remove
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
