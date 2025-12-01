import React from 'react';
import { useCoachAvatar } from '../../lib/coachAvatar.context';

interface CoachBubbleProps {
  message: string;
}

export function CoachBubble({ message }: CoachBubbleProps) {
  const { coachIcon } = useCoachAvatar();

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-start',
      marginBottom: '20px',
    }}>
      <div style={{
        flexShrink: 0,
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        border: '3px solid var(--line)',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img
          src={coachIcon}
          alt="コーチ"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
            transform: 'scale(1.4)',
          }}
        />
      </div>

      <div style={{
        position: 'relative',
        flex: 1,
        background: 'var(--surface)',
        border: '2px solid var(--line)',
        borderRadius: '16px',
        padding: '20px 24px',
        fontSize: '16px',
        lineHeight: 1.8,
        color: 'var(--ink)',
        fontWeight: 500,
      }}>
        <div style={{
          position: 'absolute',
          left: '-10px',
          top: '20px',
          width: 0,
          height: 0,
          borderTop: '10px solid transparent',
          borderBottom: '10px solid transparent',
          borderRight: '10px solid var(--line)',
        }} />
        <div style={{
          position: 'absolute',
          left: '-7px',
          top: '22px',
          width: 0,
          height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: '8px solid var(--surface)',
        }} />
        {message}
      </div>
    </div>
  );
}
