import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';
import { getCoachAvatarById, COACH_AVATAR_PRESETS } from './coachAvatars';

interface CoachAvatarContextType {
  coachIcon: string;
  coachPreset: string;
  refreshCoachAvatar: () => Promise<void>;
}

const CoachAvatarContext = createContext<CoachAvatarContextType | undefined>(undefined);

export const useCoachAvatar = () => {
  const context = useContext(CoachAvatarContext);
  if (!context) {
    throw new Error('useCoachAvatar must be used within CoachAvatarProvider');
  }
  return context;
};

interface CoachAvatarProviderProps {
  children: ReactNode;
}

export const CoachAvatarProvider: React.FC<CoachAvatarProviderProps> = ({ children }) => {
  const [coachPreset, setCoachPreset] = useState<string>('teacher');
  const [coachIcon, setCoachIcon] = useState<string>(getCoachAvatarById('teacher'));
  const [userId, setUserId] = useState<string | null>(null);

  // すべてのアバター画像をプリロード（ビルド時に含めるため）
  useEffect(() => {
    COACH_AVATAR_PRESETS.forEach(preset => {
      const img = new Image();
      img.src = preset.image;
    });
  }, []);

  const loadCoachAvatar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCoachPreset('teacher');
        setCoachIcon(getCoachAvatarById('teacher'));
        setUserId(null);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('user_settings')
        .select('coach_avatar_preset')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to load coach avatar setting:', error);
        setCoachPreset('teacher');
        setCoachIcon(getCoachAvatarById('teacher'));
        return;
      }

      const presetId = data?.coach_avatar_preset || 'teacher';
      console.log('[CoachAvatarContext] Loaded preset:', presetId);
      setCoachPreset(presetId);
      setCoachIcon(getCoachAvatarById(presetId));
    } catch (err) {
      console.error('Error loading coach avatar:', err);
      setCoachPreset('teacher');
      setCoachIcon(getCoachAvatarById('teacher'));
    }
  };

  useEffect(() => {
    loadCoachAvatar();

    // リアルタイム更新のためのチャンネルを設定
    const channel = supabase
      .channel('coach_avatar_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
        },
        (payload) => {
          console.log('[CoachAvatarContext] Settings changed:', payload);
          // 現在のユーザーの変更のみを処理
          if (payload.new && 'coach_avatar_preset' in payload.new) {
            const newUserId = (payload.new as any).user_id;
            if (userId && newUserId === userId) {
              const presetId = (payload.new as any).coach_avatar_preset || 'teacher';
              console.log('[CoachAvatarContext] Updating to preset:', presetId);
              setCoachPreset(presetId);
              setCoachIcon(getCoachAvatarById(presetId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const value: CoachAvatarContextType = {
    coachIcon,
    coachPreset,
    refreshCoachAvatar: loadCoachAvatar,
  };

  return (
    <CoachAvatarContext.Provider value={value}>
      {children}
    </CoachAvatarContext.Provider>
  );
};
