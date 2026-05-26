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

const IMAGES = {
  hero: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/top/mainimg.webp",
  features: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/top/features.png",
  symptoms1: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/top/symptoms1.png",
  symptoms2: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/top/symptoms2.png",
  message: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/top/message.png",
  footer: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/common/foot4.jpg",
  flow: "https://seitai-yurari.com/wp-content/uploads/2024/06/flow07.png",
};

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

const steps = ["店舗選択","コース選択","スタッフ・日時","お客様情報","確認"];

export default function App() {
  const { data: session } = useSession();
  const [step, setStep] = useState(-1);
  const [store, setStore] = useState(null);
  const [course, setCourse] = useState(null);
  const [staff, setStaff] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [form, setForm] = useState({ name: "", kana: "", tel: "", email: "", firstVisit: "初めて", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [bookingNum, setBookingNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const dates = generateDates();

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (store) fetchStaff(store.id);
  }, [store]);

  useEffect(() => {
    if (session) {
      setForm(f => ({
        ...f,
        name: f.name || session?.user?.name || "",
        email: f.email || session?.user?.email || "",
      }));
    }
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
      const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?tel=eq.${form.tel}&select=id`, { headers });
      const customers = await searchRes.json();
      let customerId;
      if (customers && customers.length > 0) {
        customerId = customers[0].id;
      } else {
        const newRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
          method: "POST", headers,
          body: JSON.stringify({ name: form.name, kana: form.kana, tel: form.tel, email: form.email, points: 0, line_user_id: session?.lineUserId || null }),
        });
        const newCustomer = await newRes.json();
        customerId = newCustomer[0]?.id;
      }
      await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        method: "POST", headers,
        body: JSON.stringify({ customer_id: customerId, store_id: store.id, course_id: course.id, course_name: course.name, staff_id: staff.id, staff_name: staff.name, booking_date: formatDate(date), booking_time: time, status: "confirmed", notes: form.notes, booking_number: num }),
      });
      setBookingNum(num);
      setSubmitted(true);
      setStep(5);
    } catch (e) {
      setBookingNum(num);
      setSubmitted(true);
      setStep(5);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(-1); setStore(null); setCourse(null); setStaff(null);
    setDate(null); setTime(null);
    setForm({ name: "", kana: "", tel: "", email: "", firstVisit: "初めて", notes: "" });
    setSubmitted(false); setBookingNum(""); setError("");
  };

  const GREEN = "#2d6a4f";
  const LIGHT_GREEN = "#52b788";
  const ORANGE = "#e07b39";
  const CREAM = "#fdf8f0";
  const DARK = "#1a1a1a";

  // トップページ
  if (step === -1) {
    return (
      <div style={{ fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif", background: CREAM, minHeight: "100vh" }}>
        {/* ヘッダー */}
        <div style={{ background: "white", borderBottom: `3px solid ${GREEN}`, padding: "12px 20px", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src="https://seitai-yurari.com/wp-content/uploads/2025/11/logo.webp" alt="癒楽里ロゴ" style={{ height: 44, width: "auto" }} />
            </div>
            <button onClick={() => session ? setStep(0) : signIn("line")} style={{ padding: "10px 20px", borderRadius: 25, border: "none", background: ORANGE, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 12px rgba(224,123,57,0.4)" }}>
              ご予約はこちら
            </button>
          </div>
        </div>

        {/* ヒーローセクション */}
        <div style={{ position: "relative", height: 420, overflow: "hidden" }}>
          <img src={IMAGES.hero} alt="癒楽里" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 20 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {["歪み", "痛み", "痺れ"].map(t => (
                <div key={t} style={{ background: GREEN, color: "white", padding: "4px 16px", borderRadius: 4, fontSize: 16, fontWeight: 700 }}>{t}</div>
              ))}
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, color: ORANGE, textShadow: "2px 2px 8px rgba(0,0,0,0.5)", marginBottom: 12, lineHeight: 1.1 }}>根本改善へ</div>
            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 12, padding: "10px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: DARK, fontWeight: 700 }}>
                <span style={{ color: "#4285f4", fontWeight: 900 }}>G</span>
                <span style={{ color: "#ea4335", fontWeight: 900 }}>o</span>
                <span style={{ color: "#fbbc05", fontWeight: 900 }}>o</span>
                <span style={{ color: "#4285f4", fontWeight: 900 }}>g</span>
                <span style={{ color: "#34a853", fontWeight: 900 }}>l</span>
                <span style={{ color: "#ea4335", fontWeight: 900 }}>e</span>
                　口コミ評価　<span style={{ fontSize: 20, color: ORANGE, fontWeight: 900 }}>4.9</span>
              </div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>多数のお喜びの声を頂いております！</div>
            </div>
            <button onClick={() => session ? setStep(0) : signIn("line")} style={{ padding: "16px 40px", borderRadius: 30, border: "none", background: ORANGE, color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(224,123,57,0.5)" }}>
              今すぐ予約する →
            </button>
          </div>
        </div>

        {/* 店舗情報 */}
        <div style={{ background: GREEN, padding: "20px", color: "white" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", gap: 12, flexWrap: "wrap" }}>
            {STORES.map(s => (
              <div key={s.id} style={{ flex: 1, minWidth: 240, background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>SHOP</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>癒楽里 {s.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>📞 {s.tel}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>🕐 {s.hours}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 当院の特徴 */}
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>FEATURES</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>癒楽里の特徴</div>
            <div style={{ width: 40, height: 3, background: ORANGE, margin: "8px auto 0" }} />
          </div>
          <img src={IMAGES.features} alt="特徴" style={{ width: "100%", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
        </div>

        {/* 症状 */}
        <div style={{ background: "white", padding: "40px 20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>SYMPTOMS</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>こんなお悩みありませんか？</div>
              <div style={{ width: 40, height: 3, background: ORANGE, margin: "8px auto 0" }} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <img src={IMAGES.symptoms1} alt="症状1" style={{ flex: 1, width: "50%", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} />
              <img src={IMAGES.symptoms2} alt="症状2" style={{ flex: 1, width: "50%", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} />
            </div>
          </div>
        </div>

        {/* 院長メッセージ */}
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>MESSAGE</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>院長からのメッセージ</div>
            <div style={{ width: 40, height: 3, background: ORANGE, margin: "8px auto 0" }} />
          </div>
          <img src={IMAGES.message} alt="メッセージ" style={{ width: "100%", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
        </div>

        {/* 予約ボタン */}
        <div style={{ background: GREEN, padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 8 }}>まずはお気軽にご予約ください</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 24 }}>初回体験コース ¥3,300〜</div>
          <button onClick={() => session ? setStep(0) : signIn("line")} style={{ padding: "18px 48px", borderRadius: 30, border: "none", background: ORANGE, color: "white", fontSize: 18, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(224,123,57,0.5)" }}>
            オンライン予約する
          </button>
        </div>

        {/* フッター */}
        <div style={{ background: DARK, padding: "30px 20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <img src={IMAGES.footer} alt="フッター" style={{ width: "100%", borderRadius: 12, marginBottom: 20, opacity: 0.8 }} />
            <div style={{ textAlign: "center", fontSize: 11, color: "#666" }}>© 2024 整体院 癒楽里 All Rights Reserved.</div>
          </div>
        </div>
      </div>
    );
  }

  // 予約完了ページ
  if (step === 5) {
    return (
      <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Noto Sans JP', sans-serif" }}>
        <div style={{ background: "white", borderBottom: `3px solid ${GREEN}`, padding: "12px 20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🌿</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: GREEN }}>整体院 癒楽里</div>
          </div>
        </div>
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
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif" }}>
      {/* ヘッダー */}
      <div style={{ background: "white", borderBottom: `3px solid ${GREEN}`, padding: "12px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={reset} style={{ border: "none", background: "none", cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🌿</div>
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: GREEN }}>整体院 癒楽里</div>
            <div style={{ fontSize: 10, color: "#888" }}>オンライン予約</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px 100px" }}>
        {/* ステッパー */}
        <div style={{ padding: "20px 0 8px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, background: i < step ? GREEN : i === step ? ORANGE : "#e0d5c8", color: i <= step ? "white" : "#999", transition: "all 0.3s" }}>{i < step ? "✓" : i+1}</div>
                {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? GREEN : "#e0d5c8", margin: "0 2px" }} />}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9 }}>
            {steps.map((s, i) => <span key={i} style={{ color: i === step ? ORANGE : "#aaa", fontWeight: i === step ? 700 : 400 }}>{s}</span>)}
          </div>
        </div>

        {/* Step 0: 店舗選択 */}
        {step === 0 && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>STEP 1</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>店舗を選んでください</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {STORES.map(s => (
                <div key={s.id} onClick={() => setStore(s)} style={{ background: store?.id === s.id ? `linear-gradient(135deg, ${GREEN}15, ${LIGHT_GREEN}20)` : "white", border: `2px solid ${store?.id === s.id ? GREEN : "#e8ddd0"}`, borderRadius: 16, padding: "20px 24px", cursor: "pointer", transition: "all 0.2s", boxShadow: store?.id === s.id ? `0 4px 20px ${GREEN}20` : "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 36 }}>🏥</div>
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

        {/* Step 1: コース選択 */}
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
                  <div key={c.id} onClick={() => setCourse(c)} style={{ background: course?.id === c.id ? `linear-gradient(135deg, ${GREEN}15, ${LIGHT_GREEN}20)` : "white", border: `2px solid ${course?.id === c.id ? GREEN : "#e8ddd0"}`, borderRadius: 16, padding: "18px 20px", cursor: "pointer", boxShadow: course?.id === c.id ? `0 4px 20px ${GREEN}20` : "0 2px 8px rgba(0,0,0,0.06)" }}>
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

        {/* Step 2: スタッフ・日時 */}
        {step === 2 && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>STEP 3</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>スタッフ・日時を選んでください</div>
            </div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${GREEN}20` }}>担当スタッフ</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[{ id: "any", name: "指名なし", title: "おまかせ", specialty: "" }, ...staffList].map(s => (
                  <div key={s.id} onClick={() => setStaff(s)} style={{ background: staff?.id === s.id ? `linear-gradient(135deg, ${GREEN}15, ${LIGHT_GREEN}20)` : "white", border: `2px solid ${staff?.id === s.id ? GREEN : "#e8ddd0"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "center", minWidth: 90, boxShadow: staff?.id === s.id ? `0 4px 16px ${GREEN}20` : "0 2px 6px rgba(0,0,0,0.06)" }}>
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
                    <div key={i} onClick={() => setDate(d)} style={{ background: isSelected ? GREEN : "white", border: `2px solid ${isSelected ? GREEN : "#e8ddd0"}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", textAlign: "center", flexShrink: 0, minWidth: 52, boxShadow: isSelected ? `0 4px 16px ${GREEN}40` : "0 2px 6px rgba(0,0,0,0.06)" }}>
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
                    return (
                      <div key={t} onClick={() => setTime(t)} style={{ background: isSelected ? GREEN : "white", border: `2px solid ${isSelected ? GREEN : "#e8ddd0"}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: isSelected ? "white" : DARK, boxShadow: isSelected ? `0 4px 12px ${GREEN}40` : "0 1px 4px rgba(0,0,0,0.06)" }}>
                        {t}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: お客様情報 */}
        {step === 3 && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>STEP 4</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>お客様情報をご入力ください</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "お名前", key: "name", placeholder: "山田 花子", required: true },
                { label: "フリガナ", key: "kana", placeholder: "ヤマダ ハナコ", required: true },
                { label: "電話番号", key: "tel", placeholder: "090-0000-0000", required: true, type: "tel" },
                { label: "メールアドレス", key: "email", placeholder: "example@email.com", required: true, type: "email" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>{f.label} {f.required && <span style={{ color: ORANGE }}>*</span>}</label>
                  <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `2px solid #e8ddd0`, fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }}
                    onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = "#e8ddd0"} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>ご来院歴</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["初めて","2回目以降"].map(v => (
                    <div key={v} onClick={() => setForm({ ...form, firstVisit: v })} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `2px solid ${form.firstVisit === v ? GREEN : "#e8ddd0"}`, background: form.firstVisit === v ? `${GREEN}10` : "white", textAlign: "center", cursor: "pointer", fontSize: 14, fontWeight: 700, color: form.firstVisit === v ? GREEN : "#aaa" }}>{v}</div>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>お悩み・ご要望（任意）</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="肩こりがひどく、特に右肩が気になります..." rows={3}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white", boxSizing: "border-box", outline: "none", resize: "none", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = GREEN} onBlur={e => e.target.style.borderColor = "#e8ddd0"} />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: 確認 */}
        {step === 4 && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: LIGHT_GREEN, letterSpacing: "0.2em", marginBottom: 4 }}>STEP 5</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>ご予約内容を確認してください</div>
            </div>
            <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: `2px solid ${GREEN}20`, marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              {[
                { label: "店舗", value: `癒楽里 ${store?.name}` },
                { label: "コース", value: `${course?.name}（${course?.duration} / ¥${course?.price?.toLocaleString()}）` },
                { label: "担当", value: staff?.name },
                { label: "日時", value: date && time ? `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日（${DAYS_JP[date.getDay()]}） ${time}〜` : "" },
                { label: "お名前", value: form.name },
                { label: "電話番号", value: form.tel },
                { label: "メール", value: form.email },
                { label: "ご来院歴", value: form.firstVisit },
                form.notes ? { label: "ご要望", value: form.notes } : null,
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
            <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "18px", borderRadius: 14, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "#aaa" : `linear-gradient(135deg, ${GREEN}, #1b4332)`, color: "white", fontSize: 16, fontWeight: 700, letterSpacing: "0.05em", boxShadow: `0 4px 20px ${GREEN}50` }}>
              {loading ? "送信中..." : "✓ この内容で予約を確定する"}
            </button>
          </div>
        )}

        {/* ナビゲーション */}
        {step >= 0 && step <= 4 && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderTop: `3px solid ${GREEN}20`, padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
            <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", gap: 12 }}>
              {step > 0 && <button onClick={() => setStep(step - 1)} style={{ flex: 1, padding: "14px", borderRadius: 14, border: `2px solid ${GREEN}40`, background: "white", color: GREEN, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>← 戻る</button>}
              {step < 4 && <button onClick={() => canNext() && setStep(step + 1)} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: canNext() ? `linear-gradient(135deg, ${GREEN}, #1b4332)` : "#e8ddd0", color: canNext() ? "white" : "#bbb", fontSize: 15, fontWeight: 700, cursor: canNext() ? "pointer" : "not-allowed", boxShadow: canNext() ? `0 4px 16px ${GREEN}40` : "none" }}>次へ →</button>}
              {step === 4 && <button onClick={() => canNext() && handleSubmit()} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: canNext() ? `linear-gradient(135deg, ${ORANGE}, #c4612a)` : "#e8ddd0", color: canNext() ? "white" : "#bbb", fontSize: 15, fontWeight: 700, cursor: canNext() ? "pointer" : "not-allowed" }}>予約を確定する ✓</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
