"use client";
import { useState } from "react";
import { signIn, useSession } from "next-auth/react";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

const STORES = [
  { id: "minamiurawa", name: "南浦和店", address: "さいたま市南区南浦和2丁目", tel: "048-xxx-xxxx", hours: "10:00〜20:00（最終受付19:00）", lineUrl: "https://lin.ee/MINAMIURAWA" },
  { id: "toda", name: "戸田店", address: "戸田市○○○", tel: "048-yyy-yyyy", hours: "10:00〜20:00（最終受付19:00）", lineUrl: "https://lin.ee/TODA" },
];

const COURSES = [
  { id: "c1", name: "全身調整コース", duration: "60分", price: "¥6,600", desc: "全身のバランスを整える定番コース" },
  { id: "c2", name: "集中ケアコース", duration: "90分", price: "¥9,900", desc: "お悩みの箇所を重点的にケア" },
  { id: "c3", name: "首・肩 集中コース", duration: "45分", price: "¥4,950", desc: "首・肩こりに特化したコース" },
  { id: "c4", name: "腰痛改善コース", duration: "60分", price: "¥6,600", desc: "腰の痛みに特化したケア" },
  { id: "c5", name: "初回体験コース", duration: "60分", price: "¥3,300", desc: "初めての方限定・カウンセリング込み" },
];

const STAFFS = {
  minamiurawa: [
    { id: "s1", name: "田中 恵子", title: "院長", specialty: "産後ケア・骨盤矯正", img: "👩‍⚕️" },
    { id: "s2", name: "鈴木 大輔", title: "施術師", specialty: "スポーツ障害・腰痛", img: "👨‍⚕️" },
    { id: "s3", name: "山田 さくら", title: "施術師", specialty: "肩こり・頭痛", img: "👩‍⚕️" },
  ],
  toda: [
    { id: "s4", name: "佐藤 健一", title: "院長", specialty: "骨格矯正・姿勢改善", img: "👨‍⚕️" },
    { id: "s5", name: "中村 美咲", title: "施術師", specialty: "産後ケア・むくみ", img: "👩‍⚕️" },
  ],
};

const TIME_SLOTS = ["10:00","10:30","11:00","11:30","12:00","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00"];
const DAYS_JP = ["日","月","火","水","木","金","土"];

