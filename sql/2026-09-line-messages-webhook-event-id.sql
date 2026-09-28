-- LINE Webhook 再送による line_messages の重複保存を防ぐ
-- webhookEventId を保存し、同じイベントは UNIQUE 制約で弾く。
-- 既存行は NULL になるが、UNIQUE 制約は NULL 同士を重複扱いしないため影響なし。

ALTER TABLE line_messages
  ADD COLUMN IF NOT EXISTS webhook_event_id text;

ALTER TABLE line_messages
  ADD CONSTRAINT line_messages_webhook_event_id_key UNIQUE (webhook_event_id);
