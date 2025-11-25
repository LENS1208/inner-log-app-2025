/**
 * 統一された日付処理ユーティリティ
 *
 * このアプリケーションでは、すべての日付を JST（日本標準時）として扱います。
 * データベースには UTC として保存されていますが、表示時には JST に変換されます。
 */

/**
 * JST タイムスタンプ（ミリ秒）から YYYY-MM-DD 形式の文字列を取得
 * @param jstTimestamp JST のタイムスタンプ（ミリ秒）
 * @returns YYYY-MM-DD 形式の文字列
 */
export function formatDateFromJST(jstTimestamp: number): string {
  const date = new Date(jstTimestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD 形式の文字列から JST の開始時刻（00:00:00）のタイムスタンプを取得
 * @param dateStr YYYY-MM-DD 形式の文字列
 * @returns JST の開始時刻のタイムスタンプ（ミリ秒）
 */
export function getJSTStartOfDay(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return Date.UTC(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * YYYY-MM-DD 形式の文字列から JST の終了時刻（23:59:59.999）のタイムスタンプを取得
 * @param dateStr YYYY-MM-DD 形式の文字列
 * @returns JST の終了時刻のタイムスタンプ（ミリ秒）
 */
export function getJSTEndOfDay(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return Date.UTC(year, month - 1, day, 23, 59, 59, 999);
}

/**
 * UTC 文字列（ISO 8601形式）を JST タイムスタンプに変換
 * @param utcString UTC 文字列（例: "2025-11-05T12:00:00.000Z"）
 * @returns JST タイムスタンプ（ミリ秒）
 */
export function utcToJST(utcString: string): number {
  const utcTime = new Date(utcString).getTime();
  return utcTime + (9 * 60 * 60 * 1000); // UTC + 9時間
}

/**
 * JST タイムスタンプを UTC 文字列に変換
 * @param jstTimestamp JST タイムスタンプ（ミリ秒）
 * @returns UTC 文字列（ISO 8601形式）
 */
export function jstToUTC(jstTimestamp: number): string {
  const utcTime = jstTimestamp - (9 * 60 * 60 * 1000); // JST - 9時間
  return new Date(utcTime).toISOString();
}

/**
 * 現在の JST の日付を YYYY-MM-DD 形式で取得
 * @returns YYYY-MM-DD 形式の文字列
 */
export function getTodayJST(): string {
  const now = new Date();
  const jstNow = now.getTime() + (9 * 60 * 60 * 1000);
  return formatDateFromJST(jstNow);
}

/**
 * 2つの日付文字列を比較
 * @param date1 YYYY-MM-DD 形式の文字列
 * @param date2 YYYY-MM-DD 形式の文字列
 * @returns date1 < date2 なら負の値、date1 > date2 なら正の値、等しければ 0
 */
export function compareDates(date1: string, date2: string): number {
  return date1.localeCompare(date2);
}
