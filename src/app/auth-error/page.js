"use client";
import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

const STORES = [
  { name: "南浦和本院", tel: "048-762-8333" },
  { name: "戸田院", tel: "048-287-3318" },
];

const GREEN = "#2d6a4f";
const ORANGE = "#e07b39";
const CREAM = "#fdf8f0";
const DARK = "#1a1a1a";

// NextAuth のエラー画面（pages.error）。
// ※ループ防止のため、このページから自動で再ログインを開始しないこと。再試行は必ずボタン操作のみ。
export default function AuthErrorPage() {
  const [isResetting, setIsResetting] = useState(false);
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    // 原因調査用に記録。失敗しても画面表示には影響させない
    try {
      const errorCode = new URLSearchParams(window.location.search).get("error");
      fetch(`${SUPABASE_URL}/rest/v1/auth_error_logs`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ error_code: errorCode, user_agent: navigator.userAgent, referrer: document.referrer || null }),
      }).catch(e => console.error("[auth-error] 記録失敗", e));
    } catch (e) {
      console.error("[auth-error] 記録失敗", e);
    }
  }, []);

  const restart = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      // 保存済みのログイン情報を消してから最初の画面へ
      await signOut({ redirect: false });
    } catch (e) {
      console.error("[auth-error] signOut失敗", e);
    }
    window.location.href = "/src?openExternalBrowser=1";
  };

  return (
    <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box", fontFamily: "'Noto Sans JP', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, background: "white", borderRadius: 20, padding: "32px 24px", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: GREEN, marginBottom: 16 }}>ログインできませんでした</div>
        <div style={{ fontSize: 14, color: DARK, lineHeight: 1.8, marginBottom: 28 }}>
          お手数ですが、もう一度お試しください。<br />
          繰り返し表示される場合は、お電話でご連絡ください。
        </div>
        <button onClick={restart} disabled={isResetting} style={{ width: "100%", padding: "16px", borderRadius: 30, border: "none", background: ORANGE, color: "white", fontSize: 16, fontWeight: 700, cursor: isResetting ? "not-allowed" : "pointer", opacity: isResetting ? 0.6 : 1, marginBottom: 20 }}>
          {isResetting ? "準備中..." : "最初からやり直す"}
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {STORES.map(s => (
            <a key={s.tel} href={`tel:${s.tel.replace(/-/g, "")}`} style={{ display: "block", padding: "14px", borderRadius: 30, border: "2px solid " + GREEN, background: "white", color: GREEN, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              📞 電話をかける（{s.name}）
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
