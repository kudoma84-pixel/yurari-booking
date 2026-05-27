"use client";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

const STORES = [
  { id: "minamiurawa", name: "南浦和店", address: "さいたま市南区南浦和2丁目", tel: "048-762-8333", hours: "10:00〜20:00（最終受付19:00）", lineUrl: "https://lin.ee/MINAMIURAWA" },
  { id: "toda", name: "戸田店", address: "戸田市○○○", tel: "048-yyy-yyyy", hours: "10:00〜20:00（最終受付19:00）", lineUrl: "https://lin.ee/TODA" },
];

const TIME_SLOTS = ["10:00","10:30","11:00","11:30","12:00","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00"];
const DAYS_JP = ["日","月","火","水","木","金","土"];
const LOGO_URL = "https://seitai-yurari.com/wp-content/uploads/2025/11/logo.webp";

const IMAGES = {
  hero: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/top/mainimg.webp",
  features: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/top/features.png",
  symptoms1: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/top/symptoms1.png",
  symptoms2: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/top/symptoms2.png",
  message: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/top/message.png",
  footer: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/common/foot4.jpg",
};

const GREEN = "#2d6a4f";
const LIGHT_GREEN = "#52b788";
const ORANGE = "#e07b39";
const CREAM = "#fdf8f0";
const DARK = "#1a1a1a";

function generateDates() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const bookingSteps = ["店舗選択","コース選択","スタッフ・日時","確認"];

