import IntakeForm from "./IntakeForm";

// 受付から開く問診票（B：初めての方 ／ C：登録済みで未記入の方）。/monshin?k=<受付トークン>[&kiosk=1]
export const metadata = { title: "カウンセリングシート｜整体院 癒楽里", robots: { index: false, follow: false } };

export default function MonshinPage() {
  return <IntakeForm entry="token" />;
}
