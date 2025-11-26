/*
  # 以前インポートしたトレードにuser_idを設定

  user_id=NULL かつ dataset=NULL のトレードは、oo@oo.jpユーザーがインポートしたデータです。
  これらに正しいuser_idを設定します。
*/

-- user_id=NULL かつ dataset=NULL のトレードに user_id を設定
UPDATE trades
SET user_id = '84319e7e-9235-4b92-a5b2-ac1d55a3eb29'
WHERE user_id IS NULL
  AND dataset IS NULL;
