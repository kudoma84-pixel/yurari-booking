"use client";
import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

const STORES = [
  { id: "minamiurawa", name: "南浦和本院", address: "埼玉県さいたま市南区文蔵2-17-6", tel: "048-762-8333", hours: "10:00〜19:30（最終受付19:00）", lineUrl: "https://lin.ee/MINAMIURAWA" },
  { id: "toda", name: "戸田院", address: "埼玉県戸田市新曽736-1", tel: "048-287-3318", hours: "10:00〜19:30（最終受付19:00）", lineUrl: "https://lin.ee/TODA" },
];

const TIME_SLOTS = ["10:00","10:30","11:00","11:30","12:00","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00"];
const DAYS_JP = ["日","月","火","水","木","金","土"];
const LOGO_URL = "https://seitai-yurari.com/wp-content/uploads/2025/11/logo.webp";

const IMAGES = {
  hero: "https://seitai-yurari.com/wp-content/themes/lightning_child/img/top/mainimg.webp",
};

const GREEN = "#2d6a4f";
const LIGHT_GREEN = "#52b788";
const ORANGE = "#e07b39";
const CREAM = "#fdf8f0";
const DARK = "#1a1a1a";

function formatDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

const bookingSteps = ["店舗選択","コース選択","スタッフ・日時","確認"];

