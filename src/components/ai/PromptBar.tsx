import React, { useState } from 'react';

type PromptBarProps = {
  onGenerate?: (payload: any) => void;
  onRegenerate?: () => void;
  onFix?: () => void;
};

export default function PromptBar({ onGenerate, onRegenerate, onFix }: PromptBarProps) {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [pair, setPair] = useState('USD/JPY');
  const [timeframe, setTimeframe] = useState('4H');
  const [period, setPeriod] = useState('過去30日');

  const templates = [
    { id: 'bullish', label: 'ドル高シナリオ' },
    { id: 'event', label: 'イベント前の戦略' },
    { id: 'lowvol', label: 'ボラ低下時' },
  ];

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="prompt-bar">
      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="tag">テンプレ</span>
          {templates.map((t) => (
            <button
              key={t.id}
              className="btn"
              aria-pressed={activeTemplate === t.id}
              onClick={() => setActiveTemplate(activeTemplate === t.id ? null : t.id)}
              style={{
                background: activeTemplate === t.id ? 'var(--accent)' : 'var(--chip)',
                color: activeTemplate === t.id ? '#fff' : 'var(--text)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={() => onGenerate?.({ prompt, pair, timeframe, period })}>
            提案を生成
          </button>
          <button className="btn" onClick={() => onRegenerate?.()}>
            再生成
          </button>
          <button className="btn" onClick={() => onFix?.()}>
            固定
          </button>
        </div>
      </div>
      <div className="row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%' }}>
        <input
          className="btn"
          style={{ flex: 1, minWidth: 220, boxSizing: 'border-box' }}
          placeholder="例）USD/JPY 4H、イベント控え、ややドル高のアイデア"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <select className="btn" value={pair} onChange={(e) => setPair(e.target.value)} style={{ boxSizing: 'border-box' }}>
          <option>USD/JPY</option>
          <option>EUR/USD</option>
          <option>GBP/JPY</option>
        </select>
        <select className="btn" value={timeframe} onChange={(e) => setTimeframe(e.target.value)} style={{ boxSizing: 'border-box' }}>
          <option>1H</option>
          <option>4H</option>
          <option>1D</option>
        </select>
        <select className="btn" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ boxSizing: 'border-box' }}>
          <option>過去30日</option>
          <option>過去60日</option>
          <option>過去90日</option>
        </select>
      </div>
    </section>
  );
}
