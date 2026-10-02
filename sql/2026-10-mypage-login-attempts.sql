-- マイページのログイン試行記録（総当たり対策：同一IPから10回/10分）
-- /api/mypage/login がサービスロールキーで読み書きする。ブラウザ（anon）からは一切触れない。
-- IPはそのまま保存せず、サーバー側で HMAC したハッシュのみを保存する。

CREATE TABLE IF NOT EXISTS mypage_login_attempts (
  id bigserial PRIMARY KEY,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mypage_login_attempts_ip_created_idx
  ON mypage_login_attempts (ip_hash, created_at);

-- RLSを有効にしてポリシーを作らない＝ anon / authenticated からは読めない・書けない。
-- サービスロールは RLS をバイパスする。
ALTER TABLE mypage_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON mypage_login_attempts FROM anon, authenticated;
