import HomeScreenGuide from "../_lib/HomeScreenGuide";

export const metadata = { title: "アプリとして使う｜整体院 癒楽里" };

// メール・院内掲示から案内するための「ホーム画面に追加」手順ページ
export default function AppGuidePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FBF6EE", fontFamily: "'Noto Sans JP', sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", marginBottom: 6 }}>整体院 癒楽里</div>
        <div style={{ fontSize: 13, color: "#777", marginBottom: 18, lineHeight: 1.7 }}>
          ホーム画面に「癒楽里」のアイコンを置くと、予約やマイページがアプリのようにすぐ開けます。
        </div>
        <HomeScreenGuide />
        <div style={{ background: "white", borderRadius: 16, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: 13, color: "#555", lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, color: "#3a5a3a", marginBottom: 4 }}>はじめて開くとき</div>
          マイページのログインには、携帯番号の下4桁と誕生日（月日4桁）の合計8桁を入力します。
          <div style={{ marginTop: 12 }}>
            <a href="/src" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: 12, background: "#3a5a3a", color: "white", fontWeight: 700, textDecoration: "none" }}>予約ページを開く</a>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#999", marginTop: 16, lineHeight: 1.7, textAlign: "center" }}>
          わからないときはお気軽にお電話ください<br />
          南浦和院 <a href="tel:0487628333" style={{ color: "#3a5a3a" }}>048-762-8333</a>／戸田院 <a href="tel:0482873318" style={{ color: "#3a5a3a" }}>048-287-3318</a>
        </div>
      </div>
    </div>
  );
}
