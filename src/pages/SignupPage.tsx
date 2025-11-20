import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme.context';
import { getAccentColor } from '../lib/chartColors';
import logoImgLight from '../assets/inner-log-logo-l.png';
import logoImgDark from '../assets/inner-log-logo-d.png';

export default function SignupPage() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const logoImg = theme === 'dark' ? logoImgLight : logoImgDark;

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'パスワードは8文字以上にしてください';
    }
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (password !== confirmPassword) {
      setMessage('パスワードが一致しません');
      setLoading(false);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setMessage(passwordError);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setMessage('アカウントを作成しました。ログインページに移動してください。');
      setTimeout(() => {
        window.location.hash = '#/login';
      }, 2000);
    } catch (error: any) {
      setMessage(error.message || 'アカウント作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/#/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      setMessage(error.message || 'Googleログインに失敗しました');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#fff',
          borderRadius: 16,
          padding: '48px 40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <button
            onClick={() => (window.location.hash = '#/')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              marginBottom: 24,
            }}
          >
            <img
              src={logoImg}
              alt="inner log"
              style={{ height: 48 }}
            />
          </button>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#1a202c',
              marginBottom: 8,
            }}
          >
            新規登録
          </h1>
          <p style={{ fontSize: 15, color: '#718096' }}>
            アカウントをお持ちですか？{' '}
            <button
              onClick={() => (window.location.hash = '#/login')}
              style={{
                background: 'none',
                border: 'none',
                color: getAccentColor(),
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              ログイン
            </button>
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: 15,
            fontWeight: 600,
            color: '#1a202c',
            background: '#fff',
            border: '2px solid #e2e8f0',
            borderRadius: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.background = '#fff';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
            />
          </svg>
          Googleで登録
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <span style={{ fontSize: 14, color: '#a0aec0' }}>または</span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: '#4a5568',
                marginBottom: 8,
              }}
            >
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 16,
                border: '2px solid #e2e8f0',
                borderRadius: 12,
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = getAccentColor();
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: '#4a5568',
                marginBottom: 8,
              }}
            >
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 16,
                border: '2px solid #e2e8f0',
                borderRadius: 12,
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = getAccentColor();
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
              }}
            />
            <p
              style={{
                fontSize: 12,
                color: '#718096',
                marginTop: 6,
              }}
            >
              8文字以上
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: '#4a5568',
                marginBottom: 8,
              }}
            >
              パスワード確認
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 16,
                border: '2px solid #e2e8f0',
                borderRadius: 12,
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = getAccentColor();
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
              }}
            />
          </div>

          {message && (
            <div
              style={{
                padding: 12,
                marginBottom: 20,
                borderRadius: 8,
                fontSize: 14,
                background: message.includes('失敗') || message.includes('一致') ? '#fed7d7' : '#c6f6d5',
                color: message.includes('失敗') || message.includes('一致') ? '#742a2a' : '#22543d',
                border: `1px solid ${message.includes('失敗') || message.includes('一致') ? '#fc8181' : '#9ae6b4'}`,
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              background: loading ? '#a0aec0' : getAccentColor(),
              border: 'none',
              borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#006ba3';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = getAccentColor();
            }}
          >
            {loading ? '処理中...' : '新規登録'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ fontSize: 12, color: '#a0aec0' }}>
            登録することで、利用規約とプライバシーポリシーに同意したものとみなされます
          </p>
        </div>
      </div>
    </div>
  );
}
