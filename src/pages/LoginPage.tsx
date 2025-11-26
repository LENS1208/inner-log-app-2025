import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme.context';
import logoImg from '../assets/inner_logo_1126.png';

export default function LoginPage() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent, retryCount = 0) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      console.log('Attempting login with:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Login response:', { data, error });

      if (error) {
        console.error('Login error:', error);

        if (error.message.includes('Database error querying schema') && retryCount < 2) {
          console.log(`Retrying login (attempt ${retryCount + 1}/2)...`);
          setMessage(`接続エラーが発生しました。再試行中... (${retryCount + 1}/2)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return handleLogin(e, retryCount + 1);
        }

        throw error;
      }

      console.log('Login successful, redirecting...');
      window.location.hash = '#/dashboard';
    } catch (error: any) {
      console.error('Login exception:', error);

      let errorMsg = error.message || 'ログインに失敗しました';

      if (error.message?.includes('Database error querying schema')) {
        errorMsg = 'データベース接続エラーが発生しました。しばらく待ってから再度お試しください。';
      } else if (error.message?.includes('Invalid login credentials')) {
        errorMsg = 'メールアドレスまたはパスワードが正しくありません';
      }

      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };


  const handleResetPassword = async () => {
    if (!email) {
      setMessage('メールアドレスを入力してください');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });

      if (error) throw error;

      setMessage('パスワードリセットのメールを送信しました');
    } catch (error: any) {
      setMessage(error.message || 'メール送信に失敗しました');
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
        background: 'var(--bg)',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--surface)',
          borderRadius: 16,
          padding: '48px 40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid var(--line)',
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
              color: 'var(--ink)',
              marginBottom: 8,
            }}
          >
            ログイン
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)' }}>
            新規ユーザーですか？{' '}
            <button
              onClick={() => (window.location.hash = '#/signup')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              新規登録
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
            color: 'var(--button-secondary-text)',
            background: 'var(--button-secondary-bg)',
            border: '2px solid var(--button-secondary-border)',
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
            if (!loading) e.currentTarget.style.background = 'var(--button-secondary-hover)';
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.background = 'var(--button-secondary-bg)';
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
          Googleでログイン
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>または</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink)',
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
                border: '2px solid var(--input-border)',
                borderRadius: 12,
                background: 'var(--input-bg)',
                color: 'var(--input-text)',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--input-border-focus)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--input-border)';
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink)',
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
              title="8文字以上"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 16,
                border: '2px solid var(--input-border)',
                borderRadius: 12,
                background: 'var(--input-bg)',
                color: 'var(--input-text)',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--input-border-focus)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--input-border)';
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--ink)',
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  cursor: 'pointer',
                  accentColor: 'var(--accent)',
                }}
              />
              ログイン状態を保持
            </label>
            <button
              type="button"
              onClick={handleResetPassword}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              パスワードを忘れた方
            </button>
          </div>

          {message && (
            <div
              style={{
                padding: 12,
                marginBottom: 20,
                borderRadius: 8,
                fontSize: 14,
                background: message.includes('失敗') ? '#fed7d7' : '#c6f6d5',
                color: message.includes('失敗') ? '#742a2a' : '#22543d',
                border: `1px solid ${message.includes('失敗') ? '#fc8181' : '#9ae6b4'}`,
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
              color: loading ? 'var(--button-disabled-text)' : 'var(--button-primary-text)',
              background: loading ? 'var(--button-disabled-bg)' : 'var(--button-primary-bg)',
              border: 'none',
              borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              marginBottom: 16,
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--button-primary-hover)';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--button-primary-bg)';
            }}
          >
            {loading ? '処理中...' : 'ログイン'}
          </button>

          <button
            type="button"
            onClick={() => window.location.href = '#/dashboard'}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--button-secondary-text)',
              background: 'var(--button-secondary-bg)',
              border: '2px solid var(--button-secondary-border)',
              borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              marginBottom: 16,
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--button-secondary-hover)';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--button-secondary-bg)';
            }}
          >
            デモモードで試す
          </button>
        </form>

      </div>
    </div>
  );
}
