import React, { useState, useMemo } from 'react';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { formatJstDateTime, formatJstDate } from '../lib/timezone';
import type { TimeCalibrationSummary } from '../types/admin.types';

type FilterState = {
  searchQuery: string;
  dataSource: 'all' | 'demo' | 'database';
  timeCalibration: 'all' | 'not-calibrated' | 'calibrated';
};

export default function AdminUsersPage() {
  const { users, isLoading, isError, refetch } = useAdminUsers();
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    dataSource: 'all',
    timeCalibration: 'all',
  });

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const query = filters.searchQuery.toLowerCase();
      const matchesSearch = !query ||
        user.userId.toLowerCase().includes(query) ||
        (user.traderName?.toLowerCase() || '').includes(query);

      const matchesDataSource = filters.dataSource === 'all' ||
        user.dataSource === filters.dataSource;

      const matchesTimeCalibration = filters.timeCalibration === 'all' ||
        (filters.timeCalibration === 'not-calibrated' && user.timeCalibrationSummary === 'not-set') ||
        (filters.timeCalibration === 'calibrated' && user.timeCalibrationSummary === 'calibrated');

      return matchesSearch && matchesDataSource && matchesTimeCalibration;
    });
  }, [users, filters]);

  const getTimeCalibrationBadge = (status: TimeCalibrationSummary) => {
    const styles = {
      'no-account': { bg: '#f3f4f6', text: '#6b7280', label: '口座なし' },
      'not-set': { bg: '#fee2e2', text: '#991b1b', label: '未校正' },
      'auto-suggested': { bg: '#fef3c7', text: '#92400e', label: '自動推定のみ' },
      'calibrated': { bg: '#d1fae5', text: '#065f46', label: '校正済み' },
    };

    const style = styles[status];

    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.text,
      }}>
        {style.label}
      </span>
    );
  };

  const formatProfit = (profit: number) => {
    const sign = profit >= 0 ? '+' : '';
    const color = profit >= 0 ? '#059669' : '#dc2626';
    return (
      <span style={{ color, fontWeight: 600 }}>
        {sign}{profit.toLocaleString('ja-JP')}円
      </span>
    );
  };

  const formatDataSource = (source: string | null, dataset: string | null) => {
    if (!source) return '-';
    return source === 'demo' ? `demo(${dataset || 'A'})` : 'database';
  };

  if (isLoading) {
    return (
      <div style={{
        padding: 'var(--space-4)',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}>
        <div style={{
          fontSize: 18,
          color: 'var(--muted)',
          textAlign: 'center',
          padding: 'var(--space-6)',
        }}>
          読み込み中...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{
        padding: 'var(--space-4)',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}>
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: 'var(--space-4)',
          textAlign: 'center',
        }}>
          <p style={{ color: '#991b1b', marginBottom: 'var(--space-3)' }}>
            データの取得に失敗しました。再読み込みしてください。
          </p>
          <button
            onClick={refetch}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: 'var(--space-4)',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
      }}>
        <div style={{
          marginBottom: 'var(--space-4)',
        }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: 'var(--ink)',
            marginBottom: 'var(--space-2)',
          }}>
            顧客一覧
          </h1>
          <p style={{
            fontSize: 14,
            color: 'var(--muted)',
          }}>
            InnerLog のユーザー利用状況とタイムゾーン校正状態を一覧できます
          </p>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}>
          <div style={{
            display: 'flex',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <input
              type="text"
              placeholder="ユーザーIDまたは名前で検索..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              style={{
                flex: '1 1 300px',
                padding: '8px 12px',
                border: '1px solid var(--line)',
                borderRadius: 6,
                fontSize: 14,
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
            />

            <select
              value={filters.dataSource}
              onChange={(e) => setFilters({ ...filters, dataSource: e.target.value as any })}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--line)',
                borderRadius: 6,
                fontSize: 14,
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
            >
              <option value="all">全データソース</option>
              <option value="demo">Demo</option>
              <option value="database">Database</option>
            </select>

            <select
              value={filters.timeCalibration}
              onChange={(e) => setFilters({ ...filters, timeCalibration: e.target.value as any })}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--line)',
                borderRadius: 6,
                fontSize: 14,
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
            >
              <option value="all">全校正ステータス</option>
              <option value="not-calibrated">未校正のみ</option>
              <option value="calibrated">校正済みのみ</option>
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 'var(--space-6)',
            textAlign: 'center',
          }}>
            <p style={{ color: 'var(--muted)', fontSize: 16, marginBottom: 'var(--space-2)' }}>
              {users.length === 0
                ? 'まだユーザーが登録されていません'
                : 'フィルタ条件に一致するユーザーが見つかりません'}
            </p>
            {users.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                テスト用にアカウントを1件作成すると、この画面に一覧表示されます。
              </p>
            )}
          </div>
        ) : (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}>
                <thead>
                  <tr style={{
                    background: 'var(--bg)',
                    borderBottom: '1px solid var(--line)',
                  }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>User</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>最終ログイン</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>登録日</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>DataSource</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)' }}>Trades</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>Last Trade</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)' }}>Total P/L</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>Last Import</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: 'var(--muted)' }}>Accounts</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)' }}>Time Calibration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.userId}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      onClick={() => {
                        window.location.hash = `/admin/users/${user.userId}`;
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                            {user.traderName || (user.email ? user.email.split('@')[0] : 'User')}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {user.email || `ID: ${user.userId.substring(0, 8)}...`}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text)' }}>
                        {formatJstDateTime(user.lastSignInAt)}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text)' }}>
                        {user.createdAt ? formatJstDate(user.createdAt) : '-'}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text)' }}>
                        {formatDataSource(user.dataSource, user.defaultDataset)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--ink)' }}>
                        {user.tradesCount.toLocaleString('ja-JP')}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text)' }}>
                        {formatJstDateTime(user.lastTradeAt)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {formatProfit(user.totalProfit)}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text)' }}>
                        {formatJstDateTime(user.lastImportAt)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text)' }}>
                        {user.accountsCount}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {getTimeCalibrationBadge(user.timeCalibrationSummary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{
          marginTop: 'var(--space-4)',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 13,
        }}>
          全 {filteredUsers.length} 件のユーザー
        </div>
      </div>
    </div>
  );
}
