"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";
const GREEN = "#2d6a4f";
const LIGHT_GREEN = "#52b788";
const ORANGE = "#e07b39";
const CREAM = "#fdf8f0";

const ADMIN_USERS = [
  { id: "minamiurawa", name: "南浦和店", password: "yurari-minami" },
  { id: "toda", name: "戸田店", password: "yurari-toda" },
];

const statusColor = (s) => ({
  confirmed: "#5a9e7a",
  received: "#7090e0",
  treatment_done: "#e0a040",
  cancelled: "#e07070",
  completed: "#aaa",
  pending: "#ccc",
}[s] || "#aaa");

const statusLabel = (s) => ({
  confirmed: "確認済",
  received: "受付中",
  treatment_done: "施術終了",
  cancelled: "キャンセル",
  completed: "会計済",
  pending: "未確認",
}[s] || s);

function CheckinPageInner() {
  const searchParams = useSearchParams();
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentStore, setCurrentStore] = useState(null);
  const [password, setPassword] = useState("");
  const [selectedStore, setSelectedStore] = useState("minamiurawa");
  const [error, setError] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [checkinResult, setCheckinResult] = useState(null); // { name, status: 'ok'|'error', message }
  const [todayReceived, setTodayReceived] = useState([]);
  const inputRef = useRef(null);

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // 自動ログイン
  useEffect(() => {
    const storeId = localStorage.getItem("yurari_admin_store");
    const expire = localStorage.getItem("yurari_admin_expire");
    if (storeId && expire && Date.now() < parseInt(expire)) {
      const user = ADMIN_USERS.find((u) => u.id === storeId);
      if (user) { setLoggedIn(true); setCurrentStore(user); }
    }
  }, []);

  // ログイン後に受付済み一覧を取得＆定期更新
  useEffect(() => {
    if (!loggedIn || !currentStore) return;
    fetchTodayReceived();
    const interval = setInterval(fetchTodayReceived, 10000);
    return () => clearInterval(interval);
  }, [loggedIn, currentStore]);

  // URLパラメータからcheckinを自動処理
  useEffect(() => {
    if (!loggedIn || !currentStore) return;
    const checkinId = searchParams?.get("checkin");
    if (checkinId) {
      handleQrInput(`https://yurari-booking.vercel.app/admin/checkin?checkin=${checkinId}`);
    }
  }, [loggedIn, currentStore]);

  // 入力欄に常時フォーカス
  useEffect(() => {
    if (loggedIn) {
      const refocus = () => { if (inputRef.current) inputRef.current.focus(); };
      refocus();
      document.addEventListener("click", refocus);
      return () => document.removeEventListener("click", refocus);
    }
  }, [loggedIn]);

  const formatDate = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };

  const fetchTodayReceived = async () => {
    const today = formatDate(new Date());
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=eq.${today}&status=in.(received,treatment_done)&select=*,customers(name)&order=booking_time.asc`,
      { headers }
    );
    const data = await res.json();
    setTodayReceived(Array.isArray(data) ? data : []);
  };

  const handleLogin = () => {
    const user = ADMIN_USERS.find((u) => u.id === selectedStore && u.password === password);
    if (user) {
      setLoggedIn(true);
      setCurrentStore(user);
      setError("");
      localStorage.setItem("yurari_admin_store", user.id);
      localStorage.setItem("yurari_admin_expire", Date.now() + 12 * 60 * 60 * 1000);
    } else {
      setError("パスワードが違います");
    }
  };

  const handleQrInput = async (value) => {
    // QRの内容: https://yurari-booking.vercel.app/admin?checkin=顧客ID
    // またはカード用: https://yurari-booking.vercel.app/admin?checkin=会員番号
    setQrInput("");
    const match = value.match(/checkin=([^&\s]+)/);
    if (!match) {
      setCheckinResult({ status: "error", message: "QRコードが正しくありません" });
      setTimeout(() => setCheckinResult(null), 3000);
      return;
    }
    const identifier = match[1];

    // 顧客IDまたは会員番号で顧客を検索
    let customer = null;
    // まずIDで検索
    const resId = await fetch(
      `${SUPABASE_URL}/rest/v1/customers?id=eq.${identifier}&select=*`,
      { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } }
    );
    const dataId = await resId.json();
    if (dataId && dataId.length > 0) {
      customer = dataId[0];
    } else {
      // 会員番号で検索
      const resNum = await fetch(
        `${SUPABASE_URL}/rest/v1/customers?customer_number=eq.${identifier}&select=*`,
        { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } }
      );
      const dataNum = await resNum.json();
      if (dataNum && dataNum.length > 0) customer = dataNum[0];
    }

    if (!customer) {
      setCheckinResult({ status: "error", message: "顧客が見つかりません" });
      setTimeout(() => setCheckinResult(null), 3000);
      return;
    }

    // 本日の予約を検索
    const today = formatDate(new Date());
    const resBooking = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?customer_id=eq.${customer.id}&booking_date=eq.${today}&status=eq.confirmed&order=booking_time.asc&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } }
    );
    const bookings = await resBooking.json();

    if (!bookings || bookings.length === 0) {
      setCheckinResult({ status: "error", message: `${customer.name}様の本日の予約が見つかりません` });
      setTimeout(() => setCheckinResult(null), 4000);
      return;
    }

    const booking = bookings[0];

    // 受付済みに更新
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "received" }),
    });

    // 顧客番号付番
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/assign_customer_number`, {
      method: "POST",
      headers,
      body: JSON.stringify({ p_customer_id: customer.id, p_store_id: currentStore.id }),
    });

    setCheckinResult({ status: "ok", message: `${customer.name}様 受付完了！` });
    setTimeout(() => setCheckinResult(null), 4000);
    fetchTodayReceived();
  };

  if (!loggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #fdf9f4, #edf5f0)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans JP', sans-serif" }}>
        <div style={{ background: "white", borderRadius: 20, padding: 40, width: 360, boxShadow: "0 8px 40px rgba(0,0,0,0.1)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔲</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: GREEN }}>QR受付</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>整体院 癒楽里</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>店舗</label>
            <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, background: "white", boxSizing: "border-box" }}>
              <option value="minamiurawa">南浦和店</option>
              <option value="toda">戸田店</option>
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>パスワード</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="パスワードを入力" style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
          </div>
          {error && <div style={{ color: "#e07070", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</div>}
          <button onClick={handleLogin} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: GREEN, color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>ログイン</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Noto Sans JP', sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* ヘッダー */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>🔲 QR受付 - {currentStore.name}</div>
          <a href="/admin" style={{ fontSize: 13, color: LIGHT_GREEN, textDecoration: "none" }}>← 管理画面へ</a>
        </div>

        {/* QR入力エリア */}
        <div style={{ background: "white", borderRadius: 20, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔲</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: GREEN, marginBottom: 8 }}>QRコードをかざしてください</div>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>リーダーにかざすと自動で受付されます</div>
          <input
            ref={inputRef}
            value={qrInput}
            onChange={e => setQrInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && qrInput) handleQrInput(qrInput); }}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box", textAlign: "center", outline: "none", color: "#aaa" }}
            placeholder="QRリーダー入力待ち..."
          />
          {checkinResult && (
            <div style={{ marginTop: 16, padding: "16px 24px", borderRadius: 14, background: checkinResult.status === "ok" ? "#eaf5ec" : "#fff0f0", border: `2px solid ${checkinResult.status === "ok" ? GREEN : "#e07070"}`, fontSize: 16, fontWeight: 700, color: checkinResult.status === "ok" ? GREEN : "#e07070" }}>
              {checkinResult.status === "ok" ? "✅ " : "❌ "}{checkinResult.message}
            </div>
          )}
        </div>

        {/* 本日受付済み一覧 */}
        <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 12 }}>本日の受付済み（{todayReceived.length}名）</div>
        {todayReceived.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, background: "white", borderRadius: 16, color: "#aaa", fontSize: 13 }}>まだ受付がありません</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {todayReceived.map(b => (
              <div key={b.id} style={{ background: "white", borderRadius: 16, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", borderTop: `4px solid ${statusColor(b.status)}`, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{b.customers?.name || "不明"} 様</div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{b.booking_time} / {b.course_name}</div>
                <div style={{ fontSize: 12, background: statusColor(b.status), color: "white", borderRadius: 20, padding: "4px 12px", display: "inline-block" }}>{statusLabel(b.status)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckinPage() {
  return (
  <React.Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#888" }}>読み込み中...</div>}>
    <CheckinPageInner />
  </React.Suspense>
  );
}