export default function App() {
  const { data: session } = useSession();
  const [screen, setScreen] = useState("top");
  const [notificationMethod, setNotificationMethod] = useState(null);
  const [step, setStep] = useState(0);
  const [store, setStore] = useState(null);
  const [course, setCourse] = useState(null);
  const [staff, setStaff] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [profile, setProfile] = useState({
    name: "", kana: "", zipcode: "", address: "", tel: "",
    birthYear: "", birthMonth: "", birthDay: "", birthday: "",
    email: "", firstVisit: "初めて", notes: ""
  });
  const [bookingNum, setBookingNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [sameDayLeadTime, setSameDayLeadTime] = useState(60);

  const dates = generateDates();

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  useEffect(() => { fetchCourses(); }, []);

  useEffect(() => {
    if (store) { fetchStaff(store.id); fetchStoreSettings(store.id); }
  }, [store]);

  useEffect(() => {
    if (session && notificationMethod === "line") { checkExistingCustomer(); }
  }, [session]);

  const fetchCourses = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/course_menus?is_active=eq.true&order=sort_order.asc`, { headers });
    const data = await res.json();
    setCourses(Array.isArray(data) ? data : []);
  };

  const fetchStaff = async (storeId) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/staff_members?store_id=eq.${storeId}&is_active=eq.true&order=sort_order.asc`, { headers });
    const data = await res.json();
    setStaffList(Array.isArray(data) ? data : []);
  };

  const fetchStoreSettings = async (storeId) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/store_settings?store_id=eq.${storeId}`, { headers });
    const data = await res.json();
    if (data[0]) setSameDayLeadTime(data[0].same_day_lead_time);
  };

  const checkExistingCustomer = async () => {
    if (!session?.lineUserId) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?line_user_id=eq.${session.lineUserId}&select=*`, { headers });
    const data = await res.json();
    if (data && data.length > 0) {
      setExistingCustomer(data[0]);
      setProfile({
        name: data[0].name || "", kana: data[0].kana || "",
        zipcode: data[0].zipcode || "", address: data[0].address || "",
        tel: data[0].tel || "", email: data[0].email || "",
        birthYear: "", birthMonth: "", birthDay: "",
        birthday: data[0].birthday || "", firstVisit: "2回目以降", notes: "",
      });
      setScreen("booking");
    } else {
      setProfile(p => ({ ...p, name: session?.user?.name || "", email: session?.user?.email || "" }));
      setScreen("register");
    }
  };

  const handleAuthSelect = (method) => {
    setNotificationMethod(method);
    if (method === "line") {
      signIn("line");
    } else {
      setScreen("register");
    }
  };

  const handleRegisterSubmit = () => {
    if (!profile.name || !profile.kana || !profile.tel || !profile.email || !profile.address || !profile.zipcode || !profile.birthday) {
      setError("全ての項目を入力してください");
      return;
    }
    setScreen("booking");
    setError("");
  };

  const canNext = () => {
    if (step === 0) return !!store;
    if (step === 1) return !!course;
    if (step === 2) return !!staff && !!date && !!time;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const num = "YR-" + Date.now().toString().slice(-6);
    try {
      let customerId = existingCustomer?.id;
      if (!customerId) {
        const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?tel=eq.${profile.tel}&select=id`, { headers });
        const customers = await searchRes.json();
        if (customers && customers.length > 0) {
          customerId = customers[0].id;
        } else {
          const newRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
            method: "POST", headers,
            body: JSON.stringify({
              name: profile.name, kana: profile.kana, tel: profile.tel,
              email: profile.email, address: profile.address,
              zipcode: profile.zipcode,
              birthday: profile.birthday || null,
              points: 0,
              line_user_id: session?.lineUserId || null,
              notification_method: notificationMethod || "line",
            }),
          });
          const newCustomer = await newRes.json();
          customerId = newCustomer[0]?.id;
        }
      }
      await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        method: "POST", headers,
        body: JSON.stringify({
          customer_id: customerId, store_id: store.id,
          course_id: course.id, course_name: course.name,
          staff_id: staff.id, staff_name: staff.name,
          booking_date: formatDate(date), booking_time: time,
          status: "confirmed", notes: profile.notes, booking_number: num,
        }),
      });
      setBookingNum(num);
      setScreen("complete");
    } catch (e) {
      setBookingNum(num);
      setScreen("complete");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setScreen("top"); setNotificationMethod(null); setStep(0);
    setStore(null); setCourse(null); setStaff(null);
    setDate(null); setTime(null);
    setProfile({ name: "", kana: "", zipcode: "", address: "", tel: "", birthYear: "", birthMonth: "", birthDay: "", birthday: "", email: "", firstVisit: "初めて", notes: "" });
    setBookingNum(""); setError(""); setExistingCustomer(null);
  };

  const updateBirthday = (year, month, day) => {
    if (year && month && day) {
      return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    }
    return "";
  };

  const isSlotDisabled = (t) => {
    if (!date) return false;
    const isToday = formatDate(date) === formatDate(new Date());
    if (!isToday) return false;
    const now = new Date();
    const [h, m] = t.split(":").map(Number);
    const slotTime = new Date();
    slotTime.setHours(h, m, 0, 0);
    return slotTime.getTime() - now.getTime() < sameDayLeadTime * 60 * 1000;
  };

  const Header = ({ showBack }) => (
    <div style={{ background: "white", borderBottom: `3px solid ${GREEN}`, padding: "12px 20px", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={showBack ? reset : undefined} style={{ cursor: showBack ? "pointer" : "default" }}>
          <img src={LOGO_URL} alt="癒楽里ロゴ" style={{ height: 44, width: "auto" }} />
        </div>
        {!showBack && (
          <button onClick={() => setScreen("auth")} style={{ padding: "10px 20px", borderRadius: 25, border: "none", background: ORANGE, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            ご予約はこちら
          </button>
        )}
      </div>
    </div>
  );

  if (screen === "top") {
    return (
      <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: CREAM, minHeight: "100vh" }}>
        <Header showBack={false} />
        <div style={{ position: "relative", height: 420, overflow: "hidden" }}>
          <img src={IMAGES.hero} alt="癒楽里" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5))" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 20 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {["歪み","痛み","痺れ"].map(t => <div key={t} style={{ background: GREEN, color: "white", padding: "4px 16px", borderRadius: 4, fontSize: 16, fontWeight: 700 }}>{t}</div>)}
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, color: ORANGE, textShadow: "2px 2px 8px rgba(0,0,0,0.5)", marginBottom: 12 }}>根本改善へ</div>
            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 12, padding: "10px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: "#4285f4" }}>G</span><span style={{ color: "#ea4335" }}>o</span><span style={{ color: "#fbbc05" }}>o</span><span style={{ color: "#4285f4" }}>g</span><span style={{ color: "#34a853" }}>l</span><span style={{ color: "#ea4335" }}>e</span>
                　口コミ評価　<span style={{ fontSize: 20, color: ORANGE, fontWeight: 900 }}>4.9</span>
              </div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>多数のお喜びの声を頂いております！</div>
            </div>
            <button onClick={() => setScreen("auth")} style={{ padding: "16px 40px", borderRadius: 30, border: "none", background: ORANGE, color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              今すぐ予約する →
            </button>
          </div>
        </div>

        <div style={{ background: GREEN, padding: "20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", gap: 12, flexWrap: "wrap" }}>
            {STORES.map(s => (
              <div key={s.id} style={{ flex: 1, minWidth: 240, background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>SHOP</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 6 }}>癒楽里 {s.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>📞 {s.tel}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>🕐 {s.hours}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>FEATURES</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>癒楽里の特徴</div>
            <div style={{ width: 40, height: 3, background: ORANGE, margin: "8px auto 0" }} />
          </div>
          <img src={IMAGES.features} alt="特徴" style={{ width: "100%", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
        </div>

        <div style={{ background: "white", padding: "40px 20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>SYMPTOMS</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>こんなお悩みありませんか？</div>
              <div style={{ width: 40, height: 3, background: ORANGE, margin: "8px auto 0" }} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <img src={IMAGES.symptoms1} alt="症状1" style={{ flex: 1, width: "50%", borderRadius: 12 }} />
              <img src={IMAGES.symptoms2} alt="症状2" style={{ flex: 1, width: "50%", borderRadius: 12 }} />
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>MESSAGE</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>院長からのメッセージ</div>
            <div style={{ width: 40, height: 3, background: ORANGE, margin: "8px auto 0" }} />
          </div>
          <img src={IMAGES.message} alt="メッセージ" style={{ width: "100%", borderRadius: 16 }} />
        </div>

        <div style={{ background: GREEN, padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 8 }}>まずはお気軽にご予約ください</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 24 }}>初回体験コース ¥3,300〜</div>
          <button onClick={() => setScreen("auth")} style={{ padding: "18px 48px", borderRadius: 30, border: "none", background: ORANGE, color: "white", fontSize: 18, fontWeight: 700, cursor: "pointer" }}>
            オンライン予約する
          </button>
        </div>

        <div style={{ background: DARK, padding: "30px 20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <img src={IMAGES.footer} alt="フッター" style={{ width: "100%", borderRadius: 12, marginBottom: 20, opacity: 0.8 }} />
            <div style={{ textAlign: "center", fontSize: 11, color: "#666" }}>© 2024 整体院 癒楽里 All Rights Reserved.</div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "auth") {
    return (
      <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Noto Sans JP', sans-serif" }}>
        <Header showBack={true} />
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 8 }}>STEP 0</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: GREEN, marginBottom: 8 }}>ご登録方法を選んでください</div>
            <div style={{ fontSize: 13, color: "#888" }}>予約確認・リマインドの受け取り方法を選んでください</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { id: "line", icon: "💚", label: "LINEで登録する", desc: "LINEログインで簡単登録。確認・リマインドをLINEで受け取れます。", color: "#06C755" },
              { id: "email", icon: "📧", label: "メールで登録する", desc: "メールアドレスで登録。確認・リマインドをメールで受け取れます。", color: GREEN },
              { id: "sms", icon: "📱", label: "SMS（ショートメール）で登録する", desc: "携帯番号で登録。確認・リマインドをSMSで受け取れます。", color: ORANGE },
            ].map(m => (
              <button key={m.id} onClick={() => handleAuthSelect(m.id)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", borderRadius: 16, border: `2px solid ${m.color}30`, background: "white", cursor: "pointer", textAlign: "left", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 36, flexShrink: 0 }}>{m.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: m.color, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>{m.desc}</div>
                </div>
                <div style={{ color: "#aaa", fontSize: 18, flexShrink: 0 }}>›</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "register") {
    return (
      <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Noto Sans JP', sans-serif" }}>
        <Header showBack={true} />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 100px" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>お客様情報</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>お客様情報をご入力ください</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>初回のみ入力が必要です。次回からは自動入力されます。</div>
          </div>
          {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#cc4444" }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>お名前 <span style={{ color: ORANGE }}>*</span></label>
              <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="山田 花子"
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }}
                onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = "#e8ddd0"} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>フリガナ <span style={{ color: ORANGE }}>*</span></label>
              <input type="text" value={profile.kana} onChange={e => setProfile({ ...profile, kana: e.target.value })} placeholder="ヤマダ ハナコ"
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }}
                onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = "#e8ddd0"} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>携帯番号 <span style={{ color: ORANGE }}>*</span></label>
              <input type="tel" value={profile.tel} onChange={e => setProfile({ ...profile, tel: e.target.value })} placeholder="090-0000-0000"
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }}
                onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = "#e8ddd0"} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>メールアドレス <span style={{ color: ORANGE }}>*</span></label>
              <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="example@email.com"
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }}
                onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = "#e8ddd0"} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>郵便番号 <span style={{ color: ORANGE }}>*</span></label>
              <input type="text" value={profile.zipcode} maxLength={7} placeholder="1234567（ハイフンなし）"
                onChange={async (e) => {
                  const zip = e.target.value.replace(/[^0-9]/g, "");
                  setProfile({ ...profile, zipcode: zip });
                  if (zip.length === 7) {
                    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
                    const data = await res.json();
                    if (data.results) {
                      const r = data.results[0];
                      setProfile(p => ({ ...p, zipcode: zip, address: `${r.address1}${r.address2}${r.address3}` }));
                    }
                  }
                }}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }}
                onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = "#e8ddd0"} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>住所 <span style={{ color: ORANGE }}>*</span></label>
              <input type="text" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} placeholder="自動入力されます（番地・部屋番号を追加してください）"
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }}
                onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = "#e8ddd0"} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>生年月日 <span style={{ color: ORANGE }}>*</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={profile.birthYear} onChange={e => {
                  const y = e.target.value;
                  setProfile({ ...profile, birthYear: y, birthday: updateBirthday(y, profile.birthMonth, profile.birthDay) });
                }} style={{ flex: 2, padding: "12px 8px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white" }}>
                  <option value="">年</option>
                  {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
                <select value={profile.birthMonth} onChange={e => {
                  const m = e.target.value;
                  setProfile({ ...profile, birthMonth: m, birthday: updateBirthday(profile.birthYear, m, profile.birthDay) });
                }} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white" }}>
                  <option value="">月</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                </select>
                <select value={profile.birthDay} onChange={e => {
                  const d = e.target.value;
                  setProfile({ ...profile, birthDay: d, birthday: updateBirthday(profile.birthYear, profile.birthMonth, d) });
                }} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white" }}>
                  <option value="">日</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}日</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>ご来院歴</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["初めて","2回目以降"].map(v => (
                  <div key={v} onClick={() => setProfile({ ...profile, firstVisit: v })} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `2px solid ${profile.firstVisit === v ? GREEN : "#e8ddd0"}`, background: profile.firstVisit === v ? `${GREEN}10` : "white", textAlign: "center", cursor: "pointer", fontSize: 14, fontWeight: 700, color: profile.firstVisit === v ? GREEN : "#aaa" }}>{v}</div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>お悩み・ご要望（任意）</label>
              <textarea value={profile.notes} onChange={e => setProfile({ ...profile, notes: e.target.value })} placeholder="肩こりがひどく、特に右肩が気になります..." rows={3}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white", boxSizing: "border-box", outline: "none", resize: "none", fontFamily: "inherit" }}
                onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = "#e8ddd0"} />
            </div>

          </div>
        </div>
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderTop: `3px solid ${GREEN}20`, padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <button onClick={handleRegisterSubmit} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: GREEN, color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              次へ → 予約内容を選ぶ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "complete") {
    return (
      <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Noto Sans JP', sans-serif" }}>
        <Header showBack={true} />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🌿</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: GREEN, marginBottom: 8 }}>ご予約が完了しました！</div>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 32 }}>ありがとうございます</div>
          <div style={{ background: "white", borderRadius: 20, padding: "24px", marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: `2px solid ${LIGHT_GREEN}` }}>
            <div style={{ fontSize: 11, color: LIGHT_GREEN, marginBottom: 4 }}>予約番号</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: GREEN, letterSpacing: "0.1em" }}>{bookingNum}</div>
          </div>
          <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 28, textAlign: "left", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 12 }}>ご予約詳細</div>
            {[
              { label: "店舗", value: `癒楽里 ${store?.name}` },
              { label: "コース", value: course?.name },
              { label: "担当", value: staff?.name },
              { label: "日時", value: date && time ? `${date.getMonth()+1}月${date.getDate()}日（${DAYS_JP[date.getDay()]}） ${time}〜` : "" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", padding: "8px 0", borderBottom: i < 3 ? "1px solid #f0ebe4" : "none" }}>
                <div style={{ fontSize: 12, color: "#888", width: 60, flexShrink: 0 }}>{row.label}</div>
                <div style={{ fontSize: 13, color: DARK, fontWeight: 600 }}>{row.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 24, lineHeight: 1.8 }}>
            当日は予約時間の5分前にお越しください。<br/>キャンセル・変更は前日17時まで承ります。
          </div>
          <a href={store?.lineUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "15px", borderRadius: 14, background: "#06C755", color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none", marginBottom: 12, boxSizing: "border-box" }}>
            LINEでお問い合わせ・変更はこちら
          </a>
          <button onClick={reset} style={{ width: "100%", padding: "14px", borderRadius: 14, border: `2px solid ${GREEN}`, background: "white", color: GREEN, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>別の予約をする</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Noto Sans JP', sans-serif" }}>
      <Header showBack={true} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px 100px" }}>
        <div style={{ padding: "20px 0 8px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {bookingSteps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < bookingSteps.length - 1 ? 1 : "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, background: i < step ? GREEN : i === step ? ORANGE : "#e0d5c8", color: i <= step ? "white" : "#999" }}>{i < step ? "✓" : i+1}</div>
                {i < bookingSteps.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? GREEN : "#e0d5c8", margin: "0 2px" }} />}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9 }}>
            {bookingSteps.map((s, i) => <span key={i} style={{ color: i === step ? ORANGE : "#aaa", fontWeight: i === step ? 700 : 400 }}>{s}</span>)}
          </div>
        </div>

        {step === 0 && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>STEP 1</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>店舗を選んでください</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {STORES.map(s => (
                <div key={s.id} onClick={() => setStore(s)} style={{ background: store?.id === s.id ? `${GREEN}15` : "white", border: `2px solid ${store?.id === s.id ? GREEN : "#e8ddd0"}`, borderRadius: 16, padding: "20px 24px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={LOGO_URL} alt="ロゴ" style={{ height: 36, width: "auto" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>癒楽里 {s.name}</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.address}</div>
                      <div style={{ fontSize: 12, color: LIGHT_GREEN, marginTop: 2 }}>📞 {s.tel}</div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>🕐 {s.hours}</div>
                    </div>
                    {store?.id === s.id && <div style={{ color: GREEN, fontSize: 24 }}>✓</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>STEP 2</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>コースを選んでください</div>
            </div>
            {courses.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>読み込み中...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {courses.map(c => (
                  <div key={c.id} onClick={() => setCourse(c)} style={{ background: course?.id === c.id ? `${GREEN}15` : "white", border: `2px solid ${course?.id === c.id ? GREEN : "#e8ddd0"}`, borderRadius: 16, padding: "18px 20px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: GREEN }}>{c.name}</span>
                          {c.is_first_only && <span style={{ fontSize: 10, background: ORANGE, color: "white", borderRadius: 10, padding: "2px 8px", fontWeight: 700 }}>初回限定</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>{c.description}</div>
                      </div>
                      <div style={{ textAlign: "right", marginLeft: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: ORANGE }}>¥{c.price?.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>{c.duration}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>STEP 3</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>スタッフ・日時を選んでください</div>
            </div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${GREEN}20` }}>担当スタッフ</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[{ id: "any", name: "指名なし", title: "おまかせ" }, ...staffList].map(s => (
                  <div key={s.id} onClick={() => setStaff(s)} style={{ background: staff?.id === s.id ? `${GREEN}15` : "white", border: `2px solid ${staff?.id === s.id ? GREEN : "#e8ddd0"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "center", minWidth: 90 }}>
                    <div style={{ fontSize: 28 }}>👤</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: GREEN, marginTop: 4 }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: "#888" }}>{s.title}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${GREEN}20` }}>ご希望日</div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {dates.map((d, i) => {
                  const dayIdx = d.getDay();
                  const isSelected = date && d.toDateString() === date.toDateString();
                  return (
                    <div key={i} onClick={() => { setDate(d); if (store) fetchStoreSettings(store.id); }} style={{ background: isSelected ? GREEN : "white", border: `2px solid ${isSelected ? GREEN : "#e8ddd0"}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", textAlign: "center", flexShrink: 0, minWidth: 52 }}>
                      <div style={{ fontSize: 10, color: isSelected ? "rgba(255,255,255,0.8)" : dayIdx === 0 ? "#e07070" : dayIdx === 6 ? "#7090e0" : "#aaa" }}>{DAYS_JP[dayIdx]}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: isSelected ? "white" : DARK }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, color: isSelected ? "rgba(255,255,255,0.8)" : "#aaa" }}>{d.getMonth()+1}月</div>
                    </div>
                  );
                })}
              </div>
            </div>
            {date && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${GREEN}20` }}>ご希望時間</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TIME_SLOTS.map(t => {
                    const isSelected = time === t;
                    const disabled = isSlotDisabled(t);
                    return (
                      <div key={t} onClick={() => !disabled && setTime(t)} style={{ background: isSelected ? GREEN : disabled ? "#f0f0f0" : "white", border: `2px solid ${isSelected ? GREEN : disabled ? "#ddd" : "#e8ddd0"}`, borderRadius: 10, padding: "8px 14px", cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, color: isSelected ? "white" : disabled ? "#bbb" : DARK }}>
                        {t}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>STEP 4</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>ご予約内容を確認してください</div>
            </div>
            <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: `2px solid ${GREEN}20`, marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              {[
                { label: "店舗", value: `癒楽里 ${store?.name}` },
                { label: "コース", value: `${course?.name}（${course?.duration} / ¥${course?.price?.toLocaleString()}）` },
                { label: "担当", value: staff?.name },
                { label: "日時", value: date && time ? `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日（${DAYS_JP[date.getDay()]}） ${time}〜` : "" },
                { label: "お名前", value: profile.name },
                { label: "電話番号", value: profile.tel },
                { label: "通知方法", value: notificationMethod === "line" ? "LINE" : notificationMethod === "email" ? "メール" : "SMS" },
                profile.notes ? { label: "ご要望", value: profile.notes } : null,
              ].filter(Boolean).map((row, i) => (
                <div key={i} style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f0ebe4" }}>
                  <div style={{ fontSize: 12, color: "#888", fontWeight: 700, width: 80, flexShrink: 0 }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: DARK, flex: 1 }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20, lineHeight: 1.7, padding: "12px 16px", background: "white", borderRadius: 12 }}>
              キャンセル・変更は前日17時まで承ります。
            </div>
            {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#cc4444" }}>{error}</div>}
            <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "18px", borderRadius: 14, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "#aaa" : GREEN, color: "white", fontSize: 16, fontWeight: 700 }}>
              {loading ? "送信中..." : "✓ この内容で予約を確定する"}
            </button>
          </div>
        )}

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderTop: `3px solid ${GREEN}20`, padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", gap: 12 }}>
            {step > 0 && <button onClick={() => { setStep(step - 1); setDate(null); setTime(null); }} style={{ flex: 1, padding: "14px", borderRadius: 14, border: `2px solid ${GREEN}40`, background: "white", color: GREEN, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>← 戻る</button>}
            {step < 3 && <button onClick={() => { if (canNext()) { setDate(null); setTime(null); setStep(step + 1); } }} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: canNext() ? GREEN : "#e8ddd0", color: canNext() ? "white" : "#bbb", fontSize: 15, fontWeight: 700, cursor: canNext() ? "pointer" : "not-allowed" }}>次へ →</button>}
            {step === 3 && <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: ORANGE, color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>予約を確定する ✓</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
