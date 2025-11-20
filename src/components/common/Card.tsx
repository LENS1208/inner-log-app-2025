import React from 'react';
import { HelpIcon } from './HelpIcon';

type CardProps = {
  title?: string;
  helpText?: string;
  annotation?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export default function Card({ title, helpText, annotation, children, className = '', style }: CardProps) {
  return (
    <div className={`dash-card ${className}`.trim()} style={style}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h3 style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 'bold',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            {title}
            {helpText && <HelpIcon text={helpText} />}
          </h3>
          {annotation && (
            <div style={{
              fontSize: 11,
              color: 'var(--muted)',
              background: 'var(--chip)',
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid var(--line)',
              textAlign: 'right',
              lineHeight: 1.4
            }}>
              {annotation.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
