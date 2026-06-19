"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

const GREEN = "#2d6a4f";
const LIGHT_GREEN = "#52b788";
const ORANGE = "#e07b39";
const CREAM = "#fdf8f0";
const DARK = "#1a1a1a";
const LOGO_URL = "https://seitai-yurari.com/wp-content/uploads/2025/11/logo.webp";

const DAYS_JP = ["日","月","火","水","木","金","土"];

function MyPageInner() {
  const searchParams = useSearchParams();
  const isCheckin = searchParams?.get('checkin') === 'true';
  const [screen, setScreen] = useState("login");
  const [loginCode, setLoginCode] = useState("");
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("booking");
  const [myMessages, setMyMessages] = useState([]);
  const [myMessageText, setMyMessageText] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelDone, setCancelDone] = useState(false);
  const [notices, setNotices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [checkinDone, setCheckinDone] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  useEffect(() => {
    if (!customer) return;
    const interval = setInterval(() => {
      fetchBookings(customer.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [customer]);
  useEffect(() => {
    // Service Worker & Push通知登録
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(async (reg) => {
        await navigator.serviceWorker.ready;
        const stored = localStorage.getItem('yurari_customer_id');
        if (!stored) return;
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        try {
          const vapidKey = "BKG4uyATw44AqA2jl5olVRr5pqPmnIb-W7jSRCtdfCZ4_K5X3T2AOVm8_uuTrBZgEgIEV2o7GVReueHzNazoDas";
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey,
          });
          await fetch('/api/push-subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub, customer_id: stored }),
          });
        } catch (e) {
          console.error('Push登録失敗:', e);
        }
      });
    }

    const customerId = localStorage.getItem('yurari_customer_id');
    const expire = localStorage.getItem('yurari_login_expire');
    if (customerId && expire && Date.now() < parseInt(expire)) {
      const autoLogin = async () => {
        const res = await fetch(SUPABASE_URL + "/rest/v1/customers?id=eq." + customerId + "&select=*", {
          headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          setCustomer(data[0]);
          setProfileForm({
            name: data[0].name || "",
            kana: data[0].kana || "",
            tel: data[0].tel || "",
            email: data[0].email || "",
            address: data[0].address || "",
            zipcode: data[0].zipcode || "",
            preferred_staff_id: data[0].preferred_staff_id || "",
          });
          await fetchBookings(data[0].id);
          await fetchTickets(data[0].id);
          await fetchAllStaff();
          await fetchNotices(data[0].id);
          setScreen("mypage");
        }
      };
      autoLogin();
    }
  }, []);

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
      const telLast4 = clean.slice(0, 4);
      const birthMonth = clean.slice(4, 6);
      const birthDay = clean.slice(6, 8);
      const res = await fetch(SUPABASE_URL + "/rest/v1/customers?select=*", { headers });
      const allCustomers = await res.json();
      const data = Array.isArray(allCustomers) ? allCustomers.filter(c => {
        const telMatch = c.tel && c.tel.replace(/[^0-9]/g, "").slice(-4) === telLast4;
        const bdMatch = c.birthday && c.birthday.replace(/-/g, "").slice(4, 8) === (birthMonth + birthDay);
        return telMatch && bdMatch;
      }) : [];
      if (data && data.length > 0) {
        setCustomer(data[0]);
        setProfileForm({
          name: data[0].name || "",
          kana: data[0].kana || "",
          tel: data[0].tel || "",
          email: data[0].email || "",
          address: data[0].address || "",
          zipcode: data[0].zipcode || "",
          preferred_staff_id: data[0].preferred_staff_id || "",
        });
        localStorage.setItem('yurari_customer_id', data[0].id);
        localStorage.setItem('yurari_login_expire', Date.now() + 7 * 24 * 60 * 60 * 1000);
        await fetchBookings(data[0].id);
        await fetchTickets(data[0].id);
        await fetchAllStaff();
        await fetchNotices(data[0].id);
        setScreen("mypage");
      } else {
        setError("電話番号または生年月日が一致しません");
      }
    } catch (e) {
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotices = async (customerId) => {
    const res = await fetch(SUPABASE_URL + "/rest/v1/notifications?customer_id=eq." + customerId + "&order=created_at.desc", { headers });
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setNotices(list);
    setUnreadCount(list.filter(n => !n.is_read).length);
  };

  const markAllRead = async () => {
    await fetch(SUPABASE_URL + "/rest/v1/notifications?customer_id=eq." + customer.id + "&is_read=eq.false", {
      method: "PATCH", headers, body: JSON.stringify({ is_read: true })
    });
    setNotices(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const fetchBookings = async (customerId) => {
    const res = await fetch(SUPABASE_URL + "/rest/v1/bookings?customer_id=eq." + customerId + "&order=booking_date.desc&select=*", { headers });
    const data = await res.json();
    setBookings(Array.isArray(data) ? data : []);
  };

  const fetchTickets = async (customerId) => {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(SUPABASE_URL + "/rest/v1/gift_tickets?customer_id=eq." + customerId + "&status=eq.active&expires_at=gte." + today + "&order=expires_at.asc", { headers });
    const data = await res.json();
    setTickets(Array.isArray(data) ? data : []);
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

  const fetchAllStaff = async () => {
    const res = await fetch(SUPABASE_URL + "/rest/v1/staff_members?is_active=eq.true&order=sort_order.asc", { headers });
    const data = await res.json();
    if (Array.isArray(data)) {
      const unique = data.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
      setStaffList(unique);
    } else {
      setStaffList([]);
    }
  };

  const cancelBooking = async (bookingId) => {
    await fetch(SUPABASE_URL + "/rest/v1/bookings?id=eq." + bookingId, {
      method: "PATCH", headers, body: JSON.stringify({ status: "cancelled" }),
    });
    await fetchBookings(customer.id);
    setCancelTarget(null);
    setCancelDone(true);
    setTimeout(() => setCancelDone(false), 3000);
  };

  const saveProfile = async () => {
    await fetch(SUPABASE_URL + "/rest/v1/customers?id=eq." + customer.id, {
      method: "PATCH", headers,
      body: JSON.stringify({
        name: profileForm.name,
        kana: profileForm.kana,
        tel: profileForm.tel,
        email: profileForm.email,
        address: profileForm.address,
        zipcode: profileForm.zipcode,
        preferred_staff_id: profileForm.preferred_staff_id || null,
      }),
    });
    setCustomer({ ...customer, ...profileForm });
    setEditProfile(false);
  };

  const handleCheckin = async () => {
    if (!customer) return;
    setCheckinLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(
        SUPABASE_URL + "/rest/v1/bookings?customer_id=eq." + customer.id + "&booking_date=eq." + today + "&status=eq.confirmed&order=booking_time.asc&limit=1",
        { headers }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        await fetch(SUPABASE_URL + "/rest/v1/bookings?id=eq." + data[0].id, {
          method: "PATCH", headers, body: JSON.stringify({ status: "received" }),
        });
        await fetch(SUPABASE_URL + "/rest/v1/rpc/assign_customer_number", {
          method: "POST", headers,
          body: JSON.stringify({ p_customer_id: customer.id, p_store_id: data[0].store_id }),
        });
        await fetchBookings(customer.id);
        setCheckinDone(true);
        setTimeout(() => setCheckinDone(false), 5000);
      } else {
        alert("本日の予約が見つかりません");
      }
    } catch (e) {
      alert("エラーが発生しました");
    } finally {
      setCheckinLoading(false);
    }
  };

  const statusLabel = (s) => ({ confirmed: "確認済", received: "受付中", treatment_done: "施術終了", cancelled: "キャンセル", completed: "会計済", pending: "未確認" }[s] || s);
  const statusColor = (s) => ({ confirmed: GREEN, received: "#7090e0", treatment_done: ORANGE, cancelled: "#e07070", completed: "#aaa", pending: "#ccc" }[s] || "#aaa");

  const today = new Date().toISOString().split("T")[0];
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
            <div style={{ fontSize: 13, color: "#888" }}>携帯下4桁＋誕生日でログインしてください</div>
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
            <button onClick={() => { localStorage.removeItem('yurari_customer_id'); localStorage.removeItem('yurari_login_expire'); setScreen("login"); setCustomer(null); setLoginCode(""); }}
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
          <div className="tab-wrap" style={{ display: "flex", gap: 8, paddingTop: 8, paddingBottom: 4, overflowX: "auto" }}>
          {[
            { id: "booking", label: "📅 予約" },
            { id: "notice", label: "🔔 通知", badge: unreadCount },
            { id: "ticket", label: "🎫 金券" },
            { id: "point", label: "🌟 ポイント" },
            { id: "mymessage", label: "💬 メッセージ" },
                        { id: "profile", label: "⚙️ 設定" },
            { id: "qr", label: "🔲 マイQR" },
          ].map(t => (
            <button key={t.id} onClick={() => {
              setActiveTab(t.id);
              if (t.id === "notice") markAllRead();
              if (t.id === "ticket" && customer) fetchTickets(customer.id);
              if (t.id === "booking" && customer) fetchBookings(customer.id);
              if (t.id === "mymessage" && customer) {
                fetch(SUPABASE_URL + "/rest/v1/line_messages?line_user_id=eq." + customer.line_user_id + "&order=created_at.asc&limit=100", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } })
                  .then(r => r.json()).then(data => { if (Array.isArray(data)) setMyMessages(data); });
              }
              if (t.id === "qr") setQrLoaded(false);
            }}
              className="tab-btn" style={{ position: "relative", padding: "10px 20px", borderRadius: 20, border: "none", background: activeTab === t.id ? GREEN : "white", color: activeTab === t.id ? "white" : "#888", fontSize: 13, fontWeight: activeTab === t.id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "visible" }}>              {t.label}
              {t.badge > 0 && <span style={{ position: "absolute", top: -6, right: -16, background: "#e07070", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px white", zIndex: 1 }}>{t.badge}</span>}
            </button>
          ))}
          </div>
        </div>

        {activeTab === "qr" && (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px" }}>
    <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 8 }}>🔲 マイQRコード</div>
    <div style={{ fontSize: 12, color: "#888", marginBottom: 24 }}>来院時にスタッフに提示してください</div>
    <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", position: "relative" }}>
      {!qrLoaded && (
                <div style={{ width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13 }}>
                          読み込み中...
                                  </div>
                                        )}

            <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https://yurari-booking.vercel.app/admin/checkin?checkin=${customer?.id}`}
        alt="マイQR"
        onLoad={() => setQrLoaded(true)}
        style={{ width: 220, height: 220, display: qrLoaded ? "block" : "none" }}
      />
    </div>
    <div style={{ marginTop: 20, fontSize: 13, color: "#888" }}>{customer?.name} 様</div>
    <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>ID: {customer?.id}</div>
  </div>
)}
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
                        <div style={{ fontSize: 11, color: "#aaa" }}>{new Date(n.created_at).toLocaleDateString("ja-JP")}</div>
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

        {activeTab === "mymessage" && (
          <div style={{ display: "flex", flexDirection: "column", height: 500 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 12 }}>💬 メッセージ</div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              {myMessages.length === 0 && <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 40 }}>メッセージはありません</div>}
              {myMessages.map(m => (
                <div key={m.id} style={{ display: "flex", justifyContent: m.direction === "inbound" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: m.direction === "inbound" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.direction === "inbound" ? GREEN : "#f0e8d8", color: m.direction === "inbound" ? "white" : "#3a5a3a", fontSize: 13 }}>
                    {m.message}
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: "right" }}>{new Date(m.created_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={myMessageText} onChange={e => setMyMessageText(e.target.value)} onKeyDown={async e => { if (e.key === "Enter" && !messageSending) await sendMyMessage(); }} placeholder="メッセージを入力..." style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 13 }} />
              <button onClick={async () => {
                if (!myMessageText || messageSending || !customer?.line_user_id) return;
                setMessageSending(true);
                await fetch(SUPABASE_URL + "/rest/v1/line_messages", {
                  method: "POST",
                  headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=representation" },
                  body: JSON.stringify({ line_user_id: customer.line_user_id, customer_id: customer.id, direction: "inbound", message: myMessageText, is_read: false }),
                });
                                setMyMessageText("");
                const res = await fetch(SUPABASE_URL + "/rest/v1/line_messages?line_user_id=eq." + customer.line_user_id + "&order=created_at.asc&limit=100", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } });
                const data = await res.json();
                if (Array.isArray(data)) setMyMessages(data);
                setMessageSending(false);
              }} disabled={messageSending} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: GREEN, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: messageSending ? 0.6 : 1 }}>送信</button>
            </div>
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
                  { label: "通知方法", value: customer?.notification_method === "line" ? "LINE" : customer?.notification_method === "email" ? "メール" : customer?.notification_method === "sms" ? "SMS" : "-" },
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

export default function MyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#888" }}>読み込み中...</div>}>
      <MyPageInner />
    </Suspense>
  );
}
