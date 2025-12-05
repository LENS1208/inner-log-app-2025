import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AdminUserRow, TimeCalibrationStatus } from '../types/admin.types';
import { summarizeTimeCalibrationStatus } from '../types/admin.types';

type UseAdminUsersResult = {
  users: AdminUserRow[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

export function useAdminUsers(): UseAdminUsersResult {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const { data: authData, error: authError } = await supabase
        .from('user_settings')
        .select('user_id, trader_name, language, data_source, default_dataset');

      if (authError) {
        console.error('Error fetching user settings:', authError);
      }

      const userIds = (authData || []).map(s => s.user_id);

      if (userIds.length === 0) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      const [
        { data: trades },
        { data: imports },
        accountsResult,
      ] = await Promise.all([
        supabase
          .from('trades')
          .select('user_id, close_time, profit')
          .in('user_id', userIds),

        supabase
          .from('import_history')
          .select('user_id, created_at')
          .in('user_id', userIds),

        supabase
          .from('trading_accounts')
          .select('user_id, time_calibration_status')
          .in('user_id', userIds)
          .then(result => result)
          .catch(() => ({ data: null, error: { message: 'trading_accounts table not found' } })),
      ]);

      const accounts = accountsResult.data;

      const settingsMap = new Map(
        (authData || []).map(s => [s.user_id, s])
      );

      const tradesMap = new Map<string, { count: number; lastAt: string | null; totalProfit: number }>();
      (trades || []).forEach(t => {
        const existing = tradesMap.get(t.user_id);
        if (!existing) {
          tradesMap.set(t.user_id, {
            count: 1,
            lastAt: t.close_time,
            totalProfit: t.profit || 0,
          });
        } else {
          existing.count++;
          existing.totalProfit += t.profit || 0;
          if (!existing.lastAt || (t.close_time && t.close_time > existing.lastAt)) {
            existing.lastAt = t.close_time;
          }
        }
      });

      const importsMap = new Map<string, string | null>();
      (imports || []).forEach(i => {
        const existing = importsMap.get(i.user_id);
        if (!existing || (i.created_at && i.created_at > existing)) {
          importsMap.set(i.user_id, i.created_at);
        }
      });

      const accountsMap = new Map<string, { count: number; statuses: TimeCalibrationStatus[] }>();
      (accounts || []).forEach(a => {
        const existing = accountsMap.get(a.user_id);
        if (!existing) {
          accountsMap.set(a.user_id, {
            count: 1,
            statuses: [a.time_calibration_status as TimeCalibrationStatus],
          });
        } else {
          existing.count++;
          existing.statuses.push(a.time_calibration_status as TimeCalibrationStatus);
        }
      });

      const adminUsers: AdminUserRow[] = userIds.map(userId => {
        const settings = settingsMap.get(userId);
        const tradesData = tradesMap.get(userId);
        const lastImportAt = importsMap.get(userId);
        const accountsData = accountsMap.get(userId);

        const accountsCount = accountsData?.count || 0;
        const statuses = accountsData?.statuses || [];

        return {
          userId,
          email: '',
          traderName: settings?.trader_name || null,
          createdAt: '',
          lastSignInAt: null,

          language: settings?.language || null,
          dataSource: settings?.data_source || null,
          defaultDataset: settings?.default_dataset || null,

          tradesCount: tradesData?.count || 0,
          lastTradeAt: tradesData?.lastAt || null,
          totalProfit: tradesData?.totalProfit || 0,

          lastImportAt: lastImportAt || null,
          accountsCount,

          timeCalibrationSummary: summarizeTimeCalibrationStatus(accountsCount, statuses),
        };
      });

      setUsers(adminUsers);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    isError,
    refetch: fetchUsers,
  };
}
