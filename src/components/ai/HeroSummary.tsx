import React from 'react';
import type { HeroData } from '../../types/ai-proposal.types';
import StarRating from './StarRating';

type HeroSummaryProps = {
  hero: HeroData;
  rating?: number | null;
  onRatingChange?: (rating: number) => void;
};

export default function HeroSummary({ hero, rating, onRatingChange }: HeroSummaryProps) {
  const biasClass = hero.bias === 'BUY' ? 'good' : hero.bias === 'SELL' ? 'bad' : '';
  const biasLabel = hero.bias === 'BUY' ? 'BUY（買い寄り）' : hero.bias === 'SELL' ? 'SELL（売り寄り）' : 'NEUTRAL（中立）';

  return (
    <section className="hero" data-testid="hero">
      <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>
          AIサマリー：{hero.pair}｜<span className={`status ${biasClass}`}>{biasLabel}</span>
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onRatingChange && (
            <StarRating
              rating={rating || null}
              onChange={onRatingChange}
            />
          )}
          <div className="tag">信頼度 {hero.confidence}%</div>
        </div>
      </div>
      <div className="bar" aria-label="AI信頼度">
        <i style={{ width: `${hero.confidence}%` }}></i>
      </div>
      <div className="kpi-quick" style={{ marginTop: 10 }}>
        <div className="mini">
          <div className="label">現在レート</div>
          <div className="value">{hero.nowYen}円</div>
        </div>
        {hero.buyEntry && (
          <div className="mini">
            <div className="label">買いエントリー</div>
            <div className="value good">{hero.buyEntry}</div>
          </div>
        )}
        {hero.sellEntry && (
          <div className="mini">
            <div className="label">売りエントリー</div>
            <div className="value bad">{hero.sellEntry}</div>
          </div>
        )}
        <div className="mini">
          <div className="label">通貨ペア</div>
          <div className="value">{hero.pair}</div>
        </div>
      </div>
      <p className="subnote">※ 提案は候補であり、取引判断はご自身で行ってください。</p>
    </section>
  );
}
