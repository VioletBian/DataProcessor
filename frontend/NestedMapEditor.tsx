type NestedStringMap = Record<string, StringMap>;

interface NestedMapEditorProps {
  value: NestedStringMap | undefined;
  onChange: (next: NestedStringMap) => void;
  outerKeyPlaceholder?: string;  // 外层 key：列名
  innerKeyPlaceholder?: string;  // 内层 key：原值
  innerValuePlaceholder?: string;// 内层 value：映射值
}
const NestedMapEditor: React.FC<NestedMapEditorProps> = ({
  value,
  onChange,
  outerKeyPlaceholder,
  innerKeyPlaceholder,
  innerValuePlaceholder,
}) => {
  const entries = Object.entries(value || {});
  const rows: [string, StringMap][] = entries.length
    ? entries
    : [['', {} as StringMap]];

  const buildNestedObject = (pairs: [string, StringMap][]) => {
    const result: NestedStringMap = {};
    pairs.forEach(([k, inner]) => {
      if (k.trim() !== '') {
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
    const next = [...rows, ['', {} as StringMap]];
    onChange(buildNestedObject(next));
  };

  const handleRemoveOuter = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(buildNestedObject(next));
  };

  return (
    <>
      {rows.map(([outerKey, innerMap], outerIdx) => (
        <div key={outerIdx} style={{ marginBottom: 8 }}>
          <Row className="pjg-nested-map-row">
            {/* 外层列名 */}
            <Col xs={3} lg={3}>
              <Input
                style={{ width: '98%' }}
                className="pjg-input"
                placeholder={outerKeyPlaceholder || '列名 / 字段名'}
                value={outerKey}
                onChange={e => handleOuterKeyChange(outerIdx, e.target.value)}
                clearable={true}
              />
            </Col>

            {/* 内层映射表：复用 MapEditor */}
            <Col xs={7} lg={7}>
              <MapEditor
                value={innerMap}
                onChange={next => handleInnerChange(outerIdx, next)}
                keyPlaceholder={innerKeyPlaceholder || '原值'}
                valuePlaceholder={innerValuePlaceholder || '映射后的值'}
              />
            </Col>

            {/* 操作按钮 */}
            <Col
              xs={2}
              lg={2}
              style={{ display: 'flex', alignItems: 'flex-start' }}
            >
              <Button
                type="button"
                size="sm"
                onClick={() => handleRemoveOuter(outerIdx)}
                disabled={rows.length === 1}
                style={{ marginRight: 4 }}
              >
                -
              </Button>
              {outerIdx === rows.length - 1 && (
                <Button type="button" size="sm" onClick={handleAddOuter}>
                  +
                </Button>
              )}
            </Col>
          </Row>
        </div>
      ))}
    </>
  );
};
