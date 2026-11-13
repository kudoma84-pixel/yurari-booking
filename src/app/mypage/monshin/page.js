import IntakeForm from "../../monshin/IntakeForm";

// Web予約済みの方の事前記入（A）。マイページのログイン（Cookie）を使う。
//   LINEユーザー：https://liff.line.me/<NEXT_PUBLIC_LIFF_ID_MYPAGE>/monshin
//   メールユーザー：https://yurari-booking.vercel.app/mypage/monshin
export const metadata = { title: "カウンセリングシート｜整体院 癒楽里", robots: { index: false, follow: false } };

export default function MypageMonshinPage() {
  return <IntakeForm entry="mypage" />;
}
