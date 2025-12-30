import React from 'react';

interface JSONPreviewProps {
  data: unknown;
  label?: string;
}

export const JSONPreview: React.FC<JSONPreviewProps> = ({ data, label }) => {
  return (
    <div style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, minHeight: 120 }}>
      {label ? <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{label}</div> : null}
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default JSONPreview;
