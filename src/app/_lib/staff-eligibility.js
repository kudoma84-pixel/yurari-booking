// メニューを担当できるスタッフかの判定（予約フォーム・管理画面・booking-create で共通）。
//   1. メニューに専任スタッフ（course_menus.exclusive_staff_id）があれば、そのスタッフだけ
//   2. なければ、担当カテゴリ（staff_members.categories）にメニューのカテゴリを含むスタッフだけ
// categories が空のスタッフは、専任メニュー以外では選べない。
// カテゴリ未設定のメニューは、画面の分類と同じく「整体」として扱う。
export function canStaffHandleCourse(staff, course) {
  if (!staff || !course) return false;
  if (course.exclusive_staff_id) return String(staff.id) === String(course.exclusive_staff_id);
  const categories = Array.isArray(staff.categories) ? staff.categories : [];
  return categories.includes(course.category || "整体");
}
