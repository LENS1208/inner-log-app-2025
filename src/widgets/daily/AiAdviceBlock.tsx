import React from "react";
import type { AiAdvice } from "./types";

type AiAdviceBlockProps = {
  advice: AiAdvice;
  onGenerateAdvice?: () => void;
  onRegenerateAdvice?: () => void;
  onPinAdvice?: () => void;
};

export function AiAdviceBlock({
  advice,
  onGenerateAdvice,
  onRegenerateAdvice,
  onPinAdvice,
}: AiAdviceBlockProps) {
  return (
    <div className="section-block">
      <h3 className="section-title">AIアドバイス</h3>

      <div className="ai-actions">
        <button className="action-btn" onClick={onGenerateAdvice}>
          アドバイスを生成
        </button>
        <button className="action-btn" onClick={onRegenerateAdvice}>
          再生成
        </button>
        <button className="action-btn" onClick={onPinAdvice}>
          {advice.pinned ? "固定解除" : "固定"}
        </button>
      </div>

      {advice.items.length === 0 ? (
        <div className="empty-state">
          アドバイスを生成するには上のボタンをクリックしてください
        </div>
      ) : (
        <ul className="ai-advice-list">
          {advice.items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}

      {advice.lastUpdated && (
        <div className="ai-timestamp">最終更新: {advice.lastUpdated}</div>
      )}
    </div>
  );
}
