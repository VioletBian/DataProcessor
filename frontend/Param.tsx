else if (meta.uiType === 'map') {
  const uiLabelId = `pjg-label-${String(paramKey)}`;

  return (
    <Row className="pjg-string-list-item">
      <Col xs={2} lg={3}>
        <p id={uiLabelId} className="pjg-label">
          {paramKey.toString()}
        </p>
        <Tooltip target={uiLabelId}>{meta.helperContent}</Tooltip>
      </Col>

      <Col xs={10} lg={9}>
        <MapEditor
          value={(value || {}) as Record<string, string>}
          onChange={next => onChange(next)}
          keyPlaceholder={meta.keyPlaceholder}
          valuePlaceholder={meta.valuePlaceholder}
        />
      </Col>
    </Row>
  );
}
} else if (meta.uiType === 'nested-map') {
  const uiLabelId = `pjg-label-${String(paramKey)}`;

  return (
    <Row className="pjg-string-list-item">
      <Col xs={2} lg={3}>
        <p id={uiLabelId} className="pjg-label">
          {paramKey.toString()}
        </p>
        <Tooltip target={uiLabelId}>{meta.helperContent}</Tooltip>
      </Col>

      <Col xs={10} lg={9}>
        <NestedMapEditor
          value={(value || {}) as NestedStringMap}
          onChange={next => onChange(next)}
          outerKeyPlaceholder={meta.outerKeyPlaceholder}
          innerKeyPlaceholder={meta.innerKeyPlaceholder}
          innerValuePlaceholder={meta.innerValuePlaceholder}
        />
      </Col>
    </Row>
  );
}
