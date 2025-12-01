import React from 'react';
import { useDataset } from '../../lib/dataset.context';
import teacherAvatar from '../../assets/Gemini_Generated_Image_bgepc8bgepc8bgep.jpg';
import beginnerAvatar from '../../assets/Gemini_Generated_Image_dd5s7mdd5s7mdd5s.jpg';
import advancedAvatar from '../../assets/Gemini_Generated_Image_lwh1iblwh1iblwh1.jpg';

export interface AiCoachComment {
  insight: string;
  attention: string;
  nextAction: string;
}

interface AiCoachMessageProps {
  comment: AiCoachComment;
  compact?: boolean;
}

const avatarMap: Record<string, string> = {
  teacher: teacherAvatar,
  beginner: beginnerAvatar,
  advanced: advancedAvatar,
};

export function AiCoachMessage({ comment, compact = false }: AiCoachMessageProps) {
  const { userSettings } = useDataset();
  const avatarType = (userSettings?.coach_avatar_preset as string) || 'teacher';
  const avatarSrc = avatarMap[avatarType] || teacherAvatar;

  if (!comment) {
    return null;
  }

  return (
    <div
      className="ai-coach"
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: compact ? 12 : 16,
        background: 'var(--surface)',
        borderRadius: 8,
        border: '1px solid var(--line)',
        marginTop: compact ? 12 : 16,
      }}
    >
      {/* アバターアイコン */}
      <img
        className="coach-icon"
        src={avatarSrc}
        alt="InnerCoach"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          flexShrink: 0,
          objectFit: 'cover',
        }}
      />

      {/* 吹き出しエリア */}
      <div
        className="coach-bubble"
        style={{
          flex: 1,
          background: '#F5F9FF',
          borderRadius: 8,
          padding: 12,
          fontSize: compact ? 12 : 13,
          lineHeight: 1.6,
        }}
      >
        {/* タイトル */}
        <div
          className="coach-title"
          style={{
            fontWeight: 700,
            fontSize: compact ? 13 : 14,
            marginBottom: 8,
            color: 'var(--ink)',
          }}
        >
          🤖 InnerCoach
        </div>

        {/* Insight */}
        <div className="coach-section" style={{ marginBottom: 8 }}>
          <h4
            style={{
              fontSize: compact ? 11 : 12,
              fontWeight: 700,
              color: 'var(--accent-2)',
              marginBottom: 4,
            }}
          >
            Insight
          </h4>
          <p style={{ margin: 0, color: 'var(--ink)' }}>{comment.insight}</p>
        </div>

        {/* Attention */}
        <div className="coach-section" style={{ marginBottom: 8 }}>
          <h4
            style={{
              fontSize: compact ? 11 : 12,
              fontWeight: 700,
              color: '#F59E0B',
              marginBottom: 4,
            }}
          >
            Attention
          </h4>
          <p style={{ margin: 0, color: 'var(--ink)' }}>{comment.attention}</p>
        </div>

        {/* Next Action */}
        <div className="coach-section">
          <h4
            style={{
              fontSize: compact ? 11 : 12,
              fontWeight: 700,
              color: '#10B981',
              marginBottom: 4,
            }}
          >
            Next Action
          </h4>
          <p style={{ margin: 0, color: 'var(--ink)' }}>{comment.nextAction}</p>
        </div>
      </div>
    </div>
  );
}
