#!/usr/bin/env node

/**
 * Auth RLS Status Checker
 *
 * このスクリプトはauth schemaのRLS状態をチェックします。
 * auth schemaでRLSが有効になっている場合、警告を出力します。
 *
 * Usage:
 *   node scripts/check-auth-rls.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('   VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を確認してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthRLS() {
  console.log('🔍 auth schemaのRLS状態をチェック中...\n');

  try {
    // auth schemaのRLS状態を確認
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE schemaname = 'auth'
        ORDER BY tablename
      `
    });

    if (error) {
      // rpc関数が存在しない場合は直接クエリを試す
      const { data: tables, error: queryError } = await supabase
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'auth')
        .order('tablename');

      if (queryError) {
        throw new Error(`クエリ失敗: ${queryError.message}`);
      }

      analyzeResults(tables);
      return;
    }

    analyzeResults(data);
  } catch (err) {
    console.error('❌ エラー:', err.message);
    console.error('\n⚠️  このスクリプトはSupabase Dashboardから直接実行してください:');
    console.error('   1. https://app.supabase.com にアクセス');
    console.error('   2. SQL Editor を開く');
    console.error('   3. 以下のクエリを実行:\n');
    console.error('   SELECT tablename, rowsecurity');
    console.error('   FROM pg_tables');
    console.error('   WHERE schemaname = \'auth\';');
    process.exit(1);
  }
}

function analyzeResults(tables) {
  if (!tables || tables.length === 0) {
    console.log('⚠️  auth schemaのテーブルが見つかりません');
    process.exit(1);
  }

  // RLSが有効なテーブルを検出
  const problematic = tables.filter(t => t.rowsecurity === true);

  if (problematic.length > 0) {
    console.error('🚨 危険: auth schemaでRLSが有効になっています!\n');
    console.error('以下のテーブルでRLSが有効です:');
    console.table(problematic.map(t => ({
      'テーブル名': t.tablename,
      'RLS状態': t.rowsecurity ? '有効 ⚠️' : '無効 ✅'
    })));

    console.error('\n⚠️  これはログインエラーの原因になります!');
    console.error('\n🔧 修正方法:');
    console.error('   CRITICAL_FIX_AUTH_RLS.md を参照してください\n');
    process.exit(1);
  }

  // すべて正常
  console.log('✅ auth schemaのRLS状態: 正常\n');
  console.log('チェックしたテーブル数:', tables.length);
  console.log('RLSが有効なテーブル:', problematic.length);
  console.log('\n全テーブルのRLSが正しく無効化されています。');
  process.exit(0);
}

// 実行
checkAuthRLS();
