// /signup と同じ入口（登録とLINE連携だけ）。LINEアプリへ引き渡すときの戻り先。
// /signup から「LINEではじめる」を押すと https://liff.line.me/<LIFF ID>/signup を開く。LINE は LIFF のエンドポイントURL
// （予約フォームは /src）の後ろにこのパスを足して開くため、LINEアプリ内ではここ（/src/signup）に着く。
// /src（src/app/src/page.js）そのものの動きは変えない。
import BookingApp from "../page";

export default function SignupEntryViaLiffPage() {
  return <BookingApp entry="signup" />;
}