function AppInner() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const changeBookingId = searchParams?.get('change');
  const notifyFromUrl = searchParams?.get('notify');

  // NextAuthのLINEログイン復帰中（?notify=line）はローディング表示
  const [screen, setScreen] = useState(notifyFromUrl === 'line' ? "loading" : "top");
  const [notificationMethod, setNotificationMethod] = useState(null);
  const [step, setStep] = useState(0);
  const [store, setStore] = useState(null);
  const [course, setCourse] = useState(null);
  const [courseCategory, setCourseCategory] = useState(null);
  const [courseVisitType, setCourseVisitType] = useState(null);
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
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [staffShiftDates, setStaffShiftDates] = useState({});
  const [bookedSlots, setBookedSlots] = useState([]);
  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  useEffect(() => { fetchCourses(); }, []);

  // NextAuth LINE復帰処理：?notify=line で戻った後、セッションが確立したら顧客照合へ
  useEffect(() => {
    if (notifyFromUrl !== 'line') return;
    setNotificationMethod('line');
    if (sessionStatus === 'loading') return; // セッション確立待ち
    if (sessionStatus === 'unauthenticated' || !session?.lineUserId) {
      setScreen("auth");
      alert("LINEログインに失敗しました。もう一度お試しください。");
      return;
    }
    checkExistingCustomer();
  }, [notifyFromUrl, session, sessionStatus]);

  useEffect(() => {
    if (notifyFromUrl === 'line') return; // NextAuth LINE復帰時はスキップ（上のuseEffectに任せる）
    const customerId = localStorage.getItem('yurari_customer_id');
    const expire = localStorage.getItem('yurari_login_expire');
    const lineUserId = localStorage.getItem('yurari_line_user_id');
    if (customerId && expire && Date.now() < parseInt(expire) && !changeBookingId) {
      const fetchMyPageCustomer = async () => {
        const res = await fetch(SUPABASE_URL + "/rest/v1/customers?id=eq." + customerId + "&select=*", {
          headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
        });
        const data = await res.json();
        if (data && data[0]) {
          const c = data[0];
          setProfile({
            name: c.name || "", kana: c.kana || "",
            tel: c.tel || "", email: c.email || "",
            address: c.address || "", zipcode: c.zipcode || "",
            birthYear: "", birthMonth: "", birthDay: "",
            birthday: c.birthday || "", firstVisit: "2回目以降", notes: "",
          });
          setExistingCustomer(c);
          setNotificationMethod(c.notification_method || "email");
          setScreen("booking");
        }
      };
      fetchMyPageCustomer();
    } else if (lineUserId && !changeBookingId) {
      const fetchLineCustomer = async () => {
        const res = await fetch(SUPABASE_URL + "/rest/v1/customers?line_user_id=eq." + lineUserId + "&select=*", {
          headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
        });
        const data = await res.json();
        if (data && data[0]) {
          const c = data[0];
          setProfile({
            name: c.name || "", kana: c.kana || "",
            tel: c.tel || "", email: c.email || "",
            address: c.address || "", zipcode: c.zipcode || "",
            birthYear: "", birthMonth: "", birthDay: "",
            birthday: c.birthday || "", firstVisit: "2回目以降", notes: "",
          });
          setExistingCustomer(c);
          setNotificationMethod("line");
          localStorage.setItem('yurari_customer_id', c.id);
          localStorage.setItem('yurari_login_expire', Date.now() + 7 * 24 * 60 * 60 * 1000);
          setScreen("booking");
        }
      };
      fetchLineCustomer();
    }
  }, []);

  useEffect(() => {
    if (store) { fetchStaff(store.id); fetchStoreSettings(store.id); }
  }, [store]);

  useEffect(() => {
    if (staff && store) fetchStaffShifts(staff.id, store.id);
  }, [staff, store]);


  useEffect(() => {
    if (changeBookingId) {
      setNotificationMethod("email");
      const fetchBookingCustomer = async () => {
        const res = await fetch(SUPABASE_URL + "/rest/v1/bookings?id=eq." + changeBookingId + "&select=*,customers(*)", {
          headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
        });
        const data = await res.json();
        if (data && data[0]?.customers) {
          const c = data[0].customers;
          setProfile({
            name: c.name || "", kana: c.kana || "",
            tel: c.tel || "", email: c.email || "",
            address: c.address || "", zipcode: c.zipcode || "",
            birthYear: "", birthMonth: "", birthDay: "",
            birthday: c.birthday || "", firstVisit: "2回目以降", notes: "",
          });
          setExistingCustomer(c);
          setNotificationMethod(c.notification_method || "email");
        }
      };
      fetchBookingCustomer();
      setScreen("booking");
    }
  }, [changeBookingId]);

  const fetchCourses = async () => {
    const res = await fetch(SUPABASE_URL + "/rest/v1/course_menus?is_active=eq.true&order=sort_order.asc", { headers });
    const data = await res.json();
    setCourses(Array.isArray(data) ? data : []);
  };

  const fetchStaff = async (storeId) => {
    const res = await fetch(SUPABASE_URL + "/rest/v1/staff_members?store_id=eq." + storeId + "&is_active=eq.true&order=sort_order.asc", { headers });
    const data = await res.json();
    setStaffList(Array.isArray(data) ? data : []);
  };

  const fetchStoreSettings = async (storeId) => {
    const res = await fetch(SUPABASE_URL + "/rest/v1/store_settings?store_id=eq." + storeId, { headers });
    const data = await res.json();
    if (data[0]) setSameDayLeadTime(data[0].same_day_lead_time);
  };

  const fetchBookedSlots = async (staffId, storeId, dateStr) => {
    const query = staffId === "any"
      ? `${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${storeId}&booking_date=eq.${dateStr}&status=in.(confirmed,received,treatment_done)&select=booking_time,course_id`
      : `${SUPABASE_URL}/rest/v1/bookings?store_id=eq.${storeId}&staff_id=eq.${staffId}&booking_date=eq.${dateStr}&status=in.(confirmed,received,treatment_done)&select=booking_time,course_id`;
    const res = await fetch(query, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
    });
    const data = await res.json();

    
    // time_extensionsを取得（休憩解放情報）
    const extRes = await fetch(
      `${SUPABASE_URL}/rest/v1/time_extensions?store_id=eq.${storeId}&extension_date=eq.${dateStr}&order=created_at.desc&limit=1`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY } }
    );
    const extData = await extRes.json();
    const ext = Array.isArray(extData) && extData.length > 0 ? extData[0] : null;

    const blocked = new Set();

    // 休憩時間（13:30〜14:30）をデフォルトでブロック、解放されていれば除外
    if (!ext?.break_released_1330) blocked.add("13:30");
    if (!ext?.break_released_1400) blocked.add("14:00");
    if (!ext?.break_released_1430) blocked.add("14:30");

    if (!Array.isArray(data)) { setBookedSlots([...blocked]); return; }

    // 予約済みスロットをブロック（所要時間分）
    for (const b of data) {
      const courseInfo = courses.find(c => c.id === b.course_id);
      const durationStr = courseInfo?.duration || "30分";
      const durationMin = parseInt(durationStr.replace(/[^0-9]/g, "")) || 30;
      const slots = durationMin / 30;
      const startIdx = TIME_SLOTS.indexOf(b.booking_time);
      if (startIdx >= 0) {
        for (let i = 0; i < slots; i++) {
          if (TIME_SLOTS[startIdx + i]) blocked.add(TIME_SLOTS[startIdx + i]);
        }
      }
    }
    // blocksを取得（ブロック情報）
    const blockRes = await fetch(
      `${SUPABASE_URL}/rest/v1/blocks?store_id=eq.${storeId}&block_date=eq.${dateStr}`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY } }
    );
    const blocksData = await blockRes.json();
    if (Array.isArray(blocksData)) {
      blocksData.forEach(b => {
        if (staffId === "any" || b.staff_id === staffId || b.staff_id === "all") {
          const t = b.block_time?.slice(0, 5);
          if (t) blocked.add(t);
        }
      });
    }

    setBookedSlots([...blocked]);
  };
  const fetchStaffShifts = async (staffId, storeId) => {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2);
    const from = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-01";
    const toYear = maxDate.getFullYear();
    const toMonth = maxDate.getMonth();
    const toDay = new Date(toYear, toMonth + 1, 0).getDate();
    const to = toYear + "-" + String(toMonth+1).padStart(2,"0") + "-" + String(toDay).padStart(2,"0");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/shifts?store_id=eq.${storeId}&work_date=gte.${from}&work_date=lte.${to}`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
    });
    const data = await res.json();
    const shifts = Array.isArray(data) ? data : [];

    const dateMap = {};
    if (staffId === "any") {
      // 指名なし：アクティブスタッフが1人でも出勤している日はON
      const activeStaffRes = await fetch(`${SUPABASE_URL}/rest/v1/staff_members?store_id=eq.${storeId}&is_active=eq.true`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
      });
      const activeStaff = await activeStaffRes.json();
      const activeIds = activeStaff.map(s => s.id);
      shifts.filter(s => activeIds.includes(s.staff_id)).forEach(s => {
        dateMap[s.work_date] = "on";
      });
    } else {
      // 特定スタッフ：シフトにレコードがある日だけON
      shifts.filter(s => s.staff_id === staffId).forEach(s => {
        dateMap[s.work_date] = "on";
      });
    }
    setStaffShiftDates(dateMap);
  };
  const checkExistingCustomer = async () => {
    const lineUserId = session?.lineUserId;
    if (!lineUserId) return;
    // line_user_idを確実に保存（次回以降の自動ログインとLINE通知送信に使用）
    localStorage.setItem('yurari_line_user_id', lineUserId);
    const res = await fetch(SUPABASE_URL + "/rest/v1/customers?line_user_id=eq." + lineUserId + "&select=*", { headers });
    const data = await res.json();
    if (data && data.length > 0) {
      const c = data[0];
      // line_user_idと通知方法をDBにも確実に保存
      await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${c.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ line_user_id: lineUserId, notification_method: "line" }),
      });
      setExistingCustomer({ ...c, line_user_id: lineUserId });
      localStorage.setItem('yurari_customer_id', c.id);
      localStorage.setItem('yurari_login_expire', Date.now() + 7 * 24 * 60 * 60 * 1000);
      setProfile({
        name: c.name || "", kana: c.kana || "",
        zipcode: c.zipcode || "", address: c.address || "",
        tel: c.tel || "", email: c.email || "",
        birthYear: "", birthMonth: "", birthDay: "",
        birthday: c.birthday || "", firstVisit: "2回目以降", notes: "",
      });
      setScreen("booking");
    } else {
      // 新規ユーザー：LINEの表示名をプリセットして登録画面へ
      setProfile(p => ({ ...p, name: session?.user?.name || "" }));
      setScreen("register");
    }
  };

  const handleAuthSelect = (method) => {
    setNotificationMethod(method);
    if (method === "line") {
      localStorage.setItem('yurari_notification_method', 'line');
      // NextAuth LINE OAuth → /src?notify=line に戻り、checkExistingCustomer で処理
      signIn("line", { callbackUrl: "/src?notify=line" });
    } else {
      setScreen("register");
    }
  };

  const handleRegisterSubmit = async () => {
    if (!profile.name || !profile.kana || !profile.tel || !profile.email || !profile.address || !profile.zipcode || !profile.birthday) {
      setError("全ての項目を入力してください");
      return;
    }
    setError("");
    const getHeaders = {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
    };
    const lineUserId = localStorage.getItem('yurari_line_user_id') || null;
    const searchRes = await fetch(SUPABASE_URL + "/rest/v1/customers?tel=eq." + encodeURIComponent(profile.tel) + "&select=id,name,kana,tel,email,address,zipcode,birthday", { headers: getHeaders });
    const existing = await searchRes.json();
    if (existing && existing.length > 0) {
      const patchHeaders = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
      };
      const patchBody = {
        name: profile.name, kana: profile.kana, tel: profile.tel,
        email: profile.email, address: profile.address,
        zipcode: profile.zipcode, birthday: profile.birthday || null,
        notification_method: notificationMethod || "email",
      };
      // line_user_idは取得できている場合のみ保存（既存値をnullで上書きしない）
      if (lineUserId) patchBody.line_user_id = lineUserId;
      await fetch(SUPABASE_URL + "/rest/v1/customers?id=eq." + existing[0].id, {
        method: "PATCH", headers: patchHeaders,
        body: JSON.stringify(patchBody),
      });
      setExistingCustomer({ ...existing[0], ...profile, line_user_id: lineUserId || existing[0].line_user_id });
      localStorage.setItem('yurari_customer_id', existing[0].id);
      localStorage.setItem('yurari_login_expire', Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else {
      const postHeaders = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      };
      const newRes = await fetch(SUPABASE_URL + "/rest/v1/customers", {
        method: "POST", headers: postHeaders,
        body: JSON.stringify({
          name: profile.name, kana: profile.kana, tel: profile.tel,
          email: profile.email, address: profile.address,
          zipcode: profile.zipcode, birthday: profile.birthday || null,
          notification_method: notificationMethod || "email",
          // 新規顧客作成時にline_user_idを確実に保存（保存漏れの修正）
          line_user_id: lineUserId,
        }),
      });
      const newCustomer = await newRes.json();
      if (newCustomer[0]) {
        setExistingCustomer(newCustomer[0]);
        localStorage.setItem('yurari_customer_id', newCustomer[0].id);
        localStorage.setItem('yurari_login_expire', Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    }
    setScreen("booking");
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
        const searchRes = await fetch(SUPABASE_URL + "/rest/v1/customers?tel=eq." + profile.tel + "&select=id", { headers });
        const customers = await searchRes.json();
        if (customers && customers.length > 0) {
          customerId = customers[0].id;
        } else {
          const newRes = await fetch(SUPABASE_URL + "/rest/v1/customers", {
            method: "POST", headers,
            body: JSON.stringify({
              name: profile.name, kana: profile.kana, tel: profile.tel,
              email: profile.email, address: profile.address,
              zipcode: profile.zipcode,
              birthday: profile.birthday || null,
              points: 0,
              line_user_id: session?.lineUserId || localStorage.getItem('yurari_line_user_id') || null,
              notification_method: notificationMethod || "line",
            }),
          });
          const newCustomer = await newRes.json();
          customerId = newCustomer[0]?.id;
        }
      }
      await fetch(SUPABASE_URL + "/rest/v1/bookings", {
        method: "POST", headers,
        body: JSON.stringify({
          customer_id: customerId, store_id: store.id,
          course_id: course.id, course_name: course.name, course_duration: course.duration || "30分",
          staff_id: staff.id, staff_name: staff.name,
          booking_date: formatDate(date), booking_time: time,
          status: "confirmed", notes: profile.notes, booking_number: num,
        }),
      });
      if (changeBookingId) {
        await fetch(SUPABASE_URL + "/rest/v1/bookings?id=eq." + changeBookingId, {
          method: "PATCH", headers,
          body: JSON.stringify({ status: "cancelled" }),
        });
      }
      if (profile.email && notificationMethod === "email") {
        try {
          const storeName = store.id === "minamiurawa" ? "南浦和本院" : "戸田院";
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: profile.email,
              subject: "ご予約確定のお知らせ｜整体院 癒楽里",
              html: "<div style='font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;'><h2 style='color:#3a5a3a;'>ご予約確定のお知らせ</h2><p>" + profile.name + " 様</p><p>ご予約が確定しました。</p><div style='background:#f9f6f2;border-radius:8px;padding:16px;margin:20px 0;'><table style='width:100%;border-collapse:collapse;'><tr><td style='padding:6px 0;color:#7a9a7a;width:120px;'>予約番号</td><td style='padding:6px 0;'>" + num + "</td></tr><tr><td style='padding:6px 0;color:#7a9a7a;'>店舗</td><td style='padding:6px 0;'>整体院 癒楽里 " + storeName + "</td></tr><tr><td style='padding:6px 0;color:#7a9a7a;'>日時</td><td style='padding:6px 0;'>" + formatDate(date) + " " + time + "</td></tr><tr><td style='padding:6px 0;color:#7a9a7a;'>コース</td><td style='padding:6px 0;'>" + course.name + "</td></tr><tr><td style='padding:6px 0;color:#7a9a7a;'>担当</td><td style='padding:6px 0;'>" + staff.name + "</td></tr></table></div><p>ご来院をお待ちしております。</p><p style='color:#aaa;font-size:12px;'>整体院 癒楽里</p></div>",
            }),
          });
        } catch (mailErr) {
          console.error("メール送信エラー:", mailErr);
        }
      }
      if (notificationMethod === "line") {
        const liffLineUserId = localStorage.getItem('yurari_line_user_id');
        if (liffLineUserId) {
          try {
            const storeName = store.id === "minamiurawa" ? "南浦和本院" : "戸田院";
            await fetch("/api/send-line", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: liffLineUserId,
                messages: [{ type: "text", text: "ご予約が確定しました！\n\n予約番号：" + num + "\n店舗：整体院 癒楽里 " + storeName + "\n日時：" + formatDate(date) + " " + time + "\nコース：" + course.name + "\n担当：" + staff.name + "\n\nご来院をお待ちしております。" }],
              }),
            });
          } catch (lineErr) {
            console.error("LINE送信エラー:", lineErr);
          }
        }
      }
      if (customerId) {
        localStorage.setItem('yurari_customer_id', customerId);
        localStorage.setItem('yurari_login_expire', Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
      // 管理画面への通知
      await fetch(SUPABASE_URL + "/rest/v1/admin_notifications", {
        method: "POST", headers,
        body: JSON.stringify({
          store_id: store.id,
          type: "new_booking",
          title: "新規予約",
          body: (profile.name || "") + "様 " + formatDate(date) + " " + time + " " + course.name,
          customer_id: customerId,
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
    window.history.replaceState({}, '', '/src');
    setScreen("top"); setNotificationMethod(null); setStep(0);
    setStore(null); setCourse(null); setCourseCategory(null); setCourseVisitType(null);
    setStaff(null); setDate(null); setTime(null);
    setProfile({ name: "", kana: "", zipcode: "", address: "", tel: "", birthYear: "", birthMonth: "", birthDay: "", birthday: "", email: "", firstVisit: "初めて", notes: "" });
    setBookingNum(""); setError(""); setExistingCustomer(null);
    setStaffShiftDates({});
  };

  const updateBirthday = (year, month, day) => {
    if (year && month && day) {
      return year + "-" + String(month).padStart(2,"0") + "-" + String(day).padStart(2,"0");
    }
    return "";
  };

  const isSlotDisabled = (t) => {
    if (!date) return false;
    const isToday = formatDate(date) === formatDate(new Date());
    if (!isToday) return false;
    const now = new Date();
    const parts = t.split(":").map(Number);
    const slotTime = new Date();
    slotTime.setHours(parts[0], parts[1], 0, 0);
    return slotTime.getTime() - now.getTime() < sameDayLeadTime * 60 * 1000;
  };

  const Header = ({ showBack }) => (
    <div style={{ background: "white", borderBottom: "3px solid " + GREEN, padding: "12px 20px", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={showBack ? reset : undefined} style={{ cursor: showBack ? "pointer" : "default" }}>
          <img src={LOGO_URL} alt="癒楽里ロゴ" style={{ height: 44, width: "auto" }} />
        </div>
        {!showBack && (
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/mypage" style={{ padding: "10px 20px", borderRadius: 25, border: "2px solid " + GREEN, background: "white", color: GREEN, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center" }}>マイページ</a>
            <button onClick={() => setScreen("auth")} style={{ padding: "10px 20px", borderRadius: 25, border: "none", background: ORANGE, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ご予約はこちら
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (notifyFromUrl === 'line' && screen === "top") {
    return (
      <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans JP', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
          <div style={{ fontSize: 14, color: "#888" }}>読み込み中...</div>
        </div>
      </div>
    );
  }

  if (screen === "loading") {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#888" }}>読み込み中...</div>;
  }

  if (screen === "top" && !notifyFromUrl) {
    return (
      <>
      <style>{`@media (min-width: 640px) { .store-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
      <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: CREAM, height: "100dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Header showBack={false} />
        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
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
        <div style={{ background: GREEN, padding: "16px 20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <a href="https://seitai-yurari.com" target="_blank" rel="noopener noreferrer" style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", textDecoration: "none" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>整体院癒楽里　南浦和本院</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginBottom: 2 }}>〒336-0025　埼玉県さいたま市南区文蔵2-17-6</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", marginBottom: 2 }}>📞 048-762-8333</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>⏱ 10:00〜19:30　定休日：日曜日・月曜日</div>
            </a>
            <a href="https://seitai-yurari-kitatoda.com" target="_blank" rel="noopener noreferrer" style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", textDecoration: "none" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>整体院癒楽里　戸田院</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginBottom: 2 }}>〒335-0021　埼玉県戸田市新曽736-1</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", marginBottom: 2 }}>📞 048-287-3318</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>⏱ 10:00〜19:30　定休日：日曜日・月曜日</div>
            </a>
          </div>
        </div>
      </div>
      </>
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
              <button key={m.id} onClick={() => handleAuthSelect(m.id)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", borderRadius: 16, border: "2px solid " + m.color + "30", background: "white", cursor: "pointer", textAlign: "left", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
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
    if (existingCustomer) {
      setScreen("booking");
      return null;
    }
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
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>フリガナ <span style={{ color: ORANGE }}>*</span></label>
              <input type="text" value={profile.kana} onChange={e => setProfile({ ...profile, kana: e.target.value })} placeholder="ヤマダ ハナコ"
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>携帯番号 <span style={{ color: ORANGE }}>*</span></label>
              <input type="tel" value={profile.tel} onChange={e => setProfile({ ...profile, tel: e.target.value })} placeholder="090-0000-0000"
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>メールアドレス <span style={{ color: ORANGE }}>*</span></label>
              <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="example@email.com"
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>郵便番号 <span style={{ color: ORANGE }}>*</span></label>
              <input type="text" value={profile.zipcode} maxLength={7} placeholder="1234567（ハイフンなし）"
                onChange={async (e) => {
                  const zip = e.target.value.replace(/[^0-9]/g, "");
                  setProfile({ ...profile, zipcode: zip });
                  if (zip.length === 7) {
                    const res = await fetch("https://zipcloud.ibsnet.co.jp/api/search?zipcode=" + zip);
                    const data = await res.json();
                    if (data.results) {
                      const r = data.results[0];
                      setProfile(p => ({ ...p, zipcode: zip, address: r.address1 + r.address2 + r.address3 }));
                    }
                  }
                }}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>住所 <span style={{ color: ORANGE }}>*</span></label>
              <input type="text" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} placeholder="自動入力されます（番地・部屋番号を追加してください）"
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 15, color: DARK, background: "white", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>生年月日 <span style={{ color: ORANGE }}>*</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={profile.birthYear} onChange={e => { const y = e.target.value; setProfile({ ...profile, birthYear: y, birthday: updateBirthday(y, profile.birthMonth, profile.birthDay) }); }}
                  style={{ flex: 2, padding: "12px 8px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white" }}>
                  <option value="">年</option>
                  {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
                <select value={profile.birthMonth} onChange={e => { const m = e.target.value; setProfile({ ...profile, birthMonth: m, birthday: updateBirthday(profile.birthYear, m, profile.birthDay) }); }}
                  style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white" }}>
                  <option value="">月</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                </select>
                <select value={profile.birthDay} onChange={e => { const d = e.target.value; setProfile({ ...profile, birthDay: d, birthday: updateBirthday(profile.birthYear, profile.birthMonth, d) }); }}
                  style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white" }}>
                  <option value="">日</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}日</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>ご来院歴</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["初めて","2回目以降"].map(v => (
                  <div key={v} onClick={() => setProfile({ ...profile, firstVisit: v })} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "2px solid " + (profile.firstVisit === v ? GREEN : "#e8ddd0"), background: profile.firstVisit === v ? GREEN + "10" : "white", textAlign: "center", cursor: "pointer", fontSize: 14, fontWeight: 700, color: profile.firstVisit === v ? GREEN : "#aaa" }}>{v}</div>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: GREEN, display: "block", marginBottom: 6 }}>お悩み・ご要望（任意）</label>
              <textarea value={profile.notes} onChange={e => setProfile({ ...profile, notes: e.target.value })} placeholder="肩こりがひどく、特に右肩が気になります..." rows={3}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white", boxSizing: "border-box", outline: "none", resize: "none", fontFamily: "inherit" }} />
            </div>
          </div>
        </div>
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderTop: "3px solid " + GREEN + "20", padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
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
          <div style={{ fontSize: 24, fontWeight: 700, color: GREEN, marginBottom: 8 }}>{changeBookingId ? "予約を変更しました！" : "ご予約が完了しました！"}</div>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 32 }}>ありがとうございます</div>
          <div style={{ background: "white", borderRadius: 20, padding: "24px", marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "2px solid " + LIGHT_GREEN }}>
            <div style={{ fontSize: 11, color: LIGHT_GREEN, marginBottom: 4 }}>予約番号</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: GREEN, letterSpacing: "0.1em" }}>{bookingNum}</div>
          </div>
          <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 28, textAlign: "left", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 12 }}>ご予約詳細</div>
            {[
              { label: "店舗", value: "癒楽里 " + (store ? store.name : "") },
              { label: "コース", value: course ? course.name : "" },
              { label: "担当", value: staff ? staff.name : "" },
              { label: "日時", value: date && time ? (date.getMonth()+1) + "月" + date.getDate() + "日（" + DAYS_JP[date.getDay()] + "） " + time + "〜" : "" },
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
          <a href="/mypage" style={{ display: "block", width: "100%", padding: "14px", borderRadius: 14, background: GREEN, color: "white", fontSize: 15, fontWeight: 700, textDecoration: "none", textAlign: "center", marginBottom: 12, boxSizing: "border-box" }}>マイページで予約を確認する</a>
          <button onClick={() => { reset(); setScreen("booking"); }} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "2px solid " + GREEN, background: "white", color: GREEN, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 20 }}>別の予約をする</button>
          <div style={{ background: "#f0f8f4", borderRadius: 16, padding: "20px", textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 12 }}>📱 アプリとして使うと便利です</div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 2 }}>
              <div>① Safariの共有ボタン（□↑）をタップ</div>
              <div>② 「ホーム画面に追加」を選択</div>
              <div>③ 追加したアイコンからマイページを開く</div>
              <div>④ 通知設定でプッシュ通知を許可する</div>
            </div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>※ ホーム画面追加でリマインド通知が届きます</div>
          </div>
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
                <div key={s.id} onClick={() => setStore(s)} style={{ background: store && store.id === s.id ? GREEN + "15" : "white", border: "2px solid " + (store && store.id === s.id ? GREEN : "#e8ddd0"), borderRadius: 16, padding: "20px 24px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={LOGO_URL} alt="ロゴ" style={{ height: 36, width: "auto" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>癒楽里 {s.name}</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.address}</div>
                      <div style={{ fontSize: 12, color: LIGHT_GREEN, marginTop: 2 }}>📞 {s.tel}</div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>🕐 {s.hours}</div>
                    </div>
                    {store && store.id === s.id && <div style={{ color: GREEN, fontSize: 24 }}>✓</div>}
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
            {!courseCategory ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {["整体", "エステ"].map(cat => (
                  <div key={cat} onClick={() => setCourseCategory(cat)} style={{ background: "white", border: "2px solid #e8ddd0", borderRadius: 16, padding: "28px 20px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: GREEN }}>{cat}</div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>タップして選ぶ</div>
                  </div>
                ))}
              </div>
            ) : !courseVisitType ? (
              <div>
                <button onClick={() => { setCourseCategory(null); setCourse(null); }} style={{ marginBottom: 16, padding: "6px 14px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 13, cursor: "pointer" }}>← 戻る</button>
                <div style={{ fontSize: 16, fontWeight: 700, color: GREEN, marginBottom: 16 }}>{courseCategory}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {["初回の方", "2回目以降の方"].map(vt => (
                    <div key={vt} onClick={() => setCourseVisitType(vt)} style={{ background: "white", border: "2px solid #e8ddd0", borderRadius: 16, padding: "28px 20px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>{vt}</div>
                      <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>タップして選ぶ</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <button onClick={() => { setCourseVisitType(null); setCourse(null); }} style={{ marginBottom: 16, padding: "6px 14px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 13, cursor: "pointer" }}>← 戻る</button>
                <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 16 }}>{courseCategory} / {courseVisitType}</div>
                {courses.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>読み込み中...</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {courses.filter(c => {
                      const catMatch = (c.category || "整体") === courseCategory;
                      const visitMatch = courseVisitType === "初回の方" ? c.is_first_only === true : c.is_first_only !== true;
                      return catMatch && visitMatch;
                    }).map(c => (
                      <div key={c.id} onClick={() => setCourse(c)} style={{ background: course && course.id === c.id ? GREEN + "15" : "white", border: "2px solid " + (course && course.id === c.id ? GREEN : "#e8ddd0"), borderRadius: 16, padding: "18px 20px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: GREEN, marginBottom: 4 }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: "#888" }}>{c.description}</div>
                          </div>
                          <div style={{ textAlign: "right", marginLeft: 12 }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: ORANGE }}>{"¥" + (c.price ? c.price.toLocaleString() : "0")}</div>
                            <div style={{ fontSize: 11, color: "#aaa" }}>{c.duration}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {courses.filter(c => {
                      const catMatch = (c.category || "整体") === courseCategory;
                      const visitMatch = courseVisitType === "初回の方" ? c.is_first_only === true : c.is_first_only !== true;
                      return catMatch && visitMatch;
                    }).length === 0 && (
                      <div style={{ textAlign: "center", padding: 40, color: "#aaa", background: "white", borderRadius: 16 }}>
                        該当するコースがありません。<br/>管理画面でコースのカテゴリーを設定してください。
                      </div>
                    )}
                  </div>
                )}
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

            {/* 担当スタッフ選択 */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid " + GREEN + "20" }}>担当スタッフ</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[{ id: "any", name: "指名なし", title: "おまかせ" }, ...staffList].map(s => (
                  <div key={s.id} onClick={() => { setStaff(s); setDate(null); setTime(null); }} style={{ background: staff && staff.id === s.id ? GREEN + "15" : "white", border: "2px solid " + (staff && staff.id === s.id ? GREEN : "#e8ddd0"), borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "center", minWidth: 90 }}>
                    <div style={{ fontSize: 28 }}>👤</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: GREEN, marginTop: 4 }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: "#888" }}>{s.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 日付選択カレンダー */}
            {staff && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid " + GREEN + "20" }}>ご希望日</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <button onClick={() => {
                    const now = new Date();
                    if (calendarMonth.getFullYear() > now.getFullYear() || calendarMonth.getMonth() > now.getMonth()) {
                      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
                    }
                  }}
                    style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: GREEN, padding: "4px 8px" }}>‹</button>
                  <div style={{ fontSize: 16, fontWeight: 700, color: GREEN }}>{calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月</div>
                  <button onClick={() => {
                    const maxMonth = new Date();
                    maxMonth.setMonth(maxMonth.getMonth() + 2);
                    if (calendarMonth < new Date(maxMonth.getFullYear(), maxMonth.getMonth(), 1)) {
                      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
                    }
                  }} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: GREEN, padding: "4px 8px" }}>›</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                  {["日","月","火","水","木","金","土"].map(d => (
                    <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#aaa", padding: "4px 0" }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                  {(() => {
                    const year = calendarMonth.getFullYear();
                    const month = calendarMonth.getMonth();
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const maxDate = new Date();
                    maxDate.setMonth(maxDate.getMonth() + 2);
                    maxDate.setHours(0,0,0,0);
                    const cells = [];
                    for (let i = 0; i < firstDay; i++) cells.push(null);
                    for (let i = 1; i <= daysInMonth; i++) {
                      cells.push(new Date(year, month, i));
                    }
                    return cells.map((d, i) => {
                      if (!d) return <div key={i} />;
                      const dateStr = formatDate(d);
                      const isPast = d < today;
                      const isFuture = d > maxDate;
                      const isSelected = date && d.toDateString() === date.toDateString();
                      const dayIdx = d.getDay();
                      const isOff = staffShiftDates[dateStr] !== "on";
                      const disabled = isPast || isFuture || isOff;
                      return (
                        <div key={i} onClick={() => { if (!disabled) { setDate(d); setTime(null); if (store) { fetchStoreSettings(store.id); fetchBookedSlots(staff.id, store.id, dateStr); } } }}
                          style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", background: isSelected ? GREEN : "white", color: isSelected ? "white" : disabled ? "#ccc" : dayIdx === 0 ? "#e07070" : dayIdx === 6 ? "#7090e0" : DARK, fontWeight: isSelected ? 700 : 400, fontSize: 13, border: isSelected ? "2px solid " + GREEN : "2px solid transparent", opacity: disabled ? 0.4 : 1 }}>
                          {d.getDate()}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* 時間選択 */}
            {staff && date && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid " + GREEN + "20" }}>ご希望時間</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TIME_SLOTS.map(t => {
                    const isSelected = time === t;
                    const durationMin = course ? parseInt((course.duration || "30分").replace(/[^0-9]/g, "")) || 30 : 30;
                    const slotsNeeded = durationMin / 30;
                    const startIdx = TIME_SLOTS.indexOf(t);
                    const hasEnoughSlots = Array.from({ length: slotsNeeded }, (_, i) => TIME_SLOTS[startIdx + i])
                      .every(slot => slot && !bookedSlots.includes(slot) && !isSlotDisabled(slot));
                    const disabled = isSlotDisabled(t) || bookedSlots.includes(t) || !hasEnoughSlots;
                    return (
                      <div key={t} onClick={() => !disabled && setTime(t)} style={{ background: isSelected ? GREEN : disabled ? "#f0f0f0" : "white", border: "2px solid " + (isSelected ? GREEN : disabled ? "#ddd" : "#e8ddd0"), borderRadius: 10, padding: "8px 14px", cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, color: isSelected ? "white" : disabled ? "#bbb" : DARK }}>
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
            <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "2px solid " + GREEN + "20", marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              {[
                { label: "店舗", value: "癒楽里 " + (store ? store.name : "") },
                { label: "コース", value: course ? course.name + "（" + course.duration + " / ¥" + (course.price ? course.price.toLocaleString() : "0") + "）" : "" },
                { label: "担当", value: staff ? staff.name : "" },
                { label: "日時", value: date && time ? date.getFullYear() + "年" + (date.getMonth()+1) + "月" + date.getDate() + "日（" + DAYS_JP[date.getDay()] + "） " + time + "〜" : "" },
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
              {loading ? "送信中..." : changeBookingId ? "✓ この内容で予約を変更する" : "✓ この内容で予約を確定する"}
            </button>
          </div>
        )}

        {step < 3 && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderTop: "3px solid " + GREEN + "20", padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
            <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", gap: 12 }}>
              {step > 0 && <button onClick={() => { setStep(step - 1); setDate(null); setTime(null); if (step === 1) { setCourseCategory(null); setCourseVisitType(null); setCourse(null); } }} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "2px solid " + GREEN + "40", background: "white", color: GREEN, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>← 戻る</button>}
              <button onClick={() => { if (canNext()) { if (step < 2) { setDate(null); setTime(null); } setStep(step + 1); } }} style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: canNext() ? GREEN : "#e8ddd0", color: canNext() ? "white" : "#bbb", fontSize: 15, fontWeight: 700, cursor: canNext() ? "pointer" : "not-allowed" }}>次へ →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#fdf8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#888" }}>読み込み中...</div>}>
      <AppInner />
    </Suspense>
  );
}
