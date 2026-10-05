-- 来院日起点のフォロー配信（/api/followup）の送信記録。
-- 同じお客様に同じ種類のフォローを同じ来院日について二重に送らないためのテーブル。
-- このテーブルが無い間、/api/followup は送信せずに対象者の一覧だけを返す（fail-closed）。
CREATE TABLE IF NOT EXISTS followup_logs (
  id           bigserial PRIMARY KEY,
  customer_id  text        NOT NULL,
  kind         text        NOT NULL,  -- 'first_next_day' | 'day21' | 'day45'
  visit_date   date        NOT NULL,  -- 起点にした来院日
  channel      text,                  -- 'line' | 'email'
  sent_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, kind, visit_date)
);

-- サーバー（サービスロールキー）からのみ読み書きする。
ALTER TABLE followup_logs ENABLE ROW LEVEL SECURITY;
