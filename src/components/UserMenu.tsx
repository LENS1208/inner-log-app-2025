import React, { useState, useRef, useEffect } from 'react';
import { getGridLineColor, getAccentColor, getLossColor } from "../lib/chartColors";
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme.context';
import defaultAvatarLight from '../assets/inner_logo_1126.png';
import defaultAvatarDark from '../assets/inner_logo_w1126.png';

export default function UserMenu() {
  const { theme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // user_settingsからアバターURLを取得
        const { data } = await supabase
          .from('user_settings')
          .select('avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('👤 UserMenu: Auth state changed:', event);
      if (session?.user) {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // user_settingsからアバターURLを取得
          const { data } = await supabase
            .from('user_settings')
            .select('avatar_url')
            .eq('user_id', user.id)
            .maybeSingle();

          console.log('👤 UserMenu: Updated avatar from user_settings:', data?.avatar_url);
          setAvatarUrl(data?.avatar_url || '');
        }
      } else {
        setUser(null);
        setAvatarUrl('');
      }
    });

    // アバター更新イベントをリッスン
    const handleAvatarUpdate = (event: CustomEvent) => {
      console.log('👤 UserMenu: Avatar update event received:', event.detail.avatarUrl);
      setAvatarUrl(event.detail.avatarUrl || '');
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleLogout = async () => {
    console.log('🚪 Logout button clicked');
    setShowMenu(false);

    try {
      console.log('📤 Calling supabase.auth.signOut()...');
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Logout error:', error);
        throw error;
      }

      console.log('✅ Logged out successfully');

      // セッションをクリア
      localStorage.clear();
      sessionStorage.clear();

      // ログインページへ強制リダイレクト
      window.location.href = '#/login';
    } catch (err: any) {
      console.error('❌ Logout exception:', err);

      // エラーが発生しても、ローカルストレージをクリアしてログインページへ
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '#/login';
    }
  };

  const handleSettings = () => {
    setShowMenu(false);
    window.location.href = '#/settings';
  };

  if (!user) {
    return (
      <button
        onClick={() => window.location.href = '#/login'}
        style={{
          padding: '8px 16px',
          background: 'var(--accent)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'opacity 0.2s ease, transform 0.1s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9';
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        ログイン
      </button>
    );
  }

  // イニシャルを取得（メールアドレスの最初の文字）
  const getInitial = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  const hasAvatar = !!avatarUrl;

  console.log('🎨 UserMenu avatar:', {
    userId: user.id,
    email: user.email,
    avatarFromSettings: avatarUrl,
    hasAvatar,
    initial: getInitial()
  });

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2px solid var(--line)',
          background: hasAvatar ? '#ffffff' : getAccentColor(),
          cursor: 'pointer',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 600,
          color: '#ffffff',
        }}
        aria-label="ユーザーメニュー"
      >
        {hasAvatar ? (
          <img
            src={avatarUrl}
            alt="User avatar"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              // 画像読み込みエラー時は非表示にして、イニシャル表示にフォールバック
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span>{getInitial()}</span>
        )}
      </button>

      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            minWidth: 180,
            zIndex: 1000,
          }}
        >
          <button
            onClick={handleSettings}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 14,
              color: 'var(--ink)',
              borderBottom: '1px solid var(--line)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            設定
          </button>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 14,
              color: 'var(--loss)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
