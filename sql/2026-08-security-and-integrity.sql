-- ============================================================
-- 癒楽里 予約システム / データ整合性まわりの追加設定
--
-- Supabase ダッシュボード → SQL Editor に貼り付けて実行します。
-- 【1】と【2】は安全に実行できます。
-- 【3】は既存データに重複があると失敗するため、先に確認クエリを実行してください。
-- ============================================================


-- ============================================================
-- 【1】リマインドの重複配信を防ぐ（安全・すぐ実行可）
--
-- この2列を追加すると /api/remind が「送信済み」を記録し、
-- cronが二重に走っても顧客に同じリマインドが再送されなくなります。
-- 列が無い間はアプリ側が自動で従来動作にフォールバックします。
-- ============================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminded_today_at    timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminded_tomorrow_at timestamptz;


-- ============================================================
-- 【2】検索とリマインド抽出を速くする索引（安全・すぐ実行可）
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bookings_store_date
  ON bookings (store_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_date
  ON bookings (customer_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_customer
  ON push_subscriptions (customer_id);

-- 同じ端末が何度も購読登録されるのを防ぐ
CREATE UNIQUE INDEX IF NOT EXISTS uq_push_subscriptions_endpoint
  ON push_subscriptions (endpoint);


-- ============================================================
-- 【3】ダブルブッキングの根本対策（要事前確認）
--
-- 同じ院・同じスタッフ・同じ日時に、有効な予約が2件入らないようにします。
-- これを入れると、2人が同時に同じ枠を予約しても後の1件がDBに拒否されます。
--
-- ▼ まず既存の重複を確認してください。0件なら安全に実行できます。
--
--   SELECT store_id, staff_id, booking_date, booking_time, count(*)
--   FROM bookings
--   WHERE status <> 'cancelled'
--   GROUP BY 1,2,3,4
--   HAVING count(*) > 1
--   ORDER BY booking_date DESC;
--
-- ▼ 重複が出た場合は、どちらを残すか判断してから片方を
--    status='cancelled' にしてください（削除ではなくキャンセル推奨）。
-- ============================================================

-- CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_slot
--   ON bookings (store_id, staff_id, booking_date, booking_time)
--   WHERE status <> 'cancelled';


-- ============================================================
-- 【4】ポイント加算を安全にする（任意）
--
-- 現在は「現在値を読む→+1して書き戻す」方式のため、
-- 2台同時の受付や二重スキャンで加算が失われることがあります。
-- この関数を使うとDB側で原子的に加算できます。
--
-- 使い方（アプリ側）:
--   POST /rest/v1/rpc/increment_points  { "p_customer_id": "...", "p_delta": 1 }
-- ============================================================

CREATE OR REPLACE FUNCTION increment_points(p_customer_id uuid, p_delta int DEFAULT 1)
RETURNS int
LANGUAGE sql
AS $$
  UPDATE customers
  SET points = GREATEST(0, COALESCE(points, 0) + p_delta)
  WHERE id = p_customer_id
  RETURNING points;
$$;


-- ============================================================
-- 【5】RLS（行レベルセキュリティ）について
--
-- 現在はブラウザに公開キーが埋め込まれ、そこから全テーブルを
-- 直接読み書きしています。RLSが無効だと、キーを見た第三者が
-- 顧客情報を全件取得・改ざんできる状態です。
--
-- ダッシュボードの Authentication → Policies で各テーブルの
-- RLS が有効か確認してください。特に以下は最優先です:
--
--   customers / bookings / payments / payment_items /
--   payment_methods / gift_tickets / push_subscriptions / line_messages
--
-- ※ RLSを有効化すると、ポリシー次第でアプリが動かなくなる可能性が
--    あります。必ず営業時間外に、1テーブルずつ動作を確かめながら
--    進めてください。恒久対策は、これらの読み書きをサーバー側の
--    APIルート（サービスロールキー使用）に移すことです。
-- ============================================================
