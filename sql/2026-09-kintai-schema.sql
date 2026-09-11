-- ============================================================
-- 有限会社エムオーエス / 勤怠管理 スキーマ
--
-- Supabase ダッシュボード → SQL Editor に貼り付けて実行します。
-- 上から順に実行してください（後半が前半のテーブルを参照します）。
-- 既存の予約システムのテーブルには一切変更を加えません。
--
-- 前提となる運用条件（2026-09 時点でのヒアリング結果）
--   ・4事業所（整体院2・介護施設2）、従業員18名
--   ・夜勤なし / 宿直なし / 変形労働時間制なし
--     → 深夜割増と清算期間の計算は不要。法定外残業25%と法定休日35%のみ。
--   ・有給は入社日基準で付与
--   ・打刻はLINE（店舗端末の時間変動QRを読む方式）
-- ============================================================


-- ============================================================
-- 【1】事業所マスタ
--
-- 予約システムの STORES（src/app/admin/page.js のハードコード配列）は
-- 整体2院ぶんしか無く、介護施設は登録されていません。
-- 予約側に影響を与えないよう、勤怠は独立した事業所マスタを持ちます。
-- ============================================================

CREATE TABLE IF NOT EXISTS work_sites (
  id          text PRIMARY KEY,               -- 'minamiurawa' / 'toda' / 'care1' / 'care2'
  name        text NOT NULL,
  site_type   text NOT NULL,                  -- 'seitai'（整体院）/ 'kaigo'（介護施設）
  -- 介護の常勤換算の分母。常勤者が勤務すべき1週間の時間数（例 40）。
  -- 就業規則上の所定労働時間を入れてください。整体院は NULL で構いません。
  fulltime_weekly_hours numeric,
  -- 法定休日の曜日（0=日 〜 6=土）。35%割増の判定に使います。
  legal_holiday_dow  int DEFAULT 0,
  sort_order  int  DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- 実際の事業所名に置き換えて実行してください。
INSERT INTO work_sites (id, name, site_type, fulltime_weekly_hours, sort_order) VALUES
  ('minamiurawa', '南浦和本院', 'seitai', NULL, 1),
  ('toda',        '戸田院',     'seitai', NULL, 2),
  ('care1',       '介護施設1',  'kaigo',  40,   3),
  ('care2',       '介護施設2',  'kaigo',  40,   4)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 【2】従業員マスタ
--
-- 既存の staff_members は「予約の担当者（施術者）」であって
-- 従業員台帳ではありません。介護職員・事務のパートは入っていないため、
-- 勤怠は全18名を載せる employees を新設します。
-- 施術者は staff_member_id で既存レコードと紐付けられます。
--
-- ここは労働者名簿（法定三帳簿のひとつ）の元データも兼ねます。
-- ============================================================

CREATE TABLE IF NOT EXISTS employees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_site_id  text NOT NULL REFERENCES work_sites(id),
  -- 施術者のみ。介護職員・事務は NULL。
  staff_member_id uuid REFERENCES staff_members(id),
  employee_code text UNIQUE,
  name          text NOT NULL,
  kana          text,
  -- LINE打刻の本人特定に使う。初回の紐付け作業で埋めます。
  line_user_id  text UNIQUE,
  -- 店舗端末から直接打刻する場合の暗証番号（LINEを使えない人の予備導線）
  pin           text,

  employment_type text NOT NULL DEFAULT 'fulltime',  -- 'fulltime' / 'parttime'

  -- ▼ 有給の付与判定に必須。入社日基準で付与するため正確に入れてください。
  hired_on      date NOT NULL,
  resigned_on   date,
  -- 週の所定労働日数。有給の比例付与（週4日以下かつ週30時間未満）の判定に使う。
  weekly_scheduled_days  int,
  -- 週の所定労働時間。常勤換算と比例付与の判定に使う。
  weekly_scheduled_hours numeric,
  -- 1日の所定労働時間（分）。遅刻・早退・法定内外の切り分けに使う。
  daily_scheduled_minutes int DEFAULT 480,

  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_site   ON employees (work_site_id, is_active);
CREATE INDEX IF NOT EXISTS idx_employees_line   ON employees (line_user_id);


-- ============================================================
-- 【3】打刻ログ
--
-- 賃金の根拠になるため「原則として追記のみ」にします。
-- 取り消しは行削除ではなく is_voided フラグで行い、記録を残します。
-- 修正は【4】の申請・承認を通します。
-- ============================================================

CREATE TABLE IF NOT EXISTS time_punches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  uuid NOT NULL REFERENCES employees(id),
  work_site_id text NOT NULL REFERENCES work_sites(id),
  punch_type   text NOT NULL,        -- 'clock_in' / 'clock_out' / 'break_start' / 'break_end'
  punched_at   timestamptz NOT NULL DEFAULT now(),
  -- JST基準の勤務日。UTC の日付だと 0:00〜8:59 が前日になるため必ず別に持つ。
  work_date    date NOT NULL,

  source       text NOT NULL,        -- 'line_qr' / 'kiosk_pin' / 'manual'
  -- 打刻に使われたQRの発行時刻（不正調査用）
  qr_issued_at timestamptz,
  -- 位置情報は補助。取得できなくても打刻は通す（許可しないと打刻できない事故を避ける）
  latitude     numeric,
  longitude    numeric,
  accuracy_m   numeric,
  user_agent   text,

  is_voided    boolean DEFAULT false,
  voided_by    text,
  voided_at    timestamptz,
  void_reason  text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_punches_emp_date  ON time_punches (employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_punches_site_date ON time_punches (work_site_id, work_date);


-- ============================================================
-- 【4】打刻の修正申請と承認
--
-- 打刻漏れ・押し間違いは必ずここを通します。
-- 「誰がいつ何を直したか」が残るので、労基署の調査でも説明できます。
-- ============================================================

CREATE TABLE IF NOT EXISTS punch_corrections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES employees(id),
  work_date     date NOT NULL,
  -- 既存打刻の修正・取消なら対象を指す。打刻漏れの追加なら NULL。
  target_punch_id uuid REFERENCES time_punches(id),
  action        text NOT NULL,       -- 'add' / 'edit' / 'void'
  punch_type    text,                -- add / edit のとき必須
  requested_at  timestamptz,         -- 修正後の打刻時刻
  reason        text NOT NULL,

  status        text NOT NULL DEFAULT 'pending',  -- 'pending' / 'approved' / 'rejected'
  reviewed_by   text,
  reviewed_at   timestamptz,
  review_note   text,
  -- 承認によって実際に作られた打刻
  applied_punch_id uuid REFERENCES time_punches(id),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corrections_status ON punch_corrections (status, work_date);
CREATE INDEX IF NOT EXISTS idx_corrections_emp    ON punch_corrections (employee_id, work_date);


-- ============================================================
-- 【5】日次集計
--
-- 打刻ログから毎日組み立てる確定値。給与計算はここだけを見ます。
-- 月次を締めたら is_locked を立てて、以後は修正申請を通さないと変えられません。
--
-- 夜勤・変形労働時間制が無いため、必要な区分は
--   法定内 / 法定外残業(25%) / 法定休日(35%) の3つだけです。
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_attendance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES employees(id),
  work_date     date NOT NULL,
  work_site_id  text REFERENCES work_sites(id),   -- 応援勤務はここが所属と変わる

  clock_in_at   timestamptz,
  clock_out_at  timestamptz,
  break_minutes int DEFAULT 0,
  work_minutes  int DEFAULT 0,        -- 実労働（休憩を除く）

  statutory_minutes int DEFAULT 0,    -- 法定内
  overtime_minutes  int DEFAULT 0,    -- 法定外残業（25%割増）
  holiday_minutes   int DEFAULT 0,    -- 法定休日労働（35%割増）
  late_minutes      int DEFAULT 0,
  early_leave_minutes int DEFAULT 0,

  -- 'work' / 'paid_leave' / 'paid_half' / 'absence' / 'legal_holiday' / 'holiday'
  day_type      text DEFAULT 'work',
  note          text,
  is_locked     boolean DEFAULT false,
  computed_at   timestamptz DEFAULT now(),
  UNIQUE (employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_emp_date ON daily_attendance (employee_id, work_date);


-- ============================================================
-- 【6】有給休暇
--
-- 付与（grants）と取得（requests）を分けて持ち、残日数は差引で出します。
-- 入社日基準の付与なので、employees.hired_on から自動計算できます。
-- 時効は付与から2年です。
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_grants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  uuid NOT NULL REFERENCES employees(id),
  granted_on   date NOT NULL,
  expires_on   date NOT NULL,       -- 付与日の2年後
  days         numeric NOT NULL,
  -- 'statutory'（法定付与）/ 'adjust'（手動調整。移行時の残数投入など）
  grant_type   text NOT NULL DEFAULT 'statutory',
  note         text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (employee_id, granted_on, grant_type)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  uuid NOT NULL REFERENCES employees(id),
  leave_date   date NOT NULL,
  -- 'paid_full'（全日）/ 'paid_half'（半日）/ 'special'（特別休暇）/ 'absence'（欠勤）
  leave_type   text NOT NULL,
  days         numeric NOT NULL DEFAULT 1,
  reason       text,
  status       text NOT NULL DEFAULT 'pending',  -- 'pending' / 'approved' / 'rejected'
  requested_by text,
  reviewed_by  text,
  reviewed_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_req_emp ON leave_requests (employee_id, leave_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_req_emp_date
  ON leave_requests (employee_id, leave_date) WHERE status <> 'rejected';


-- ============================================================
-- 【7】月次の締め
--
-- freee へ渡すCSVはこの締めを通ったデータから出します。
-- 締めたあとに数字が動かないようにするための記録です。
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance_closings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_site_id text NOT NULL REFERENCES work_sites(id),
  year_month   text NOT NULL,       -- 'YYYY-MM'
  closed_by    text,
  closed_at    timestamptz DEFAULT now(),
  reopened_by  text,
  reopened_at  timestamptz,
  UNIQUE (work_site_id, year_month)
);


-- ============================================================
-- 【8】確認用クエリ
--
-- 実行後、以下で8テーブルが出来ているか確認してください。
-- ============================================================

-- SELECT table_name FROM information_schema.tables
--  WHERE table_schema = 'public'
--    AND table_name IN ('work_sites','employees','time_punches','punch_corrections',
--                       'daily_attendance','leave_grants','leave_requests','attendance_closings')
--  ORDER BY table_name;
