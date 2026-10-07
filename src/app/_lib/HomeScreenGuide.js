"use client";
import { useEffect, useState } from "react";

const GREEN = "#3a5a3a";

// ホーム画面に追加（アプリ化）の案内。端末ごとに手順を出し分ける。
// すでにホーム画面のアプリから開いている場合は何も表示しない。
// LINEアプリ内ブラウザでは追加できないため、Safari／Chromeで開き直す案内を出す。
export default function HomeScreenGuide({ compact = false }) {
  const [env, setEnv] = useState(null);
  const [installEvent, setInstallEvent] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    const inLine = / Line\//i.test(ua);
    const iosNotSafari = ios && /CriOS|FxiOS|EdgiOS/i.test(ua);
    setEnv({ standalone, ios, android, inLine, iosNotSafari });
    const onPrompt = (e) => { e.preventDefault(); setInstallEvent(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!env || env.standalone) return null;

  const url = "https://yurari-booking.vercel.app/src";
  const box = { background: "#f0f8f4", borderRadius: 16, padding: compact ? "16px 18px" : "20px", marginBottom: 16, textAlign: "left" };
  const step = { fontSize: 13, color: "#555", lineHeight: 2 };

  let steps;
  if (env.inLine) {
    steps = (
      <>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>LINEの中の画面からは追加できません。</div>
        <div>① 右下（または右上）の「︙」から「ブラウザで開く」を選ぶ</div>
        <div>② 開いた画面で、下の手順に進む</div>
      </>
    );
  } else if (env.ios) {
    steps = (
      <>
        {env.iosNotSafari && <div style={{ fontSize: 12, color: "#c0392b", marginBottom: 6 }}>※ iPhoneはSafariで開いてください（{url}）</div>}
        <div>① 画面下の共有ボタン（□に↑）をタップ</div>
        <div>② 「ホーム画面に追加」を選ぶ</div>
        <div>③ 右上の「追加」をタップ</div>
        <div>④ ホーム画面の「癒楽里」アイコンから開き、マイページの「🔔 通知設定」でプッシュ通知を許可</div>
      </>
    );
  } else if (env.android) {
    steps = (
      <>
        <div>① Chromeの右上「︙」をタップ</div>
        <div>② 「ホーム画面に追加」または「アプリをインストール」を選ぶ</div>
        <div>③ ホーム画面の「癒楽里」アイコンから開き、マイページの「🔔 通知設定」でプッシュ通知を許可</div>
      </>
    );
  } else {
    steps = (
      <>
        <div>スマートフォンで次のページを開いてください。</div>
        <div style={{ fontWeight: 700, color: GREEN }}>{url}</div>
        <div>iPhone：Safariの共有ボタン（□に↑）→「ホーム画面に追加」</div>
        <div>Android：Chromeの「︙」→「ホーム画面に追加」</div>
      </>
    );
  }

  return (
    <div style={box}>
      <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 10 }}>📱 ホーム画面に追加してアプリとして使う</div>
      {installEvent && (
        <button onClick={async () => { installEvent.prompt(); await installEvent.userChoice.catch(() => {}); setInstallEvent(null); }}
          style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: GREEN, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
          ホーム画面に追加する
        </button>
      )}
      <div style={step}>{steps}</div>
      {!compact && (
        <div style={{ fontSize: 11, color: "#888", marginTop: 8, lineHeight: 1.6 }}>
          アイコンをタップするだけで、予約・マイページがすぐ開けます。プッシュ通知を許可すると、予約前日・当日のお知らせがアプリにも届きます。
        </div>
      )}
    </div>
  );
}
