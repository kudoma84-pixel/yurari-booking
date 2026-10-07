"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import HomeScreenGuide from "../_lib/HomeScreenGuide";

// マイページのデータはすべて /api/mypage/* を経由する（Supabase を直接呼ばない）。
// 各APIはセッションCookieの顧客IDで本人のデータだけを扱う。
const api = async (path, init) => {
  const res = await fetch("/api/mypage/" + path, {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

const GREEN = "#2d6a4f";
const LIGHT_GREEN = "#52b788";
const ORANGE = "#e07b39";
const CREAM = "#fdf8f0";
const DARK = "#1a1a1a";
const LOGO_URL = "https://seitai-yurari.com/wp-content/uploads/2025/11/logo.webp";

const DAYS_JP = ["日","月","火","水","木","金","土"];

// 日本時間の「今日」をYYYY-MM-DDで返す。
// toISOString() はUTC基準のため 0:00〜8:59 に前日を返してしまう。日付判定は必ずこれを使う。
const jstToday = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

function MyPageInner() {
  const searchParams = useSearchParams();
  const isCheckin = searchParams?.get('checkin') === 'true';
  const [screen, setScreen] = useState("login");
  const [loginCode, setLoginCode] = useState("");
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("booking");
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelDone, setCancelDone] = useState(false);
  const [notices, setNotices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [checkinDone, setCheckinDone] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [lineChecking, setLineChecking] = useState(false);

  useEffect(() => {
    if (!customer) return;
    const interval = setInterval(() => {
      fetchBookings();
      fetchNotices();
    }, 5000);
    return () => clearInterval(interval);
  }, [customer]);
  useEffect(() => {
    // Service Worker登録のみ
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }

    // LIFFリダイレクト処理
    const params = new URLSearchParams(window.location.search);
    if (params.get('liff') === '1') {
      (async () => {
        try {
          const liff = await getLiff();
          if (liff.isLoggedIn()) {
            // LINEユーザーIDはサーバーがアクセストークンを検証して取得する。対象はログイン中の本人のみ。
            const r = await api("line-link", { method: "POST", body: JSON.stringify({ accessToken: liff.getAccessToken() }) });
            if (r.ok) {
              window.history.replaceState({}, '', '/mypage');
              if (await promptAddFriendIfNeeded(liff)) return;
              alert("LINEと連携しました！");
              window.location.reload();
            } else if (r.status !== 401) {
              alert(r.data?.error || "LINE連携に失敗しました");
            }
          }
        } catch (e) {
          console.error("LIFF error:", e);
        }
      })();
    }

    // 自動ログイン：サーバーが発行した HttpOnly Cookie のセッションで本人の情報を取得する。
    // セッションが無い・切れている場合（401）はログイン画面のまま。
    // LINEアプリ内で開かれた場合は、LINEアカウントで自動ログインを試す。
    // （連携済みのお客様だけ。未連携ならこれまでどおりコード入力の画面のまま）
    (async () => {
      const inLine = /\bLine\//i.test(navigator.userAgent) && params.get('liff') !== '1';
      // LINEアプリ内なら、セッション確認と並行して LIFF の読み込み・初期化を始めておく
      const liffReady = inLine
        ? getLiff()
        : null;
      liffReady?.catch(() => {});
      if (await loadMyCustomer().catch(() => false)) return;
      if (!inLine) return; // LINE連携の処理中（?liff=1）やブラウザでは何もしない
      setLineChecking(true);
      try {
        const liff = await liffReady;
        if (!liff.isLoggedIn()) return;
        const r = await api("line-login", { method: "POST", body: JSON.stringify({ accessToken: liff.getAccessToken() }) });
        if (r.ok) await loadMyCustomer();
      } catch (e) {
        console.error("LINE auto login error:", e);
      } finally {
        setLineChecking(false);
      }
    })();
  }, []);

  // /api/mypage/me からログイン中の本人の情報を取得してマイページを表示する。成功なら true。
  const loadMyCustomer = async () => {
    const r = await api("me");
    const c = r.data?.customer;
    if (!r.ok || !c?.id) return false;
    setCustomer(c);
    setProfileForm({
      name: c.name || "",
      kana: c.kana || "",
      tel: c.tel || "",
      email: c.email || "",
      address: c.address || "",
      zipcode: c.zipcode || "",
      preferred_staff_id: c.preferred_staff_id || "",
    });
    // 予約フォーム（/src）とプッシュ通知の登録は、まだ localStorage の顧客IDと有効期限でログイン状態を判定している。
    // 「新しい予約」で予約フォームへログイン済みのまま進めるよう、セッションで確認した本人のIDを渡す。
    // （マイページ自身のログイン判定には使わない。1-C で /src を Cookie 認証にしたら不要になる橋渡し）
    localStorage.setItem('yurari_customer_id', c.id);
    localStorage.setItem('yurari_login_expire', Date.now() + 7 * 24 * 60 * 60 * 1000);
    await fetchBookings();
    await fetchTickets();
    await fetchNotices();
    setScreen("mypage");
    return true;
  };

  const formatDate = (d) => {
    const dt = new Date(d);
    return dt.getFullYear() + "年" + (dt.getMonth()+1) + "月" + dt.getDate() + "日（" + DAYS_JP[dt.getDay()] + "）";
  };

  const handleLogin = async () => {
    const clean = loginCode.replace(/[^0-9]/g, "");
    if (clean.length !== 8) {
      setError("携帯下4桁＋誕生日4桁（合計8桁）を入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // 照合はサーバー側（/api/mypage/login）で行う。成功するとセッションCookieが発行される。
      const res = await fetch("/api/mypage/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "コードが正しくありません");
        return;
      }
      if (!(await loadMyCustomer())) setError("エラーが発生しました");
    } catch (e) {
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotices = async () => {
    const r = await api("notifications");
    if (!r.ok) return; // 一時的な失敗で表示を空にしない
    const list = Array.isArray(r.data.notifications) ? r.data.notifications : [];
    setNotices(list);
    const count = list.filter(n => !n.is_read).length;
    setUnreadCount(count);
    if ('setAppBadge' in navigator) {
      count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge();
    }
  };

  const markAllRead = async () => {
    const r = await api("notifications/read", { method: "POST", body: "{}" });
    if (!r.ok) return;
    setNotices(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    if ('setAppBadge' in navigator) navigator.clearAppBadge();
  };

  const fetchBookings = async () => {
    const r = await api("bookings");
    if (r.ok) setBookings(Array.isArray(r.data.bookings) ? r.data.bookings : []);
  };

  const fetchTickets = async () => {
    const r = await api("tickets");
    if (r.ok) setTickets(Array.isArray(r.data.tickets) ? r.data.tickets : []);
  };

  const groupTicketsByExpiry = (tickets) => {
    const groups = {};
    tickets.forEach(t => {
      const key = t.issued_at + "_" + t.expires_at + "_" + t.ticket_name;
      if (!groups[key]) groups[key] = { ...t, count: 0 };
      groups[key].count++;
    });
    return Object.values(groups).sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at));
  };

  const cancelBooking = async (bookingId) => {
    // 本人の予約かどうかの確認と、管理画面への通知はサーバー側で行う
    const r = await api("bookings/cancel", { method: "POST", body: JSON.stringify({ bookingId }) });
    if (!r.ok) {
      alert(r.data.error || "キャンセルに失敗しました");
      return;
    }
    await fetchBookings();
    setCancelTarget(null);
    setCancelDone(true);
    setTimeout(() => setCancelDone(false), 3000);
  };

  const saveProfile = async () => {
    const r = await api("profile", {
      method: "POST",
      body: JSON.stringify({
        name: profileForm.name,
        kana: profileForm.kana,
        tel: profileForm.tel,
        email: profileForm.email,
        address: profileForm.address,
        zipcode: profileForm.zipcode,
      }),
    });
    if (!r.ok) {
      alert(r.data.error || "保存に失敗しました");
      return;
    }
    setCustomer(r.data.customer || { ...customer, ...profileForm });
    setEditProfile(false);
  };

  const handleCheckin = async () => {
    if (!customer) return;
    setCheckinLoading(true);
    try {
      // 本人の今日の予約を探して受付済みにする処理はサーバー側で行う
      const r = await api("checkin", { method: "POST", body: "{}" });
      if (r.ok) {
        await fetchBookings();
        setCheckinDone(true);
        setTimeout(() => setCheckinDone(false), 5000);
      } else if (r.status === 404) {
        alert("本日の予約が見つかりません");
      } else {
        alert("エラーが発生しました");
      }
    } catch (e) {
      alert("エラーが発生しました");
    } finally {
      setCheckinLoading(false);
    }
  };

  const statusLabel = (s) => ({ confirmed: "確認済", received: "受付中", treatment_done: "施術終了", cancelled: "キャンセル", completed: "会計済", pending: "未確認" }[s] || s);
  const statusColor = (s) => ({ confirmed: GREEN, received: "#7090e0", treatment_done: ORANGE, cancelled: "#e07070", completed: "#aaa", pending: "#ccc" }[s] || "#aaa");

  const today = jstToday();
  const upcomingBookings = bookings.filter(b => b.booking_date >= today && b.status !== "cancelled" && b.status !== "completed");
  const pastBookings = bookings.filter(b => b.booking_date < today || b.status === "completed" || b.status === "cancelled");

  if (screen === "login") {
    return (
      <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Noto Sans JP', sans-serif" }}>
        <div style={{ background: "white", borderBottom: "3px solid " + GREEN, padding: "12px 20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <img src={LOGO_URL} alt="癒楽里" style={{ height: 44, width: "auto" }} />
          </div>
        </div>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 8 }}>MY PAGE</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: GREEN, marginBottom: 8 }}>マイページ</div>
            <div style={{ fontSize: 13, color: "#888" }}>{lineChecking ? "LINEアカウントを確認しています…" : "携帯下4桁＋誕生日でログインしてください"}</div>
            {isCheckin && (
              <div style={{ marginTop: 12, padding: "10px 16px", background: GREEN + "15", borderRadius: 12, fontSize: 13, color: GREEN, fontWeight: 700 }}>
                来院受付のためログインしてください
              </div>
            )}
          </div>
          {error && (
            <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#cc4444" }}>
              {error}
            </div>
          )}
          <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 8 }}>ログインコード（8桁）</label>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 10, lineHeight: 1.6 }}>
                携帯番号の下4桁 ＋ 誕生日（月日）4桁 = 合計8桁
              </div>
              <input
                type="tel"
                value={loginCode}
                onChange={e => setLoginCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="12340804"
                inputMode="numeric"
                maxLength={8}
                style={{ width: "100%", padding: "18px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 24, color: DARK, background: "white", boxSizing: "border-box", outline: "none", letterSpacing: "0.2em", textAlign: "center" }}
              />
            </div>
            <button onClick={handleLogin} disabled={loading}
              style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: loading ? "#aaa" : GREEN, color: "white", fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "確認中..." : "ログイン →"}
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <a href="/src" style={{ fontSize: 13, color: LIGHT_GREEN, textDecoration: "none" }}>← 予約ページへ戻る</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Noto Sans JP', sans-serif" }}>
      <div style={{ background: "white", borderBottom: "3px solid " + GREEN, padding: "12px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src={LOGO_URL} alt="癒楽里" style={{ height: 44, width: "auto" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 13, color: GREEN, fontWeight: 700 }}>{customer?.name} 様</div>
            <button onClick={() => { fetch("/api/mypage/logout", { method: "POST" }).catch(() => {}); localStorage.removeItem('yurari_customer_id'); localStorage.removeItem('yurari_login_expire'); setScreen("login"); setCustomer(null); setLoginCode(""); }}
              style={{ padding: "8px 16px", borderRadius: 20, border: "2px solid " + GREEN + "40", background: "white", color: GREEN, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ログアウト
            </button>
          </div>
        </div>
      </div>

      {checkinDone && (
        <div style={{ background: GREEN, color: "white", textAlign: "center", padding: "16px", fontSize: 15, fontWeight: 700 }}>
          ✓ 来院受付が完了しました！スタッフにお声がけください
        </div>
      )}

      {cancelDone && (
        <div style={{ background: GREEN, color: "white", textAlign: "center", padding: "12px", fontSize: 14, fontWeight: 700 }}>
          ✓ キャンセルが完了しました
        </div>
      )}

      {isCheckin && !checkinDone && (
        <div style={{ background: GREEN + "10", borderBottom: "2px solid " + GREEN + "30", padding: "16px 20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 8 }}>来院受付</div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>本日の予約を受付済みにします</div>
            <button onClick={handleCheckin} disabled={checkinLoading}
              style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: checkinLoading ? "#aaa" : GREEN, color: "white", fontSize: 16, fontWeight: 700, cursor: checkinLoading ? "not-allowed" : "pointer", boxShadow: "0 4px 16px rgba(45,106,79,0.3)" }}>
              {checkinLoading ? "受付中..." : "🏥 来院受付をする"}
            </button>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setCancelTarget(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 16 }}>予約をキャンセルしますか？</div>
            <div style={{ background: CREAM, borderRadius: 12, padding: "16px", marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 4 }}>{cancelTarget.course_name}</div>
              <div style={{ fontSize: 13, color: "#888" }}>{formatDate(cancelTarget.booking_date)} {cancelTarget.booking_time}〜</div>
              <div style={{ fontSize: 13, color: "#888" }}>{cancelTarget.staff_name}</div>
            </div>
            <div style={{ fontSize: 12, color: "#e07070", marginBottom: 20 }}>※ キャンセルは取り消せません</div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setCancelTarget(null)}
                style={{ flex: 1, padding: "14px", borderRadius: 14, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                戻る
              </button>
              <button onClick={() => cancelBooking(cancelTarget.id)}
                style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: "#e07070", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                キャンセルする
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px 100px" }}>
        <div style={{ padding: "24px 0 16px" }}>
          <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>MY PAGE</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>{customer?.name} 様のマイページ</div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <style>{`
            @media (max-width: 640px) {
              .tab-wrap { display: grid !important; grid-template-columns: repeat(3, 1fr); gap: 8px; }
              .tab-btn { justify-content: center; }
            }
          `}</style>
         <div className="tab-wrap" style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 8, paddingBottom: 4 }}>
          {[
            { id: "booking", label: "📅 予約" },
            { id: "notice", label: "🔔 通知", badge: unreadCount },
            { id: "ticket", label: "🎫 金券" },
            { id: "point", label: "🌟 ポイント" },
            { id: "mymessage", label: "💬 お問い合わせ" },
            { id: "notice_settings", label: "🔔 通知設定" },
                        { id: "profile", label: "⚙️ 設定" },
                      ].map(t => (
            <button key={t.id} onClick={() => {
              setActiveTab(t.id);
              if (t.id === "notice") markAllRead();
              if (t.id === "ticket" && customer) fetchTickets();
              if (t.id === "booking" && customer) fetchBookings();
              if (t.id === "qr") setQrLoaded(false);
            }}
              className="tab-btn" style={{ position: "relative", padding: "10px 20px", borderRadius: 20, border: "none", background: activeTab === t.id ? GREEN : "white", color: activeTab === t.id ? "white" : "#888", fontSize: 13, fontWeight: activeTab === t.id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "visible" }}>              {t.label}
              {t.badge > 0 && <span style={{ position: "absolute", top: -6, right: -16, background: "#e07070", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px white", zIndex: 1 }}>{t.badge}</span>}
            </button>
          ))}
          </div>
        </div>

                {activeTab === "booking" && (
          <div>
            {upcomingBookings.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 12 }}>📌 次回の予約</div>
                {upcomingBookings.map(b => (
                  <div key={b.id} style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "2px solid " + GREEN + "30", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ fontSize: 13, background: GREEN + "15", color: GREEN, borderRadius: 20, padding: "4px 12px", fontWeight: 700 }}>{statusLabel(b.status)}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{b.booking_number}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: GREEN, marginBottom: 4 }}>{b.course_name}</div>
                    <div style={{ fontSize: 14, color: DARK, marginBottom: 2 }}>📅 {formatDate(b.booking_date)} {b.booking_time}〜</div>
                    <div style={{ fontSize: 13, color: "#888", marginBottom: 2 }}>🏥 {b.store_id === "toda" ? "戸田院" : "南浦和本院"}</div>
                    <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>👤 {b.staff_name}</div>
                    {b.status !== "cancelled" && b.status !== "completed" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <a href={"/src?change=" + b.id}
                          style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: GREEN, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none" }}>
                          予約を変更する
                        </a>
                        <button onClick={() => setCancelTarget(b)}
                          style={{ flex: 1, padding: "12px", borderRadius: 12, border: "2px solid #e07070", background: "white", color: "#e07070", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          キャンセル
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {upcomingBookings.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 20px", background: "white", borderRadius: 16, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 14, color: "#aaa", marginBottom: 16 }}>予約中の予約がありません</div>
                <a href="/src" style={{ display: "inline-block", padding: "12px 24px", borderRadius: 20, background: GREEN, color: "white", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>予約する →</a>
              </div>
            )}

            {pastBookings.length > 0 && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#888", marginBottom: 12 }}>来院履歴</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pastBookings.map(b => (
                    <div key={b.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{b.course_name}</div>
                        <div style={{ fontSize: 11, background: statusColor(b.status), color: "white", borderRadius: 20, padding: "3px 10px" }}>{statusLabel(b.status)}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "#888" }}>📅 {formatDate(b.booking_date)} {b.booking_time}〜</div>
                      <div style={{ fontSize: 12, color: "#888" }}>👤 {b.staff_name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "notice" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 16 }}>🔔 お知らせ</div>
            {notices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", background: "white", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
                <div style={{ fontSize: 14, color: "#aaa" }}>お知らせはありません</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {notices.map(n => (
                  <div key={n.id} style={{ background: n.is_read ? "white" : "#f0f8f4", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: n.is_read ? "1px solid #f0ebe4" : "2px solid " + GREEN + "30" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>{n.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN }} />}
                        <div style={{ fontSize: 11, color: "#aaa" }}>{new Date(n.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: DARK, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{n.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "ticket" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>🎫 保有中の金券</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: ORANGE }}>{tickets.length}枚</div>
            </div>
            {tickets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", background: "white", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div>
                <div style={{ fontSize: 14, color: "#aaa" }}>保有中の金券はありません</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {groupTicketsByExpiry(tickets).map((g, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "2px solid " + ORANGE + "30" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{g.ticket_name}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>期限 {g.expires_at}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <div style={{ fontSize: 36, fontWeight: 700, color: ORANGE }}>{g.count}</div>
                      <div style={{ fontSize: 16, color: "#888" }}>枚</div>
                      <div style={{ fontSize: 13, color: "#aaa" }}>（¥{g.face_value ? g.face_value.toLocaleString() : "0"}券 × {g.count}枚）</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>入手日: {g.issued_at}</div>
                    <div style={{ fontSize: 11, color: g.ticket_type === 'present' ? ORANGE : "#aaa", marginTop: 2 }}>{g.ticket_type === 'present' ? '🎁 プレゼント券' : '🎫 購入券'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "notice_settings" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 16 }}>🔔 通知設定</div>

            {/* プッシュ通知：LINE連携済みの方は通知がLINEに届くため案内しない（通知の二重化を防ぐ）。
                LINEアプリ内ブラウザもプッシュ通知に対応できないため出さない */}
            {customer?.line_user_id ? (
              <div style={{ background: "#f0f8f4", borderRadius: 16, padding: "16px 20px", marginBottom: 16, fontSize: 13, color: GREEN, fontWeight: 700, lineHeight: 1.7 }}>
                💚 予約の確認やお知らせはLINEに届きます
              </div>
            ) : !(typeof navigator !== "undefined" && / Line\//i.test(navigator.userAgent)) && (
            <>
            <HomeScreenGuide compact />
            <div style={{ background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a", marginBottom: 8 }}>アプリへのプッシュ通知</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>予約リマインドをアプリに通知します</div>
              <button onClick={async () => {
                if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                  alert("このブラウザはプッシュ通知に対応していません\nホーム画面に追加したアプリから開いてください");
                  return;
                }
                const reg = await navigator.serviceWorker.ready;
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                  alert("通知が許可されませんでした\niOSの設定から通知を許可してください");
                  return;
                }
                try {
                  const vapidKey = "BKG4uyATw44AqA2jl5olVRr5pqPmnIb-W7jSRCtdfCZ4_K5X3T2AOVm8_uuTrBZgEgIEV2o7GVReueHzNazoDas";
                  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey });
                  const stored = localStorage.getItem('yurari_customer_id');
                  await fetch('/api/push-subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscription: sub, customer_id: stored }),
                  });
                  alert("プッシュ通知を許可しました！");
                } catch (e) {
                  alert("登録に失敗しました: " + e.message);
                }
              }} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: GREEN, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                🔔 プッシュ通知を許可する
              </button>
            </div>
            </>
            )}

            {/* 通知方法 */}
            <div style={{ background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>リマインドの通知方法</div>
              {["line", "email", "none"].map(method => (
                <button key={method} onClick={async () => {
                  // LINE通知を選択した場合、line_user_idがなければLINEログインへ
                  if (method === "line" && !customer.line_user_id) {
                    try {
                      const liff = await getLiff();
                      if (!liff.isLoggedIn()) {
                        liff.login({ redirectUri: "https://yurari-booking.vercel.app/mypage?liff=1" });
                        return;
                      }
                      // LINEユーザーIDはサーバーがアクセストークンを検証して取得する
                      const r = await api("line-link", { method: "POST", body: JSON.stringify({ accessToken: liff.getAccessToken() }) });
                      if (!r.ok) {
                        alert(r.data?.error || "LINE連携に失敗しました");
                        return;
                      }
                      setCustomer({ ...customer, line_user_id: r.data.line_user_id, notification_method: "line" });
                      if (await promptAddFriendIfNeeded(liff)) return;
                      alert("LINEと連携しました！");
                      return;
                    } catch (e) {
                      alert("LINEログインに失敗しました: " + e.message);
                      return;
                    }
                  }
                  const r = await api("notification-method", { method: "POST", body: JSON.stringify({ method }) });
                  if (!r.ok) {
                    alert(r.data.error || "保存に失敗しました");
                    return;
                  }
                  setCustomer({ ...customer, notification_method: method });
                }} style={{ display: "block", width: "100%", padding: "12px 16px", borderRadius: 12, border: `2px solid ${customer?.notification_method === method ? GREEN : "#e8ddd0"}`, background: customer?.notification_method === method ? "#eaf5ec" : "white", color: customer?.notification_method === method ? GREEN : "#888", fontSize: 14, fontWeight: customer?.notification_method === method ? 700 : 400, cursor: "pointer", marginBottom: 8, textAlign: "left" }}>
                  {method === "line" ? "📱 LINE通知" : method === "email" ? "📧 メール通知" : "🔕 通知なし"}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "mymessage" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 12 }}>💬 お問い合わせ</div>
            {customer?.line_user_id ? (
              <div style={{ background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 16 }}>
                  ご質問・ご相談は、癒楽里の公式LINEのトークでお気軽にお送りください。スタッフが順次お返事します。
                </div>
                <a href={LINE_TALK_URL} style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 12, background: "#06C755", color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                  LINEで問い合わせる
                </a>
                <div style={{ fontSize: 12, color: "#999", marginTop: 12, lineHeight: 1.6 }}>
                  お急ぎの場合はお電話でもどうぞ。南浦和院 <a href="tel:0487628333" style={{ color: GREEN }}>048-762-8333</a>／戸田院 <a href="tel:0482873318" style={{ color: GREEN }}>048-287-3318</a>
                </div>
              </div>
            ) : (
              <div style={{ background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 16 }}>
                  ご質問・ご相談は、お電話でお気軽にお問い合わせください。
                </div>
                <a href="tel:0487628333" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 12, background: GREEN, color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none", marginBottom: 10 }}>
                  📞 南浦和院に電話する（048-762-8333）
                </a>
                <a href="tel:0482873318" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 12, background: "#E8742A", color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                  📞 戸田院に電話する（048-287-3318）
                </a>
                <div style={{ fontSize: 12, color: "#999", marginTop: 16, lineHeight: 1.6 }}>
                  LINEでのやり取りをご希望の方は、公式LINEを友だち追加したうえで、「🔔 通知設定」タブの「リマインドの通知方法」で「LINE通知」を選ぶとLINEと連携できます。
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "point" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 16 }}>🌟 ポイント</div>
            <div style={{ background: "white", borderRadius: 20, padding: "32px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>現在のポイント</div>
              <div style={{ fontSize: 64, fontWeight: 700, color: GREEN, lineHeight: 1 }}>{customer?.points || 0}</div>
              <div style={{ fontSize: 16, color: "#888", marginTop: 4 }}>P</div>
              <div style={{ marginTop: 24, background: "#f9f6f2", borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>次の1000円券まで</div>
                <div style={{ background: "#e8e8e8", borderRadius: 20, height: 12, overflow: "hidden" }}>
                  <div style={{ background: GREEN, height: "100%", borderRadius: 20, width: `${((customer?.points || 0) % 20) / 20 * 100}%`, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 12, color: GREEN, fontWeight: 700, marginTop: 6 }}>{(customer?.points || 0) % 20} / 20P</div>
              </div>
            </div>
            <div style={{ background: "white", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.8 }}>
                <div>✅ ご来院1回 = 1ポイント加算</div>
                <div>🎁 20ポイントで1,000円金券プレゼント</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>※ QRチェックイン時に自動加算されます</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>⚙️ 個人情報</div>
              {!editProfile && (
                <button onClick={() => setEditProfile(true)}
                  style={{ padding: "8px 20px", borderRadius: 20, border: "2px solid " + GREEN, background: "white", color: GREEN, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  編集
                </button>
              )}
            </div>
            {!editProfile ? (
              <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                {[
                  { label: "お名前", value: customer?.name },
                  { label: "フリガナ", value: customer?.kana },
                  { label: "携帯番号", value: customer?.tel },
                  { label: "メール", value: customer?.email },
                  { label: "郵便番号", value: customer?.zipcode },
                  { label: "住所", value: customer?.address },
                  { label: "通知方法", value: customer?.notification_method === "line" ? "LINE" : customer?.notification_method === "email" ? "メール" : "-" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", padding: "12px 0", borderBottom: i < 6 ? "1px solid #f0ebe4" : "none" }}>
                    <div style={{ fontSize: 12, color: "#888", fontWeight: 700, width: 90, flexShrink: 0 }}>{row.label}</div>
                    <div style={{ fontSize: 14, color: DARK }}>{row.value || "-"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { label: "お名前", key: "name", placeholder: "山田 花子" },
                  { label: "フリガナ", key: "kana", placeholder: "ヤマダ ハナコ" },
                  { label: "携帯番号", key: "tel", placeholder: "090-0000-0000", type: "tel" },
                  { label: "メールアドレス", key: "email", placeholder: "example@email.com", type: "email" },
                  { label: "郵便番号", key: "zipcode", placeholder: "1234567" },
                  { label: "住所", key: "address", placeholder: "さいたま市南区..." },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>{f.label}</label>
                    <input type={f.type || "text"} value={profileForm[f.key] || ""} onChange={e => setProfileForm({ ...profileForm, [f.key]: e.target.value })} placeholder={f.placeholder}
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }} />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button onClick={() => setEditProfile(false)}
                    style={{ flex: 1, padding: "14px", borderRadius: 14, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    キャンセル
                  </button>
                  <button onClick={saveProfile}
                    style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: GREEN, color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                    保存する
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderTop: "3px solid " + GREEN + "20", padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <a href="/src" style={{ display: "inline-block", padding: "12px 32px", borderRadius: 25, background: ORANGE, color: "white", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            ＋ 新しい予約をする
          </a>
        </div>
      </div>
    </div>
  );
}

const LINE_TALK_URL = "https://line.me/R/oaMessage/@fdm5378y/";
const LINE_ADD_FRIEND_URL = "https://line.me/R/ti/p/@fdm5378y";

// LIFF の初期化は1回だけにする（自動ログインと「LINE通知」ボタンの両方から呼ばれるため）
let liffPromise = null;
function getLiff() {
  if (!liffPromise) {
    liffPromise = import('@line/liff').then(async (m) => {
      const liff = m.default;
      await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID_MYPAGE });
      return liff;
    });
    liffPromise.catch(() => { liffPromise = null; });
  }
  return liffPromise;
}

// 連携後、公式LINEを友だち追加していなければ案内する（友だちでないとLINEに通知が届かないため）
async function promptAddFriendIfNeeded(liff) {
  try {
    const f = await liff.getFriendship();
    if (f && f.friendFlag === false) {
      alert("LINEと連携しました。\nお知らせを受け取るため、癒楽里の公式LINEを友だち追加してください。");
      window.location.href = LINE_ADD_FRIEND_URL;
      return true;
    }
  } catch (e) {
    console.error("友だち状態の確認に失敗しました:", e);
  }
  return false;
}

export default function MyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#888" }}>読み込み中...</div>}>
      <MyPageInner />
    </Suspense>
  );
}
