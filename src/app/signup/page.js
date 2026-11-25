// 登録とLINE連携だけで完了する入口（院内に掲示するQRから来る）。予約はしない。
// 予約フォーム本体は /src・/first と共通（src/app/src/page.js）。entry="signup" で入口の違いだけを切り替える：
//   ①ご登録方法（LINEではじめる／メールではじめる）→ ご来院は初めてですか →
//     初めて：②はじめにお読みください（同意）→ お客様情報 → カウンセリングシート → 完了
//     2回目以降：8桁コードで本人確認 → LINE連携 または メールアドレスの登録 → 完了
//   計測の route は "/signup"
import BookingApp from "../src/page";

export default function SignupEntryPage() {
  return <BookingApp entry="signup" />;
}
