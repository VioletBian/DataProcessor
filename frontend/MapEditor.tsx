type StringMap = Record<string, string>;

interface MapEditorProps {
  value: StringMap | undefined;
  onChange: (next: StringMap) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

const MapEditor: React.FC<MapEditorProps> = ({
  value,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
}) => {
  const entries = Object.entries(value || {});
  const rows: [string, string][] = entries.length ? entries : [['', '']];

  const buildObject = (pairs: [string, string][]) => {
    const result: StringMap = {};
    pairs.forEach(([k, v]) => {
      if (k.trim() !== '') {
        result[k] = v;
      }
    });
    return result;
  };

  const updateRow = (index: number, nextKey: string, nextVal: string) => {
    const next = rows.map(([k, v], i) =>
      i === index ? [nextKey, nextVal] : [k, v]
    ) as [string, string][];
    onChange(buildObject(next));
  };

  const handleKeyChange = (index: number, newKey: string) => {
    const [, oldVal] = rows[index];
    updateRow(index, newKey, oldVal);
  };

  const handleValueChange = (index: number, newVal: string) => {
    const [oldKey] = rows[index];
    updateRow(index, oldKey, newVal);
  };

  const handleAddRow = () => {
    const next = [...rows, ['', '']];
    onChange(buildObject(next));
  };

  const handleRemoveRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(buildObject(next));
  };

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
              disabled={rows.length === 1}
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
