import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getCoachAvatarById } from '../../lib/coachAvatars';

interface CoachBubbleProps {
  message: string;
}

export function CoachBubble({ message }: CoachBubbleProps) {
  const [coachIcon, setCoachIcon] = useState<string>(getCoachAvatarById('teacher'));

  useEffect(() => {
    loadCoachAvatar();

    // リアルタイム更新のためのチャンネルを設定
    const channel = supabase
      .channel('user_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
        },
        (payload) => {
          console.log('Settings changed:', payload);
          if (payload.new && 'coach_avatar_preset' in payload.new) {
            const presetId = (payload.new as any).coach_avatar_preset || 'teacher';
            setCoachIcon(getCoachAvatarById(presetId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCoachAvatar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCoachIcon(getCoachAvatarById('teacher'));
        return;
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('coach_avatar_preset')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to load coach avatar setting:', error);
        setCoachIcon(getCoachAvatarById('teacher'));
        return;
      }

      const presetId = data?.coach_avatar_preset || 'teacher';
      console.log('Loaded coach avatar preset:', presetId);
      setCoachIcon(getCoachAvatarById(presetId));
    } catch (err) {
      console.error('Error loading coach avatar:', err);
      setCoachIcon(getCoachAvatarById('teacher'));
    }
  };

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
