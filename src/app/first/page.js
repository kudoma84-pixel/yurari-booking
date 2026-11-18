// 初めての方の入口（HP の /reserve/「初めての方」から来る）。
// 予約フォーム本体は /src と共通（src/app/src/page.js）。entry="first" で入口の違いだけを切り替える：
//   トップ画面を出さず ①ご連絡方法 から始める・①のあとに ②はじめにお読みください（同意）を出す・計測の route は "/first"
import BookingApp from "../src/page";

export default function FirstEntryPage() {
  return <BookingApp entry="first" />;
}
