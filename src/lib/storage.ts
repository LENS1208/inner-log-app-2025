const MEMO_KEY = "trade_memos_v1";
export type MemoMap = Record<string, string>;

export const loadMemoMap = (): MemoMap => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(MEMO_KEY) || "{}"); }
  catch { return {}; }
};

export const saveMemoMap = (m: MemoMap) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEMO_KEY, JSON.stringify(m));
};
