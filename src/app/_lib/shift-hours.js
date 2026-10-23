// シフトの時間帯の判定（予約フォーム・管理画面・booking-create で共通）。
// end_time は「最終受付時刻」：start_time 〜 end_time（両端を含む）に始まる枠だけ予約できる。
// 例：10:00〜19:30 のシフトなら 19:30 開始の予約は受け付ける。13:30 までなら 14:00 以降は受け付けない。
// 時刻が空のシフトは時間では絞らない（時刻が入っていない古いデータで出勤日を休みにしないため）。
export const hhmm = (t) => (typeof t === "string" ? t.slice(0, 5) : "");

export function isWithinShift(shift, time) {
  if (!shift) return false;
  const t = hhmm(time);
  if (!t) return false;
  const start = hhmm(shift.start_time);
  const end = hhmm(shift.end_time);
  if (start && t < start) return false;
  if (end && t > end) return false;
  return true;
}