function generateDates() {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const steps = ["店舗選択","コース選択","スタッフ・日時","お客様情報","確認・完了"];

export default function App() {
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [store, setStore] = useState(null);
  const [course, setCourse] = useState(null);
  const [staff, setStaff] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [form, setForm] = useState({ name: session?.user?.name || "", kana: "", tel: "", email: session?.user?.email || "", firstVisit: "初めて", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [bookingNum, setBookingNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dates = generateDates();

  // LINEログインしていない場合はログイン画面を表示
  console.log("session:", JSON.stringify(session));
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #fdf9f4 0%, #f5ede0 50%, #edf5f0 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans JP', sans-serif" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🌿</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#3a5a3a", marginBottom: 8 }}>整体院 癒楽里</div>
          <div style={{ fontSize: 14, color: "#7a9a7a", marginBottom: 32 }}>ご予約にはLINEログインが必要です</div>
          <button onClick={() => signIn("line")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 32px", borderRadius: 14, border: "none", background: "#06C755", color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer", margin: "0 auto", boxShadow: "0 4px 16px rgba(6,199,85,0.35)" }}>
            <svg width="24" height="24" viewBox="0 0 40 40" fill="white"><path d="M20 4C11.16 4 4 10.28 4 18c0 6.48 4.56 12 11.04 14.08-.16.56-.96 3.44-1.12 3.92-.16.56.2.56.44.4.2-.12 3.12-2.08 4.4-2.92.4.04.8.08 1.24.08 8.84 0 16-6.28 16-14S28.84 4 20 4z"/></svg>
            LINEでログインして予約する
          </button>
        </div>
      </div>
    );
  }

  const canNext = () => {
    if (step === 0) return !!store;
    if (step === 1) return !!course;
    if (step === 2) return !!staff && !!date && !!time;
    if (step === 3) return form.name && form.kana && form.tel && form.email;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const num = "YR-" + Date.now().toString().slice(-6);
    try {
      const headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      };

      const searchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/customers?tel=eq.${form.tel}&select=id`,
        { headers }
      );
      const customers = await searchRes.json();
      let customerId;

      if (customers && customers.length > 0) {
        customerId = customers[0].id;
      } else {
        const newRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: form.name, kana: form.kana, tel: form.tel,
            email: form.email, points: 0,
            line_user_id: session?.lineUserId || null,
          }),
        });
        const newCustomer = await newRes.json();
        customerId = newCustomer[0]?.id;
      }

      await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_id: customerId,
          store_id: store.id,
          course_id: course.id,
          course_name: course.name,
          staff_id: staff.id,
          staff_name: staff.name,
          booking_date: formatDate(date),
          booking_time: time,
          status: "confirmed",
          notes: form.notes,
          booking_number: num,
        }),
      });

      setBookingNum(num);
      setSubmitted(true);
      setStep(4);
    } catch (e) {
      setBookingNum(num);
      setSubmitted(true);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0); setStore(null); setCourse(null); setStaff(null);
    setDate(null); setTime(null);
    setForm({ name: session?.user?.name || "", kana: "", tel: "", email: session?.user?.email || "", firstVisit: "初めて", notes: "" });
    setSubmitted(false); setBookingNum(""); setError("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #fdf9f4 0%, #f5ede0 50%, #edf5f0 100%)", fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif" }}>
      <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e8d9c8", padding: "16px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #8fbc8f, #5a9e7a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌿</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#3a5a3a", letterSpacing: "0.05em" }}>整体院 癒楽里</div>
            <div style={{ fontSize: 11, color: "#7a9a7a", letterSpacing: "0.1em" }}>YURARI SEITAI-IN</div>
          </div>
          {!submitted && <div style={{ marginLeft: "auto", fontSize: 12, color: "#888", background: "#f0ebe4", borderRadius: 20, padding: "4px 12px" }}>ご予約</div>}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px 80px" }}>
        {!submitted && (
          <div style={{ padding: "20px 0 8px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {steps.slice(0,4).map((s,i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, background: i < step ? "#5a9e7a" : i === step ? "#3a5a3a" : "#e0d5c8", color: i <= step ? "white" : "#999", transition: "all 0.3s" }}>{i < step ? "✓" : i+1}</div>
                  {i < 3 && <div style={{ flex: 1, height: 2, background: i < step ? "#5a9e7a" : "#e0d5c8", margin: "0 2px" }} />}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10 }}>
              {steps.slice(0,4).map((s,i) => <span key={i} style={{ color: i === step ? "#3a5a3a" : "#aaa", fontWeight: i === step ? 700 : 400 }}>{s}</span>)}
            </div>
          </div>
        )}

        {step === 0 && (
          <div style={{ paddingTop: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#3a5a3a", marginBottom: 6 }}>店舗を選んでください</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>ご希望の店舗をお選びください</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {STORES.map(s => (
                <div key={s.id} onClick={() => setStore(s)} style={{ background: store?.id === s.id ? "linear-gradient(135deg, #eaf5ec, #e0f0e8)" : "white", border: `2px solid ${store?.id === s.id ? "#5a9e7a" : "#e8ddd0"}`, borderRadius: 16, padding: "20px 24px", cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 32 }}>🏥</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#3a5a3a" }}>癒楽里 {s.name}</div>
                      <div style={{ fontSize: 12, color: "#7a9a7a", marginTop: 2 }}>{s.address}</div>
                      <div style={{ fontSize: 12, color: "#7a9a7a" }}>📞 {s.tel}</div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>🕐 {s.hours}</div>
                    </div>
                    {store?.id === s.id && <div style={{ color: "#5a9e7a", fontSize: 22 }}>✓</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ paddingTop: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#3a5a3a", marginBottom: 6 }}>コースを選んでください</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>施術メニューをお選びください</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {COURSES.map(c => (
                <div key={c.id} onClick={() => setCourse(c)} style={{ background: course?.id === c.id ? "linear-gradient(135deg, #eaf5ec, #e0f0e8)" : "white", border: `2px solid ${course?.id === c.id ? "#5a9e7a" : "#e8ddd0"}`, borderRadius: 14, padding: "16px 20px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#3a5a3a" }}>{c.name}</span>
                        {c.id === "c5" && <span style={{ fontSize: 10, background: "#ff8c69", color: "white", borderRadius: 10, padding: "2px 8px", fontWeight: 700 }}>初回限定</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#888" }}>{c.desc}</div>
                    </div>
                    <div style={{ textAlign: "right", marginLeft: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#5a9e7a" }}>{c.price}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{c.duration}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ paddingTop: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#3a5a3a", marginBottom: 20 }}>スタッフ・日時を選んでください</h2>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#5a9e7a", marginBottom: 10 }}>担当スタッフ</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[{ id: "any", name: "指名なし", title: "", specialty: "おまかせ", img: "🌿" }, ...(STAFFS[store?.id] || [])].map(s => (
                  <div key={s.id} onClick={() => setStaff(s)} style={{ background: staff?.id === s.id ? "linear-gradient(135deg, #eaf5ec, #e0f0e8)" : "white", border: `2px solid ${staff?.id === s.id ? "#5a9e7a" : "#e8ddd0"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "center", minWidth: 100 }}>
                    <div style={{ fontSize: 28 }}>{s.img}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a", marginTop: 4 }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: "#7a9a7a" }}>{s.title}</div>
                    <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{s.specialty}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#5a9e7a", marginBottom: 10 }}>ご希望日</div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {dates.map((d, i) => {
                  const dayIdx = d.getDay();
                  const isSelected = date && d.toDateString() === date.toDateString();
                  return (
                    <div key={i} onClick={() => setDate(d)} style={{ background: isSelected ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "white", border: `2px solid ${isSelected ? "#5a9e7a" : "#e8ddd0"}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", textAlign: "center", flexShrink: 0, minWidth: 52 }}>
                      <div style={{ fontSize: 10, color: isSelected ? "rgba(255,255,255,0.8)" : dayIdx === 0 ? "#e07070" : dayIdx === 6 ? "#7090e0" : "#aaa" }}>{DAYS_JP[dayIdx]}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: isSelected ? "white" : "#3a5a3a" }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, color: isSelected ? "rgba(255,255,255,0.8)" : "#aaa" }}>{d.getMonth()+1}月</div>
                    </div>
                  );
                })}
              </div>
            </div>
            {date && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#5a9e7a", marginBottom: 10 }}>ご希望時間</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TIME_SLOTS.map(t => {
                    const unavailable = ["11:00","14:30","17:00"].includes(t);
                    const isSelected = time === t;
                    return (
                      <div key={t} onClick={() => !unavailable && setTime(t)} style={{ background: unavailable ? "#f5f0eb" : isSelected ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "white", border: `2px solid ${unavailable ? "#e8ddd0" : isSelected ? "#5a9e7a" : "#e8ddd0"}`, borderRadius: 10, padding: "8px 14px", cursor: unavailable ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, color: unavailable ? "#ccc" : isSelected ? "white" : "#3a5a3a" }}>
                        {t}{unavailable && <div style={{ fontSize: 9, color: "#ccc", textAlign: "center" }}>×</div>}
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
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#3a5a3a", marginBottom: 20 }}>お客様情報をご入力ください</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "お名前", key: "name", placeholder: "山田 花子", required: true },
                { label: "フリガナ", key: "kana", placeholder: "ヤマダ ハナコ", required: true },
                { label: "電話番号", key: "tel", placeholder: "090-0000-0000", required: true, type: "tel" },
                { label: "メールアドレス", key: "email", placeholder: "example@email.com", required: true, type: "email" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>{f.label} {f.required && <span style={{ color: "#e07070" }}>*</span>}</label>
                  <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: "#3a5a3a", background: "white", boxSizing: "border-box", outline: "none" }}
                    onFocus={e => e.target.style.borderColor = "#5a9e7a"} onBlur={e => e.target.style.borderColor = "#e8ddd0"} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>ご来院歴</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["初めて","2回目以降"].map(v => (
                    <div key={v} onClick={() => setForm({ ...form, firstVisit: v })} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `2px solid ${form.firstVisit === v ? "#5a9e7a" : "#e8ddd0"}`, background: form.firstVisit === v ? "linear-gradient(135deg, #eaf5ec, #e0f0e8)" : "white", textAlign: "center", cursor: "pointer", fontSize: 14, fontWeight: 700, color: form.firstVisit === v ? "#3a5a3a" : "#aaa" }}>{v}</div>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a9e7a", display: "block", marginBottom: 6 }}>お悩み・ご要望（任意）</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="肩こりがひどく、特に右肩が気になります..." rows={3}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: "#3a5a3a", background: "white", boxSizing: "border-box", outline: "none", resize: "none", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#5a9e7a"} onBlur={e => e.target.style.borderColor = "#e8ddd0"} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && !submitted && (
          <div style={{ paddingTop: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#3a5a3a", marginBottom: 6 }}>ご予約内容を確認してください</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>内容をご確認の上、予約を確定してください</p>
            <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid #e8ddd0", marginBottom: 20 }}>
              {[
                { label: "店舗", value: `癒楽里 ${store?.name}` },
                { label: "コース", value: `${course?.name}（${course?.duration} / ${course?.price}）` },
                { label: "担当", value: staff?.name },
                { label: "日時", value: date && time ? `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日（${DAYS_JP[date.getDay()]}） ${time}〜` : "" },
                { label: "お名前", value: form.name },
                { label: "電話番号", value: form.tel },
                { label: "メール", value: form.email },
                { label: "ご来院歴", value: form.firstVisit },
                form.notes ? { label: "ご要望", value: form.notes } : null,
              ].filter(Boolean).map((row, i) => (
                <div key={i} style={{ display: "flex", padding: "10px 0", borderBottom: i < 7 ? "1px solid #f0ebe4" : "none" }}>
                  <div style={{ fontSize: 12, color: "#7a9a7a", fontWeight: 700, width: 80, flexShrink: 0 }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: "#3a5a3a", flex: 1 }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20, lineHeight: 1.7, padding: "12px 16px", background: "#fdf9f4", borderRadius: 12 }}>
              キャンセル・変更は前日17時まで承ります。
            </div>
            {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#cc4444" }}>{error}</div>}
            <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "#aaa" : "linear-gradient(135deg, #5a9e7a, #3a7a5a)", color: "white", fontSize: 16, fontWeight: 700, letterSpacing: "0.05em", boxShadow: "0 4px 20px rgba(90,158,122,0.35)" }}>
              {loading ? "送信中..." : "✓ この内容で予約を確定する"}
            </button>
          </div>
        )}

        {step === 4 && submitted && (
          <div style={{ paddingTop: 40, textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🌿</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#3a5a3a", marginBottom: 8 }}>ご予約が完了しました！</div>
            <div style={{ fontSize: 14, color: "#7a9a7a", marginBottom: 24 }}>ありがとうございます</div>
            <div style={{ background: "linear-gradient(135deg, #eaf5ec, #e0f0e8)", borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "inline-block", minWidth: 240 }}>
              <div style={{ fontSize: 11, color: "#7a9a7a", marginBottom: 4 }}>予約番号</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#3a5a3a", letterSpacing: "0.1em" }}>{bookingNum}</div>
            </div>
            <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid #e8ddd0", marginBottom: 28, textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#3a5a3a", marginBottom: 12 }}>ご予約詳細</div>
              {[
                { label: "店舗", value: `癒楽里 ${store?.name}` },
                { label: "コース", value: course?.name },
                { label: "担当", value: staff?.name },
                { label: "日時", value: date && time ? `${date.getMonth()+1}月${date.getDate()}日（${DAYS_JP[date.getDay()]}） ${time}〜` : "" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", padding: "8px 0", borderBottom: i < 3 ? "1px solid #f0ebe4" : "none" }}>
                  <div style={{ fontSize: 12, color: "#7a9a7a", width: 60, flexShrink: 0 }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: "#3a5a3a" }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20, lineHeight: 1.8 }}>
              当日は予約時間の5分前にお越しください。<br/>キャンセル・変更は前日17時まで承ります。
            </div>
            <a href={store?.lineUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "15px", borderRadius: 14, cursor: "pointer", background: "#06C755", color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none", marginBottom: 12, boxSizing: "border-box", boxShadow: "0 4px 16px rgba(6,199,85,0.35)" }}>
              <svg width="20" height="20" viewBox="0 0 40 40" fill="white"><path d="M20 4C11.16 4 4 10.28 4 18c0 6.48 4.56 12 11.04 14.08-.16.56-.96 3.44-1.12 3.92-.16.56.2.56.44.4.2-.12 3.12-2.08 4.4-2.92.4.04.8.08 1.24.08 8.84 0 16-6.28 16-14S28.84 4 20 4z"/></svg>
              LINEでお問い合わせ・変更はこちら
            </a>
            <button onClick={reset} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "2px solid #5a9e7a", background: "white", color: "#5a9e7a", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>別の予約をする</button>
          </div>
        )}

        {!submitted && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid #e8ddd0", padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
            <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", gap: 12 }}>
              {step > 0 && <button onClick={() => setStep(step - 1)} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>← 戻る</button>}
              {step < 3 && <button onClick={() => canNext() && setStep(step + 1)} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: canNext() ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "#e8ddd0", color: canNext() ? "white" : "#bbb", fontSize: 15, fontWeight: 700, cursor: canNext() ? "pointer" : "not-allowed" }}>次へ →</button>}
              {step === 3 && <button onClick={() => canNext() && setStep(4)} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: canNext() ? "linear-gradient(135deg, #5a9e7a, #3a7a5a)" : "#e8ddd0", color: canNext() ? "white" : "#bbb", fontSize: 15, fontWeight: 700, cursor: canNext() ? "pointer" : "not-allowed" }}>確認画面へ →</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
