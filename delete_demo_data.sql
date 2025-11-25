DELETE FROM trades WHERE user_id = 'cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2' AND dataset IN ('A', 'B', 'C');
DELETE FROM account_transactions WHERE user_id = 'cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2' AND dataset IN ('A', 'B', 'C');
DELETE FROM account_summary WHERE user_id = 'cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2' AND dataset IN ('A', 'B', 'C');