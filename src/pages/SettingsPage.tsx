import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme.context';
import '../styles/journal-notebook.css';
import { showToast } from '../lib/toast';
import { COACH_AVATAR_PRESETS } from '../lib/coachAvatars';

interface UserSettings {
  theme: string;
  timezone: string;
  time_format: string;
  date_format: string;
  currency: string;
  csv_format_preset: string;
  csv_column_mapping: Record<string, string>;
  ai_evaluation_frequency: string;
  ai_proposal_detail_level: string;
  ai_evaluation_enabled: boolean;
  ai_proposal_enabled: boolean;
  ai_advice_enabled: boolean;
  coach_avatar_preset: string;
}

interface ImportHistory {
  id: string;
  filename: string;
  row_count: number;
  created_at: string;
}

export default function SettingsPage() {
  console.log('🚀 SettingsPage component mounted');

  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [traderName, setTraderName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    timezone: 'Asia/Tokyo',
    time_format: '24h',
    date_format: 'yyyy-MM-dd',
    currency: 'JPY',
    csv_format_preset: 'MT4',
    csv_column_mapping: {},
    ai_evaluation_frequency: 'daily',
    ai_proposal_detail_level: 'standard',
    ai_evaluation_enabled: true,
    ai_proposal_enabled: true,
    ai_advice_enabled: true,
    coach_avatar_preset: 'teacher',
  });

  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadUserAndSettings = async () => {
      console.log('📥 loadUserAndSettings: 開始');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Loaded user:', user?.email);
      setUser(user);

      if (user) {
        setEmail(user.email || '');

        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('❌ user_settings取得エラー:', error);
          throw error;
        }

        if (data) {
          console.log('📝 データベースから設定を取得');
          setTraderName(data.trader_name || '');
          setAvatarPreview(data.avatar_url || '');

          setSettings(prev => ({
            ...prev,
            timezone: data.timezone || prev.timezone,
            time_format: data.time_format || prev.time_format,
            date_format: data.date_format || prev.date_format,
            currency: data.currency || prev.currency,
            csv_format_preset: data.csv_format_preset || prev.csv_format_preset,
            csv_column_mapping: data.csv_column_mapping || prev.csv_column_mapping,
            ai_evaluation_frequency: data.ai_evaluation_frequency || prev.ai_evaluation_frequency,
            ai_proposal_detail_level: data.ai_proposal_detail_level || prev.ai_proposal_detail_level,
            ai_evaluation_enabled: data.ai_evaluation_enabled ?? prev.ai_evaluation_enabled,
            ai_proposal_enabled: data.ai_proposal_enabled ?? prev.ai_proposal_enabled,
            ai_advice_enabled: data.ai_advice_enabled ?? prev.ai_advice_enabled,
            coach_avatar_preset: data.coach_avatar_preset || prev.coach_avatar_preset,
          }));
        }
      }
      console.log('✅ loadUserAndSettings: 完了');
    };

    const loadImportHistory = async () => {
      console.log('📥 loadImportHistory: 開始');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ loadImportHistory: ユーザーなし');
        return;
      }

      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ インポート履歴の読み込みエラー:', error);
        throw error;
      }

      if (data) {
        setImportHistory(data);
        console.log(`✅ loadImportHistory: ${data.length}件取得`);
      }
    };

    const init = async () => {
      console.log('🔄 SettingsPage: 初期化開始');
      if (!isMounted) return;

      try {
        setLoading(true);

        try {
          await loadUserAndSettings();
        } catch (err) {
          console.error('❌ loadUserAndSettings エラー:', err);
        }

        if (!isMounted) return;

        try {
          await loadImportHistory();
        } catch (err) {
          console.error('❌ loadImportHistory エラー:', err);
        }

        console.log('✅ SettingsPage: 初期化完了');
      } catch (err) {
        console.error('❌ SettingsPage 初期化エラー:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      console.log('🧹 SettingsPage: クリーンアップ');
      isMounted = false;
    };
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setSettings(prev => ({ ...prev, theme: newTheme }));
    setTheme(newTheme as 'light' | 'dark');
  };


  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('画像ファイルを選択してください', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('ファイルサイズは2MB以下にしてください', 'error');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatarToStorage = async () => {
    if (!user || !avatarFile) {
      console.log('⚠️ ユーザーまたはアバターファイルがありません');
      return null;
    }

    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      console.log('📤 Storageにアップロード開始:', { filePath, fileSize: avatarFile.size });

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Storageアップロードエラー:', uploadError);
        throw uploadError;
      }

      console.log('✅ Storageアップロード成功');

      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      console.log('✅ 公開URL取得:', publicUrl);
      return publicUrl;
    } catch (err) {
      console.error('❌ アップロードエラー:', err);
      throw err;
    }
  };

  const handleSaveProfile = async () => {
    console.log('🎯 handleSaveProfile が呼ばれました！');

    if (!user) {
      console.error('❌ ユーザーがログインしていません');
      showToast('ログインしてください', 'error');
      return;
    }

    console.log('💾 プロフィール保存開始:', { traderName, hasAvatarFile: !!avatarFile });
    setSaving(true);

    try {
      let avatarUrl = user.user_metadata?.avatar_url;

      if (avatarFile) {
        console.log('📤 アバター画像をアップロード中...');
        try {
          const uploadedUrl = await uploadAvatarToStorage();
          if (uploadedUrl) {
            avatarUrl = uploadedUrl;
            console.log('✅ アバター画像アップロード成功:', avatarUrl);
          }
        } catch (uploadErr) {
          console.error('⚠️ アバター画像アップロード失敗（処理は続行）:', uploadErr);
        }
      }

      console.log('🔄 user_settingsに保存中...', { trader_name: traderName, avatar_url: avatarUrl });

      // user_settingsテーブルに保存（updateUserの代わり）
      const { error: saveError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          trader_name: traderName,
          avatar_url: avatarUrl,
        }, {
          onConflict: 'user_id'
        });

      if (saveError) {
        console.error('❌ プロフィール保存エラー:', saveError);
        throw saveError;
      }

      console.log('✅ プロフィール保存完了');
      setAvatarFile(null);
      showToast('プロフィールを保存しました', 'success');

    } catch (err) {
      console.error('❌ プロフィール保存エラー:', err);
      showToast('保存に失敗しました', 'error');
    } finally {
      console.log('🔧 saving状態をfalseに設定');
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      setPasswordMessage('新しいパスワードが一致しません');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('パスワードは6文字以上で入力してください');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordMessage('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('パスワード変更エラー:', err);
      setPasswordMessage('変更に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    console.log('💾 すべての設定を保存開始:', { traderName, hasAvatarFile: !!avatarFile });
    setSaving(true);

    try{
      // 1. トレーダー名とアバターを保存
      let avatarUrl = user.user_metadata?.avatar_url;

      if (avatarFile) {
        console.log('📤 アバター画像をアップロード中...');
        try {
          const uploadedUrl = await uploadAvatarToStorage();
          if (uploadedUrl) {
            avatarUrl = uploadedUrl;
            console.log('✅ アバター画像アップロード成功:', avatarUrl);
          }
        } catch (uploadErr) {
          console.error('⚠️ アバター画像アップロード失敗（処理は続行）:', uploadErr);
        }
      }

      console.log('🔄 すべての設定をuser_settingsに保存中...');

      // user_settings テーブルを保存（プロフィール情報も含む）
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          trader_name: traderName,
          avatar_url: avatarUrl,
          theme: settings.theme,
          timezone: settings.timezone,
          time_format: settings.time_format,
          date_format: settings.date_format,
          currency: settings.currency,
          csv_format_preset: settings.csv_format_preset,
          csv_column_mapping: settings.csv_column_mapping,
          ai_evaluation_frequency: settings.ai_evaluation_frequency,
          ai_proposal_detail_level: settings.ai_proposal_detail_level,
          ai_evaluation_enabled: settings.ai_evaluation_enabled,
          ai_proposal_enabled: settings.ai_proposal_enabled,
          ai_advice_enabled: settings.ai_advice_enabled,
          coach_avatar_preset: settings.coach_avatar_preset,
        }, {
          onConflict: 'user_id'
        });

      if (settingsError) throw settingsError;

      console.log('✅ すべての設定を保存完了');
      setAvatarFile(null);
      showToast('すべての設定を保存しました', 'success');

    } catch (err) {
      console.error('❌ 設定保存エラー:', err);
      showToast('保存に失敗しました', 'error');
    } finally {
      console.log('🔧 saving状態をfalseに設定');
      setSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('インポート履歴をすべて削除しますか？')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('import_history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setImportHistory([]);
      showToast('インポート履歴をクリアしました', 'success');
    } catch (err) {
      console.error('履歴削除エラー:', err);
      showToast('履歴の削除に失敗しました', 'error');
    }
  };

  const handleDeleteAllTrades = async () => {
    if (!confirm('現在アップロード中の取引履歴をすべて削除します。この操作は元に戻せません。よろしいですか？')) {
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('ユーザー情報を取得できませんでした', 'error');
        return;
      }

      const { error: tradesError } = await supabase
        .from('trades')
        .delete()
        .eq('user_id', user.id)
        .is('dataset', null);

      if (tradesError) throw tradesError;

      const { error: summaryError } = await supabase
        .from('account_summary')
        .delete()
        .eq('user_id', user.id);

      if (summaryError) throw summaryError;

      const { error: transactionsError } = await supabase
        .from('account_transactions')
        .delete()
        .eq('user_id', user.id);

      if (transactionsError) console.error('取引明細の削除エラー:', transactionsError);

      const { error: notesError } = await supabase
        .from('trade_notes')
        .delete()
        .eq('user_id', user.id);

      if (notesError) console.error('取引メモの削除エラー:', notesError);

      const { error: dailyNotesError } = await supabase
        .from('daily_notes')
        .delete()
        .eq('user_id', user.id);

      if (dailyNotesError) console.error('デイリーノートの削除エラー:', dailyNotesError);

      localStorage.setItem('useDatabase', 'false');

      showToast('取引履歴を削除しました', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('取引履歴削除エラー:', err);
      showToast('削除に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <div>読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: 16 }}>
        <div className="panel" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 16, marginBottom: 12 }}>ログインが必要です</div>
          <div style={{ color: 'var(--muted)' }}>
            設定を変更するにはログインしてください
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ SettingsPage rendering - user:', user?.email, 'traderName:', traderName);

  return (
    <div style={{ width: '100%', padding: 16 }}>
      <div style={{ display: 'grid', gap: 16, maxWidth: 900 }}>

        <section className="panel">
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>アカウント・セキュリティ</div>
          </div>

          <div style={{ padding: 16, display: 'flex', gap: 24 }}>
            <div style={{ flex: '0 0 50%', display: 'grid', gap: 24 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>プロフィール情報</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--muted)' }}>
                      トレーダー名
                    </label>
                    <input
                      type="text"
                      value={traderName}
                      onChange={(e) => setTraderName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: 4,
                        fontSize: 14,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--muted)' }}>
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: 4,
                        fontSize: 14,
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--muted)',
                      }}
                    />
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        console.log('🔘 ボタンがクリックされました');
                        console.log('👤 Current user:', user?.email);
                        console.log('💾 Will call handleSaveProfile');
                        handleSaveProfile();
                      }}
                      disabled={saving}
                      style={{
                        padding: '8px 16px',
                        background: saving ? 'var(--muted)' : 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.6 : 1,
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 10,
                      }}
                    >
                      {saving ? '保存中...' : 'プロフィールを保存'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>パスワード変更</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--muted)' }}>
                      新しいパスワード
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: 4,
                        fontSize: 14,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--muted)' }}>
                      新しいパスワード（確認）
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: 4,
                        fontSize: 14,
                      }}
                    />
                  </div>
                  {passwordMessage && (
                    <div style={{ fontSize: 13, color: passwordMessage.includes('成功') ? 'var(--success)' : 'var(--error)' }}>
                      {passwordMessage}
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleChangePassword();
                      }}
                      disabled={saving || !newPassword || !confirmPassword}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 14,
                        cursor: 'pointer',
                        opacity: (!newPassword || !confirmPassword) ? 0.5 : 1,
                      }}
                    >
                      {saving ? '変更中...' : 'パスワードを変更'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 32 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>アイコン画像</div>
              <label
                htmlFor="avatar-upload"
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  border: '3px solid var(--line)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  marginBottom: 16,
                }}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--accent)',
                    color: '#ffffff',
                    fontSize: 48,
                    fontWeight: 600,
                  }}>
                    {email ? email.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: 'pointer',
                  marginBottom: 12,
                }}
              >
                画像を選択
              </label>
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', maxWidth: 200 }}>
                JPEG、PNG、GIF、WebP形式、2MB以下
              </div>
              {avatarFile && (
                <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8, textAlign: 'center', maxWidth: 200 }}>
                  ✓ 画像が選択されました。「プロフィールを保存」ボタンで確定してください。
                </div>
              )}
            </div>

          </div>
        </section>

        <section className="panel">
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>データソース設定</div>
          </div>

          <div style={{ padding: 16, display: 'grid', gap: 24 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>インポート履歴</div>
              {importHistory.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
                  履歴がありません
                </div>
              ) : (
                <>
                  <div style={{ border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>ファイル名</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>行数</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>日時</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importHistory.slice(0, 10).map((item) => (
                          <tr key={item.id} style={{ borderTop: '1px solid var(--line)' }}>
                            <td style={{ padding: '8px 12px', fontSize: 13 }}>{item.filename}</td>
                            <td style={{ padding: '8px 12px', fontSize: 13, textAlign: 'right' }}>{item.row_count}</td>
                            <td style={{ padding: '8px 12px', fontSize: 13 }}>
                              {new Date(item.created_at).toLocaleString('ja-JP')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleClearHistory}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'transparent',
                        color: 'var(--error)',
                        border: '1px solid var(--error)',
                        borderRadius: 4,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      履歴をクリア
                    </button>
                  </div>
                </>
              )}
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>取引データ管理</div>
              <button
                onClick={handleDeleteAllTrades}
                disabled={saving}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                  display: 'inline-block',
                }}
              >
                {saving ? '削除中...' : '現在アップロード中の取引履歴を削除'}
              </button>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
                データベースに保存されている取引履歴をすべて削除します。この操作は元に戻せません。
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>表示・言語設定</div>
          </div>

          <div style={{ padding: 16, display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--muted)' }}>
                  タイムゾーン
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--line)',
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                >
                  <option value="UTC">UTC</option>
                  <option value="Asia/Tokyo">JST (Asia/Tokyo)</option>
                  <option value="America/New_York">EST (America/New_York)</option>
                  <option value="Europe/London">GMT (Europe/London)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--muted)' }}>
                  日時フォーマット
                </label>
                <select
                  value={settings.time_format}
                  onChange={(e) => setSettings(prev => ({ ...prev, time_format: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--line)',
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                >
                  <option value="24h">24時間制</option>
                  <option value="12h">12時間制</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'var(--muted)' }}>
                  通貨表示
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--line)',
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                >
                  <option value="JPY">円 (JPY)</option>
                  <option value="USD">ドル (USD)</option>
                  <option value="EUR">ユーロ (EUR)</option>
                  <option value="GBP">ポンド (GBP)</option>
                </select>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>コーチアバター</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {COACH_AVATAR_PRESETS.map((preset) => (
                  <label
                    key={preset.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      border: settings.coach_avatar_preset === preset.id ? '2px solid var(--accent)' : '1px solid var(--line)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      backgroundColor: settings.coach_avatar_preset === preset.id ? 'var(--chip)' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="radio"
                      name="coach_avatar"
                      value={preset.id}
                      checked={settings.coach_avatar_preset === preset.id}
                      onChange={(e) => setSettings(prev => ({ ...prev, coach_avatar_preset: e.target.value }))}
                      style={{ width: 18, height: 18 }}
                    />
                    <img
                      src={preset.image}
                      alt={preset.name}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        backgroundColor: '#ffffff',
                        border: '2px solid var(--line)',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{preset.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{preset.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, padding: 12, backgroundColor: 'var(--bg-secondary)', borderRadius: 4 }}>
                プロファイルページのコーチング吹き出しに表示されるアバター画像を選択できます
              </div>
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '16px 0' }}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSaveSettings();
            }}
            disabled={saving}
            style={{
              padding: '12px 32px',
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {saving ? '保存中...' : 'すべての設定を保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
