import React, { useState, useRef, useEffect } from 'react';
import { getGridLineColor, getAccentColor, getLossColor } from "../lib/chartColors";
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme.context';
import defaultAvatarLight from '../assets/inner_logo_1126.png';
import defaultAvatarDark from '../assets/inner_logo_w1126.png';

export default function UserMenu() {
  const { theme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('👤 UserMenu: Auth state changed:', event);
      if (session?.user) {
        // 常に最新のユーザー情報を取得（USER_UPDATEDでもアバターを更新）
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 UserMenu: Updated user:', user?.id, 'avatar:', user?.user_metadata?.avatar_url);
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Logout error:', error);
      } else {
        console.log('✅ Logged out successfully');
      }
      // 強制的にログインページへリダイレクト
      window.location.href = '#/login';
      // ページをリロードして状態をクリア
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err) {
      console.error('❌ Logout exception:', err);
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

  const defaultAvatar = theme === 'dark' ? defaultAvatarDark : defaultAvatarLight;
  const avatarUrl = user.user_metadata?.avatar_url || defaultAvatar;

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2px solid var(--line)',
          background: '#ffffff',
          cursor: 'pointer',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="ユーザーメニュー"
      >
        <img
          src={avatarUrl}
          alt="User avatar"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = theme === 'dark' ? defaultAvatarDark : defaultAvatarLight;
          }}
        />
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
              color: '#0f172a',
              borderBottom: '1px solid var(--line)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 132, 199, 0.08)';
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
              color: '#dc2626',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
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
