import React, { useEffect, useState } from 'react';
import { useAICoaching } from '../lib/aiCoaching.context';

export function CoachingNotification() {
  const { currentTask } = useAICoaching();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (currentTask?.status === 'completed') {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    } else if (currentTask?.status === 'failed') {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [currentTask]);

  if (!show || !currentTask) return null;

  const isSuccess = currentTask.status === 'completed';
  const message = isSuccess
    ? `Dataset ${currentTask.dataset} の分析が完了しました`
    : `Dataset ${currentTask.dataset} の分析に失敗しました`;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 10000,
        padding: '12px 20px',
        background: isSuccess ? 'var(--success-bg)' : 'var(--loss-bg)',
        color: isSuccess ? 'var(--success)' : 'var(--loss)',
        border: `1px solid ${isSuccess ? 'var(--success)' : 'var(--loss)'}`,
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{isSuccess ? '✅' : '❌'}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
