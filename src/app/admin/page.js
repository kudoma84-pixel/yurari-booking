"use client";
import { useState, useEffect } from "react";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

const STORES = [
  { id: "minamiurawa", name: "南浦和店" },
  { id: "toda", name: "戸田店" },
];

const ADMIN_USERS = [
  { id: "minamiurawa", name: "南浦和店", password: "yurari-minami" },
  { id: "toda", name: "戸田店", password: "yurari-toda" },
];

const STAFFS = {
  minamiurawa: [
    { id: "s1", name: "田中 恵子" },
    { id: "s2", name: "鈴木 大輔" },
    { id: "s3", name: "山田 さくら" },
  ],
  toda: [
    { id: "s4", name: "佐藤 健一" },
    { id: "s5", name: "中村 美咲" },
  ],
};

const BASE_SLOTS = [
  "10:00","10:30","11:00","11:30","12:00","12:30","13:00",
  "15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30"
];
const MORNING_EXT = ["09:00","09:30"];
const EVENING_EXT = ["20:00","20:30"];
const BREAK_SLOTS = ["13:30","14:00","14:30"];
const DAYS_JP = ["日","月","火","水","木","金","土"];

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentStore, setCurrentStore] = useState(null);
  const [password, setPassword] = useState("");
  const [selectedStore, setSelectedStore] = useState("minamiurawa");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("calendar");
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState([]);

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  const handleLogin = () => {
    const user = ADMIN_USERS.find(u => u.id === selectedStore && u.password === password);
    if (user) { setLoggedIn(true); setCurrentStore(user); setError(""); }
    else setError("パスワードが違います");
  };

  const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  const fetchBookings = async (date) => {
    if (!date) return;
    setLoading(true);
    const d = formatDate(date);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${currentStore.id}&booking_date=eq.${d}&select=*,customers(name,tel,kana,email,line_user_id)`,
      { headers }
    );
    const data = await res.json();
    setBookings(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?order=created_at.desc`, { headers });
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const fetchCustomerHistory = async (customerId) => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?customer_id=eq.${customerId}&order=booking_date.desc&select=*`,
      { headers }
    );
    const data = await res.json();
    setCustomerHistory(Array.isArray(data) ? data : []);
  };

  const fetchBlocks = async (date) => {
    if (!date) return;
    const d = formatDate(date);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blocks?store_id=eq.${currentStore.id}&block_date=eq.${d}`, { headers });
    const data = await res.json();
    setBlocks(Array.isArray(data) ? data : []);
  };

  const fetchShifts = async (date) => {
    if (!date) return;
    const d = formatDate(date);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/shifts?store_id=eq.${currentStore.id}&work_date=eq.${d}`, { headers });
    const data = await res.json();
    setShifts(Array.isArray(data) ? data : []);
  };

  const fetchExtensions = async (date) => {
    if (!date) return;
    const d = formatDate(date);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/time_extensions?store_id=eq.${currentStore.id}&extension_date=eq.${d}`, { headers });
    const data = await res.json();
    setExtensions(Array.isArray(data) ? data : []);
  };

  const fetchAll = async (date) => {
    await Promise.all([fetchBookings(date), fetchBlocks(date), fetchShifts(date), fetchExtensions(date)]);
  };

  useEffect(() => {
    if (loggedIn && tab === "customers") fetchCustomers();
  }, [loggedIn, tab]);

  useEffect(() => {
    if (loggedIn && selectedDate) fetchAll(selectedDate);
  }, [selectedDate]);

  const toggleExtension = async (type) => {
    const d = formatDate(selectedDate);
    const ext = extensions[0];
    if (ext) {
      await fetch(`${SUPABASE_URL}/rest/v1/time_extensions?id=eq.${ext.id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ [type]: !ext[type] }),
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/time_extensions`, {
        method: "POST", headers,
        body: JSON.stringify({ store_id: currentStore.id, extension_date: d, [type]: true }),
      });
    }
    fetchExtensions(selectedDate);
  };

  const toggleBlock = async (staffId, time) => {
    const d = formatDate(selectedDate);
    const existing = blocks.find(b => b.staff_id === staffId && b.block_time === time);
    if (existing) {
      await fetch(`${SUPABASE_URL}/rest/v1/blocks?id=eq.${existing.id}`, { method: "DELETE", headers });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/blocks`, {
        method: "POST", headers,
        body: JSON.stringify({ store_id: currentStore.id, staff_id: staffId, block_date: d, block_time: time, block_type: staffId === "all" ? "store" : "staff" }),
      });
    }
    fetchBlocks(selectedDate);
  };

  const updateBookingStatus = async (id, status) => {
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status }),
    });
    fetchBookings(selectedDate);
    if (selectedBooking?.id === id) setSelectedBooking({ ...selectedBooking, status });
  };

  const statusLabel = (s) => ({ confirmed: "確認済", cancelled: "キャンセル", completed: "完了", pending: "未確認" }[s] || s);
  const statusColor = (s) => ({ confirmed: "#5a9e7a", cancelled: "#e07070", completed: "#7090e0", pending: "#e0a040" }[s] || "#aaa");

  const getTimeSlots = () => {
    const ext = extensions[0] || {};
    const slots = [];
    if (ext.morning_extended) slots.push(...MORNING_EXT);
    slots.push(...BASE_SLOTS);
    if (ext.evening_extended) slots.push(...EVENING_EXT);
    return slots;
  };

  const getBookingForCell = (staffId, time) => {
    return bookings.find(b => b.staff_id === staffId && b.booking_time === time);
  };

  const isBlocked = (staffId, time) => {
    return blocks.some(b => (b.staff_id === staffId || b.staff_id === "all") && b.block_time === time);
  };

  const isOnShift = (staffId) => {
    if (shifts.length === 0) return true;
    return shifts.some(s => s.staff_id === staffId);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  if (!loggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #fdf9f4 0%, #f5ede0 50%, #edf5f0 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans JP', sans-serif" }}>
        <div style={{ background: "white", borderRadius: 20, padding: 40, width: 360, boxShadow: "0 8px 40px rgba(0,0,0,0.1)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#3a5a3a" }}>管理画面</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>整体院 癒楽里</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>店舗</label>
            <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: "#3a5a3a", background: "white", boxSizing: "border-box" }}>
              {STORES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>パスワード</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="パスワードを入力" style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: "#3a5a3a", background: "white", boxSizing: "border-box", outline: "none" }} />
          </div>
          {error && <div style={{ color: "#e07070", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</div>}
          <button onClick={handleLogin} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>ログイン</button>
        </div>
      </div>
    );
  }

  const timeSlots = getTimeSlots();
  const staffList = STAFFS[currentStore.id] || [];
  const ext = extensions[0] || {};

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Noto Sans JP', sans-serif" }}>

      {/* 予約詳細モーダル */}
      {selectedBooking && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setSelectedBooking(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>予約詳細</div>
              <button onClick={() => setSelectedBooking(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {[
                { label: "予約番号", value: selectedBooking.booking_number },
                { label: "日時", value: `${selectedBooking.booking_date} ${selectedBooking.booking_time}` },
                { label: "コース", value: selectedBooking.course_name },
                { label: "担当", value: selectedBooking.staff_name },
                { label: "お名前", value: selectedBooking.customers?.name || "未登録" },
                { label: "電話番号", value: selectedBooking.customers?.tel || "-" },
                { label: "メール", value: selectedBooking.customers?.email || "-" },
                { label: "LINE", value: selectedBooking.customers?.line_user_id ? "連携済" : "未連携" },
                { label: "メモ", value: selectedBooking.notes || "-" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", borderBottom: "1px solid #f0ebe4", paddingBottom: 8 }}>
                  <div style={{ fontSize: 12, color: "#7a9a7a", fontWeight: 700, width: 80, flexShrink: 0 }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: "#3a5a3a" }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["confirmed","completed","cancelled"].map(s => (
                <button key={s} onClick={() => updateBookingStatus(selectedBooking.id, s)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${statusColor(s)}`, background: selectedBooking.status === s ? statusColor(s) : "white", color: selectedBooking.status === s ? "white" : statusColor(s), fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{statusLabel(s)}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 顧客詳細モーダル */}
      {selectedCustomer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setSelectedCustomer(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a" }}>{selectedCustomer.name} 様</div>
              <button onClick={() => setSelectedCustomer(null)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, background: "#f9f6f2", borderRadius: 12, padding: 16 }}>
              {[
                { label: "電話番号", value: selectedCustomer.tel },
                { label: "メール", value: selectedCustomer.email },
                { label: "LINE", value: selectedCustomer.line_user_id ? "✓ 連携済" : "未連携" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex" }}>
                  <div style={{ fontSize: 12, color: "#7a9a7a", fontWeight: 700, width: 80, flexShrink: 0 }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: "#3a5a3a" }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>来院履歴（{customerHistory.length}件）</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {customerHistory.length === 0 && <div style={{ color: "#aaa", fontSize: 13 }}>来院履歴がありません</div>}
              {customerHistory.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#f5f5f5", borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#3a5a3a" }}>{b.booking_date} {b.booking_time}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{b.course_name} / {b.staff_name}</div>
                  </div>
                  <div style={{ fontSize: 11, background: statusColor(b.status), color: "white", borderRadius: 20, padding: "3px 10px" }}>{statusLabel(b.status)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "white", borderBottom: "1px solid #e8ddd0", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>🌿</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>癒楽里 {currentStore.name}</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>管理画面</div>
          </div>
        </div>
        <button onClick={() => { setLoggedIn(false); setPassword(""); }} style={{ padding: "8px 16px", borderRadius: 10, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 13, cursor: "pointer" }}>ログアウト</button>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #e8ddd0", background: "white", padding: "0 24px", overflowX: "auto" }}>
        {[
          { id: "calendar", label: "📅 カレンダー" },
          { id: "bookings", label: "📋 予約一覧" },
          { id: "customers", label: "👥 顧客管理" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "14px 20px", border: "none", background: "none", fontSize: 14, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#3a5a3a" : "#aaa", borderBottom: tab === t.id ? "3px solid #5a9e7a" : "3px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>

        {tab === "calendar" && (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", minWidth: 320 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1, 1))} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#5a9e7a" }}>‹</button>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>{currentMonth.getFullYear()}年{currentMonth.getMonth()+1}月</div>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1))} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#5a9e7a" }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                {DAYS_JP.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#aaa", padding: "4px 0" }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {getDaysInMonth().map((d, i) => {
                  if (!d) return <div key={i} />;
                  const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();
                  const isToday = d.toDateString() === new Date().toDateString();
                  const dayIdx = d.getDay();
                  return (
                    <div key={i} onClick={() => setSelectedDate(d)} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, cursor: "pointer", background: isSelected ? "#3a5a3a" : isToday ? "#eaf5ec" : "white", color: isSelected ? "white" : dayIdx === 0 ? "#e07070" : dayIdx === 6 ? "#7090e0" : "#3a5a3a", fontWeight: isToday ? 700 : 400, fontSize: 13, border: isToday && !isSelected ? "2px solid #5a9e7a" : "2px solid transparent" }}>
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#3a5a3a" }}>
                      {selectedDate.getMonth()+1}月{selectedDate.getDate()}日（{DAYS_JP[selectedDate.getDay()]}）
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => toggleExtension("morning_extended")} style={{ padding: "6px 12px", borderRadius: 8, border: `2px solid ${ext.morning_extended ? "#5a9e7a" : "#e8ddd0"}`, background: ext.morning_extended ? "#eaf5ec" : "white", color: ext.morning_extended ? "#3a5a3a" : "#aaa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {ext.morning_extended ? "✓" : ""} 早朝拡張(9:00〜)
                      </button>
                      <button onClick={() => toggleExtension("evening_extended")} style={{ padding: "6px 12px", borderRadius: 8, border: `2px solid ${ext.evening_extended ? "#5a9e7a" : "#e8ddd0"}`, background: ext.evening_extended ? "#eaf5ec" : "white", color: ext.evening_extended ? "#3a5a3a" : "#aaa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {ext.evening_extended ? "✓" : ""} 夜間拡張(〜20:30)
                      </button>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>読み込み中...</div>
                ) : (
                  <div style={{ background: "white", borderRadius: 16, overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
                      <thead>
                        <tr style={{ background: "#f5f5f5" }}>
                          <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#7a9a7a", minWidth: 100, position: "sticky", left: 0, background: "#f5f5f5", zIndex: 1 }}>スタッフ</th>
                          {timeSlots.map(time => {
                            const isBreak = BREAK_SLOTS.includes(time);
                            const isExt = MORNING_EXT.includes(time) || EVENING_EXT.includes(time);
                            return (
                              <th key={time} style={{ padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: isBreak ? "#e0a040" : isExt ? "#5a9e7a" : "#7a9a7a", minWidth: 70, borderLeft: "1px solid #f0ebe4", background: isBreak ? "#fdf5f0" : isExt ? "#f0f8f4" : "#f5f5f5" }}>
                                {time}
                                {isBreak && <div style={{ fontSize: 9, color: "#e0a040" }}>休憩</div>}
                                {isExt && <div style={{ fontSize: 9, color: "#5a9e7a" }}>拡張</div>}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map(s => (
                          <tr key={s.id} style={{ borderTop: "1px solid #f0ebe4" }}>
                            <td style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, color: isOnShift(s.id) ? "#3a5a3a" : "#ccc", position: "sticky", left: 0, background: "white", zIndex: 1, minWidth: 100 }}>
                              {s.name}
                              {!isOnShift(s.id) && <div style={{ fontSize: 10, color: "#ccc" }}>休み</div>}
                            </td>
                            {timeSlots.map(time => {
                              const isBreak = BREAK_SLOTS.includes(time);
                              const isExt = MORNING_EXT.includes(time) || EVENING_EXT.includes(time);
                              const booking = getBookingForCell(s.id, time);
                              const blocked = isBlocked(s.id, time);
                              const onShift = isOnShift(s.id);
                              return (
                                <td key={time} style={{ padding: "4px", textAlign: "center", borderLeft: "1px solid #f0ebe4", background: isBreak ? "#fdf5f0" : isExt ? "#f0f8f4" : "white", minWidth: 70 }}>
                                  {isBreak ? (
                                    <div style={{ fontSize: 11, color: "#e0a040" }}>－</div>
                                  ) : !onShift ? (
                                    <div style={{ fontSize: 11, color: "#ddd" }}>－</div>
                                  ) : booking ? (
                                    <div style={{ background: statusColor(booking.status), color: "white", borderRadius: 6, padding: "3px 6px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => setSelectedBooking(booking)}>
                                      {booking.customers?.name || "予約あり"}
                                    </div>
                                  ) : blocked ? (
                                    <div onClick={() => toggleBlock(s.id, time)} style={{ background: "#f0ebe4", color: "#bbb", borderRadius: 6, padding: "3px 6px", fontSize: 10, cursor: "pointer" }}>🔒</div>
                                  ) : (
                                    <div onClick={() => toggleBlock(s.id, time)} style={{ color: "#ddd", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>+</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!selectedDate && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 14 }}>
                ← 日付を選択してください
              </div>
            )}
          </div>
        )}

        {tab === "bookings" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", marginBottom: 16 }}>予約一覧 - {currentStore.name}</h2>
            <div style={{ marginBottom: 16 }}>
              <input type="date" value={selectedDate ? formatDate(selectedDate) : ""} onChange={e => { const d = new Date(e.target.value + "T00:00:00"); setSelectedDate(d); fetchBookings(d); }} style={{ padding: "10px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: "#3a5a3a" }} />
            </div>
            {loading ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>読み込み中...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {bookings.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa", background: "white", borderRadius: 16 }}>予約がありません</div>}
                {bookings.map(b => (
                  <div key={b.id} style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", cursor: "pointer" }} onClick={() => setSelectedBooking(b)}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a" }}>{b.booking_number}</div>
                        <div style={{ fontSize: 12, background: statusColor(b.status), color: "white", borderRadius: 20, padding: "3px 10px" }}>{statusLabel(b.status)}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "#aaa" }}>{b.booking_date} {b.booking_time}</div>
                    </div>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                      <div><span style={{ fontSize: 11, color: "#7a9a7a" }}>お名前</span><div style={{ fontSize: 14, color: "#3a5a3a", fontWeight: 600 }}>{b.customers?.name || "未登録"}</div></div>
                      <div><span style={{ fontSize: 11, color: "#7a9a7a" }}>コース</span><div style={{ fontSize: 14, color: "#3a5a3a", fontWeight: 600 }}>{b.course_name}</div></div>
                      <div><span style={{ fontSize: 11, color: "#7a9a7a" }}>担当</span><div style={{ fontSize: 14, color: "#3a5a3a", fontWeight: 600 }}>{b.staff_name}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "customers" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3a5a3a", marginBottom: 16 }}>顧客一覧</h2>
            {loading ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>読み込み中...</div> : (
              <div style={{ background: "white", borderRadius: 16, overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      {["顧客番号","氏名","電話番号","メール","LINE"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#7a9a7a" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#aaa" }}>顧客がいません</td></tr>}
                    {customers.map((c, i) => (
                      <tr key={c.id} style={{ borderTop: "1px solid #f0ebe4", cursor: "pointer" }} onClick={() => { setSelectedCustomer(c); fetchCustomerHistory(c.id); }}>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#3a5a3a" }}>{c.customer_number || i+1}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#5a9e7a" }}>{c.name}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#3a5a3a" }}>{c.tel}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#3a5a3a" }}>{c.email}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: c.line_user_id ? "#5a9e7a" : "#ccc" }}>{c.line_user_id ? "✓ 連携済" : "未連携"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
