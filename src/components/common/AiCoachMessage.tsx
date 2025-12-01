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
        gap: 16,
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
          width: 160,
          height: 160,
          borderRadius: '50%',
          flexShrink: 0,
          objectFit: 'cover',
          objectPosition: 'center 30%',
        }}
      />

      {/* 吹き出しエリア */}
      <div
        className="coach-bubble"
        style={{
          flex: 1,
          background: 'transparent',
          borderRadius: 8,
          padding: 16,
          fontSize: compact ? 13 : 14,
          lineHeight: 1.6,
        }}
      >
        {/* 気づき */}
        <div className="coach-section" style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 18 }}>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>気づき：</span>
            <span style={{ color: 'var(--accent-2)' }}>{comment.insight}</span>
          </p>
        </div>

        {/* 注意点 */}
        <div className="coach-section" style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 18 }}>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>注意点：</span>
            <span style={{ color: '#F59E0B' }}>{comment.attention}</span>
          </p>
        </div>

        {/* 次の一手 */}
        <div className="coach-section">
          <p style={{ margin: 0, fontSize: 18 }}>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>次の一手：</span>
            <span style={{ color: '#10B981' }}>{comment.nextAction}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
