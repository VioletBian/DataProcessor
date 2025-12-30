import React from 'react';
import BreadcrumbComponent from '../../components/NormalComponent/BreadcrumbComponent';

const steps = [
  {
    title: 'Upload your data',
    description: 'You can upload csv file / json list',
  },
  {
    title: 'Use your data pipeline',
    description: 'Import your saved pipeline json',
  },
  {
    title: 'Result View',
    description: 'Description line of text',
  },
];

const DataProcessorPage: React.FC = () => {
  return (
    <div style={{ padding: 16 }}>
      <BreadcrumbComponent title="data processor" subTitle="online data processor" />
      <div style={{ display: 'grid', gap: 16, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {steps.map((step, idx) => (
            <div
              key={step.title}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 12,
                minWidth: 180,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {idx + 1}. {step.title}
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>{step.description}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
          <p style={{ fontWeight: 700 }}>Choose files to upload</p>
          <input type="file" multiple />
        </div>
      </div>
    </div>
  );
};

export default DataProcessorPage;
