import React from 'react';

interface BreadcrumbComponentProps {
  title: string;
  subTitle?: string;
}

export const BreadcrumbComponent: React.FC<BreadcrumbComponentProps> = ({ title, subTitle }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{title}</div>
      {subTitle ? <div style={{ fontWeight: 600, fontSize: 16 }}>{subTitle}</div> : null}
    </div>
  );
};

export default BreadcrumbComponent;
