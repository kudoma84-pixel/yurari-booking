// /first と同じ入口（初めての方）。LINEアプリへ引き渡すときの戻り先。
// /first から「LINEで登録する」を押すと https://liff.line.me/<LIFF ID>/first を開く。LINE は LIFF のエンドポイントURL
// （予約フォームは /src）の後ろにこのパスを足して開くため、LINEアプリ内ではここ（/src/first）に着く。
// /src（src/app/src/page.js）そのものの動きは変えない。
import BookingApp from "../page";

export default function FirstEntryViaLiffPage() {
  return <BookingApp entry="first" />;
}
