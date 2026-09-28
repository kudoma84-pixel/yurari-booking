-- LINEログイン（NextAuth）のエラー記録用テーブル
-- /auth-error ページ表示時にブラウザ（anon）から INSERT する。

CREATE TABLE IF NOT EXISTS auth_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code text,        -- NextAuthのerrorパラメータ
  user_agent text,        -- 端末の判別用
  referrer text,          -- どこから来たか
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auth_error_logs DISABLE ROW LEVEL SECURITY;

-- RLS無効のテーブルは Supabase の既定権限で anon が読み書き・削除まで可能になるため、
-- anon / authenticated は INSERT のみに絞る（閲覧は Supabase ダッシュボードから）
REVOKE ALL ON auth_error_logs FROM anon, authenticated;
GRANT INSERT ON auth_error_logs TO anon, authenticated;
