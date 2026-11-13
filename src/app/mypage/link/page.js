"use client";
import { useEffect, useState } from "react";

// 受付の「LINE連携QR」から開くページ（LIFF：マイページの LIFF アプリの /link）。
// 1) LINEでログイン（友だち追加の案内も一緒に出る） 2) お名前を確認 3) 連携
const GREEN = "#3a5a3a";
const LINE_ADD_FRIEND_URL = "https://line.me/R/ti/p/@fdm5378y";

export default function LineLinkPage() {
  const [state, setState] = useState({ step: "loading" }); // loading | confirm | done | error
  const [busy, setBusy] = useState(false);
  const [ctx, setCtx] = useState(null); // { liff, token }

  const call = async (liff, token, confirm) => {
    const r = await fetch("/api/mypage/line-link-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, accessToken: liff.getAccessToken(), confirm }),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  };

  useEffect(() => {
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID_MYPAGE });
        const token = new URLSearchParams(window.location.search).get("t");
        if (!token) {
          setState({ step: "error", message: "QRコードを読み取り直してください。" });
          return;
        }
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }
        setCtx({ liff, token });
        const r = await call(liff, token, false);
        if (!r.ok) {
          setState({ step: "error", message: r.data?.error || "連携できませんでした。受付にお声がけください。" });
          return;
        }
        setState({ step: "confirm", name: r.data.name, already: r.data.already_linked });
      } catch (e) {
        console.error(e);
        setState({ step: "error", message: "LINEの読み込みに失敗しました。もう一度QRコードを読み取ってください。" });
      }
    })();
  }, []);

  const doLink = async () => {
    if (!ctx || busy) return;
    setBusy(true);
    try {
      const r = await call(ctx.liff, ctx.token, true);
      if (!r.ok) {
        setState({ step: "error", message: r.data?.error || "連携できませんでした。受付にお声がけください。" });
        return;
      }
      let friend = true;
      try {
        const f = await ctx.liff.getFriendship();
        friend = f?.friendFlag !== false;
      } catch { /* 確認できない場合は案内だけ出す */ }
      setState({ step: "done", name: r.data.name, friend });
    } finally {
      setBusy(false);
    }
  };

  const box = { maxWidth: 420, margin: "0 auto", background: "white", borderRadius: 16, padding: "24px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" };
  const btn = { display: "block", width: "100%", padding: "14px", borderRadius: 12, border: "none", background: GREEN, color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none", cursor: "pointer", marginTop: 16, boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#FBF6EE", padding: "40px 16px", fontFamily: "'Noto Sans JP', sans-serif" }}>
      <div style={{ textAlign: "center", fontSize: 18, fontWeight: 700, color: GREEN, marginBottom: 20 }}>整体院 癒楽里</div>
      <div style={box}>
        {state.step === "loading" && <div style={{ fontSize: 14, color: "#888" }}>確認しています…</div>}

        {state.step === "confirm" && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: GREEN, marginBottom: 12 }}>LINE連携</div>
            <div style={{ fontSize: 15, color: "#333", marginBottom: 8 }}>{state.name} 様</div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.8 }}>
              {state.already
                ? "すでにこのLINEと連携済みです。下のボタンでマイページにログインします。"
                : "このLINEアカウントに、ご予約のリマインドや来院後のご案内をお送りします。"}
            </div>
            <button onClick={doLink} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>
              {busy ? "連携しています…" : state.already ? "マイページへ" : "連携する"}
            </button>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 12 }}>お名前が違う場合は、連携せずに受付へお声がけください。</div>
          </>
        )}

        {state.step === "done" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: GREEN, marginBottom: 12 }}>LINE連携が完了しました</div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.8 }}>
              {state.name} 様、ありがとうございます。<br />ご予約の確認・変更は、トーク画面のメニュー「マイページ」からいつでもできます。
            </div>
            {!state.friend && (
              <>
                <div style={{ fontSize: 13, color: "#c0392b", marginTop: 16, lineHeight: 1.7 }}>
                  お知らせを受け取るため、癒楽里の公式LINEを友だち追加してください。
                </div>
                <a href={LINE_ADD_FRIEND_URL} style={{ ...btn, background: "#06C755" }}>友だち追加する</a>
              </>
            )}
            <a href="/mypage" style={{ ...btn, background: state.friend ? GREEN : "#888" }}>マイページを開く</a>
          </>
        )}

        {state.step === "error" && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#c0392b", marginBottom: 12 }}>連携できませんでした</div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.8 }}>{state.message}</div>
          </>
        )}
      </div>
    </div>
  );
}
