import React from 'react';
import type { TextareaGroupValue } from './types';

export type TextareaGroupProps = {
  values: TextareaGroupValue;
  onChange?: (v: TextareaGroupValue) => void;
};

export default function TextareaGroup({ values, onChange }: TextareaGroupProps) {
  const handleChange = (field: keyof TextareaGroupValue) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange({ ...values, [field]: e.target.value });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div>
        <label htmlFor="good" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
          うまくいった点
        </label>
        <textarea
          id="good"
          className="journal-textarea"
          value={values.good}
          onChange={handleChange('good')}
          placeholder="うまくいった点を記入..."
        />
      </div>

      <div>
        <label htmlFor="improvement" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
          改善点
        </label>
        <textarea
          id="improvement"
          className="journal-textarea"
          value={values.improvement}
          onChange={handleChange('improvement')}
          placeholder="改善点を記入..."
        />
      </div>

      <div>
        <label htmlFor="memo" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
          自由メモ
        </label>
        <textarea
          id="memo"
          className="journal-textarea"
          value={values.memo}
          onChange={handleChange('memo')}
          placeholder="自由メモを記入..."
        />
      </div>
    </div>
  );
}
