import React from 'react';

export type KpiItem = {
  label: string;
  value: string;
  positive?: boolean;
  sub?: string;
};

type KpiGridProps = {
  items: KpiItem[];
};

export default function KpiGrid({ items }: KpiGridProps) {
  return (
    <div className="kpi">
      {items.map((item, idx) => (
        <div key={idx} className="card">
          <div className="label">{item.label}</div>
          <div className={`value ${item.positive ? 'good' : ''}`.trim()}>
            {item.value}
          </div>
          {item.sub && <div className="sub">{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}
