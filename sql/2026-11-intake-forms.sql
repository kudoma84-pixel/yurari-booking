-- デジタル問診票（カウンセリングシート）
-- 健康情報を含むため、ブラウザの公開キー（anon）からは読めない・書けないようにする。
-- 読み書きはサーバーAPI（/api/monshin/*、/api/admin/intake*）がサービスロールキーで行う。
-- オーナーが Supabase の SQL エディタで実行する。何度実行しても同じ結果になる。

-- 顧客の性別（'男性' | '女性' | '回答しない' | null）
alter table public.customers add column if not exists gender text;

create table if not exists public.intake_forms (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  store_id text,                 -- 'minamiurawa' | 'toda'
  source text not null,          -- 'mypage' | 'counter_phone' | 'counter_tablet'
  consented_at timestamptz not null,
  answers jsonb not null,
  marks jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists intake_forms_customer_idx
  on public.intake_forms(customer_id, created_at desc);

-- RLSを有効にしてポリシーを作らない＝ anon / authenticated からは読めない・書けない。
-- サービスロールは RLS をバイパスする。
alter table public.intake_forms enable row level security;
revoke all on public.intake_forms from anon, authenticated;

-- 確認用（実行後、anon で読めないことを確かめる）
--   curl 'https://pbjekdzmvjqhqbbrzbfk.supabase.co/rest/v1/intake_forms?select=id&limit=1' \
--     -H 'apikey: <公開キー>' -H 'Authorization: Bearer <公開キー>'
--   → 401 / 403（permission denied）になること。空配列 [] が返る場合は RLS が効いているだけで
--     権限は残っているので、上の revoke が実行されたか確認する。
