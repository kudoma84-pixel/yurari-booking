"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

// 予約フォームのデータはすべて /api/booking-form/* などのサーバーAPIを経由する（Supabase を直接呼ばない）。
// 本人確認はサーバー側で行う（電話番号の一致／検証済みLINEユーザーID／マイページのセッション）。
const api = async (path, init) => {
  const res = await fetch("/api/" + path, {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

const STORES = [
  { id: "minamiurawa", name: "南浦和本院", address: "埼玉県さいたま市南区文蔵2-17-6", tel: "048-762-8333", hours: "10:00〜19:30（最終受付19:00）", lineUrl: "https://lin.ee/MINAMIURAWA" },
  { id: "toda", name: "戸田院", address: "埼玉県戸田市新曽736-1", tel: "048-287-3318", hours: "10:00〜19:30（最終受付19:00）", lineUrl: "https://lin.ee/TODA" },
];

const TIME_SLOTS = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00"];
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

function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

function formatDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

const bookingSteps = ["店舗選択","コース選択","スタッフ・日時","確認"];

function AppInner() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const changeBookingId = searchParams?.get('change');
  const notifyFromUrl = searchParams?.get('notify');

  // LIFF（LINEアプリ内）で開かれた場合に検証済みのLINEユーザー情報を入れる
  const [liffUser, setLiffUser] = useState(null);
  // LIFFの判定結果：LIFFで取得できたLINEユーザーID、LIFFでなければ／失敗時は null で解決する
  const liffReadyRef = useRef(null);
  // liff.init の結果（「LINEで登録」を押したときの分岐に使う）。init 失敗時は initOk=false のまま
  const liffStateRef = useRef({ initOk: false, isInClient: null });

  // LINEアプリ内ブラウザで開かれた場合は外部ブラウザへ引き渡す（LIFFでない場合の従来動作）。
  // 内部ブラウザでLINEログインを始めると、戻り先（Safari等）に state cookie が無く OAuthCallback エラーになるため。
  const handOffToExternalBrowser = () => {
    try {
      if (!/ line\//i.test(navigator.userAgent)) return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("openExternalBrowser") === "1") return;
      // ログイン復帰中はセッションがこのブラウザにあるため引き渡さない
      if (params.get("notify")) return;
      // 無限ループ防止：一度実行したら二度目は何もしない
      if (sessionStorage.getItem("yurari_open_external")) return;
      sessionStorage.setItem("yurari_open_external", "1");
      params.set("openExternalBrowser", "1");
      window.location.replace(`${window.location.pathname}?${params.toString()}${window.location.hash}`);
    } catch (e) {
      console.error("[src] 外部ブラウザへの引き渡しに失敗", e);
    }
  };

  // 起動時：LIFFとして開かれていればLIFFでLINEユーザーIDを取得（リダイレクトなし）。
  // LIFFでない／失敗した場合は従来どおり外部ブラウザ引き渡し＋NextAuthのLINEログイン。
  useEffect(() => {
    liffReadyRef.current = (async () => {
      // [診断] LIFFがどこで失敗しているかを auth_error_logs に記録する（トークン等の認証情報は記録しない）
      const liffIdEnv = process.env.NEXT_PUBLIC_LIFF_ID;
      const diag = {
        liffIdSet: !!liffIdEnv,
        liffIdHead: liffIdEnv ? String(liffIdEnv).slice(0, 10) : null,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        initResult: "failed",
        initError: null,
        isInClient: null,
        isLoggedIn: null,
        idTokenGot: null,
        verifyStatus: null,
        verifyError: null,
        finalUserId: false,
        stepError: null,
      };
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("NEXT_PUBLIC_LIFF_ID が未設定です");
        const liff = (await import("@line/liff")).default;
        // init が応答しない環境でも操作不能にならないようタイムアウトで従来フローへ落とす
        await Promise.race([
          liff.init({ liffId }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("liff.init タイムアウト")), 8000)),
        ]);
        diag.initResult = "ok";
        diag.isInClient = liff.isInClient();
        liffStateRef.current = { initOk: true, isInClient: liff.isInClient() };
        diag.isLoggedIn = liff.isLoggedIn();
        if (!liff.isInClient()) {
          handOffToExternalBrowser();
          return null;
        }
        if (!liff.isLoggedIn()) {
          liff.login();
          return new Promise(() => {}); // ログイン画面へ遷移するため解決しない
        }
        const idToken = liff.getIDToken();
        diag.idTokenGot = !!idToken;
        if (!idToken) throw new Error("IDトークンが取得できません（LIFFのスコープに openid が必要）");
        const res = await fetch("/api/liff-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        diag.verifyStatus = res.status;
        if (!res.ok) {
          diag.verifyError = await res.text().catch(() => null);
          throw new Error("IDトークン検証失敗 status=" + res.status);
        }
        const data = await res.json();
        if (!data?.lineUserId) throw new Error("検証結果に lineUserId がありません");
        setLiffUser({ lineUserId: data.lineUserId, displayName: data.displayName || "" });
        diag.finalUserId = true;
        return data;
      } catch (e) {
        const errInfo = { name: e?.name, message: e?.message };
        if (diag.initResult !== "ok") diag.initError = errInfo;
        else diag.stepError = errInfo;
        console.error("[LIFF] 初期化・認証に失敗したため従来フローで続行します", e);
        handOffToExternalBrowser();
        return null;
      } finally {
        // どの経路でも必ず1回記録。await せず、失敗しても画面の動作に影響させない
        try {
          fetch("/api/booking-form/liff-log", {
            method: "POST",
            keepalive: true, // 外部ブラウザ引き渡し・liff.login の遷移中でも送信を完了させる
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ detail: JSON.stringify(diag) }),
          }).catch(err => console.error("[LIFF] 診断ログ記録失敗", err));
        } catch (err) {
          console.error("[LIFF] 診断ログ記録失敗", err);
        }
      }
    })();
  }, []);

  // LINEユーザーID：LIFFで検証済みのID、なければNextAuthセッションのID
  const authLineUserId = liffUser?.lineUserId || session?.lineUserId || null;

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
  // 生年月日3分割入力の自動フォーカス移動用
  const yearRef = useRef(null);
  const monthRef = useRef(null);
  const dayRef = useRef(null);
  const [pushGranted, setPushGranted] = useState(false);
  const [pushStatus, setPushStatus] = useState("idle"); // "idle" | "loading" | "done"
  const [isStandalone, setIsStandalone] = useState(true); // デフォルトtrue=iOS警告非表示（SSR安全）
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [existingCustomer, setExistingCustomer] = useState(null);
  // existingCustomer をどう特定したか（予約登録時にサーバーのログへ渡す）
  const customerMatchRef = useRef(null);
  const [sameDayLeadTime, setSameDayLeadTime] = useState(60);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [staffShiftDates, setStaffShiftDates] = useState({});
  const [bookedSlots, setBookedSlots] = useState([]);
  const [showAddEsthe, setShowAddEsthe] = useState(false);
  const [course2, setCourse2] = useState(null);
  const [courseVisitType2, setCourseVisitType2] = useState(null);
  useEffect(() => { fetchCourses(); }, []);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      setPushGranted(true);
    }
    // navigator.standaloneはSSRで参照できないのでuseEffect内で設定
    if (typeof navigator !== "undefined") {
      setIsStandalone(navigator.standalone === true);
    }
  }, []);

  const handleRequestPush = async () => {
    if (pushStatus === "loading" || pushStatus === "done") return;
    setPushStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setPushStatus("idle"); return; }
      setPushGranted(true);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      // 登録先の顧客はサーバーが本人確認する（フォームの電話番号 or 検証済みLINE or マイページのセッション）
      const r = await api("push-subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: sub, customer_id: existingCustomer?.id || null, tel: profile.tel || "" }),
      });
      if (!r.ok) throw new Error("push-subscribe " + r.status);
      setPushStatus("done");
    } catch (e) {
      console.error("push subscribe error", e);
      setPushStatus("idle");
    }
  };

  // NextAuth LINE復帰処理：?notify=line で戻った後、セッションが確立したら顧客照合へ
  useEffect(() => {
    if (notifyFromUrl !== 'line') return;
    setNotificationMethod('line');

    // 診断ログ（Vercelのブラウザコンソールで確認）
    console.log("[NextAuth診断]", {
      sessionStatus,
      lineUserId: session?.lineUserId ?? "(なし)",
      sessionKeys: session ? Object.keys(session) : [],
      url: typeof window !== "undefined" ? window.location.href : "",
    });

    if (sessionStatus === 'loading') return; // セッション確立待ち（最大数秒）

    if (sessionStatus === 'unauthenticated') {
      // pages.signIn:'/src' によりNextAuthが再度ここへリダイレクトしループするのを防ぐ
      // URLからnotify=lineを除去してからエラー表示する
      if (typeof window !== "undefined") window.history.replaceState({}, "", "/src");
      setScreen("auth");
      console.error("[LINEログイン] セッションが確立できませんでした。NEXTAUTH_SECRET / NEXTAUTH_URL / LINE_CLIENT_ID / LINE_CLIENT_SECRET の設定とコールバックURLを確認してください。");
      alert("LINEログインに失敗しました。お手数ですが、もう一度お試しください。");
      return;
    }

    if (!session?.lineUserId) {
      if (typeof window !== "undefined") window.history.replaceState({}, "", "/src");
      setScreen("auth");
      console.error("[LINEログイン] lineUserIdが取得できません。セッション:", session);
      alert("LINEログインに失敗しました。お手数ですが、もう一度お試しください。");
      return;
    }

    // 成功パスでもURLから?notify=lineを除去してループを防ぐ
    if (typeof window !== "undefined") window.history.replaceState({}, "", "/src");
    checkExistingCustomer(session.lineUserId, session.user?.name || "");
  }, [notifyFromUrl, session, sessionStatus]);

  useEffect(() => {
    if (notifyFromUrl === 'line') return; // NextAuth LINE復帰時はスキップ（上のuseEffectに任せる）
    if (changeBookingId) return; // 予約変更は下の useEffect で扱う
    // 自動ログイン：従来は localStorage の顧客ID／LINEユーザーIDをそのまま信用していたが、
    // サーバーが確認できた本人（マイページのセッション → 検証済みLINEユーザーID）だけを使う。
    const autoLogin = async () => {
      // LIFF の検証（検証済みCookieの発行）が終わってから問い合わせる
      try { await liffReadyRef.current; } catch {}
      const r = await api("booking-form/me");
      const c = r.data?.customer;
      if (!r.ok || !c?.id) return;
      setProfile({
        name: c.name || "", kana: c.kana || "",
        tel: c.tel || "", email: c.email || "",
        address: c.address || "", zipcode: c.zipcode || "",
        birthYear: "", birthMonth: "", birthDay: "",
        birthday: c.birthday || "", firstVisit: "2回目以降", notes: "",
      });
      setExistingCustomer(c);
      customerMatchRef.current = { source: r.data.source, has_tel: !!(c.tel || "").trim(), hits: 1 };
      setNotificationMethod(r.data.source === "verified_line" ? "line" : (c.notification_method || "email"));
      // 予約確定のLINE通知の送信先（従来どおり localStorage から読む）
      if (r.data.source === "verified_line" && c.line_user_id) localStorage.setItem('yurari_line_user_id', c.line_user_id);
      setScreen(s => (s === "top" ? "booking" : s));
    };
    autoLogin().catch(e => console.error("[自動ログイン] 失敗", e));
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
        // 予約IDだけで顧客情報を返さないよう、サーバーで本人確認（マイページのセッション or 検証済みLINE）する
        try { await liffReadyRef.current; } catch {}
        const r = await api("booking-form/change-source?id=" + encodeURIComponent(changeBookingId));
        if (!r.ok) {
          console.error("[予約変更] 元の予約を取得できませんでした", r.status);
          alert(r.status === 403
            ? "ご本人確認ができませんでした。マイページにログインしてから「予約を変更する」を押してください。"
            : "変更元の予約が見つかりませんでした。");
          // 顧客が確定しないまま予約画面に残さない（予約変更はマイページから始まる）
          window.location.href = "/mypage";
          return;
        }
        if (r.data?.customer) {
          const c = r.data.customer;
          setProfile({
            name: c.name || "", kana: c.kana || "",
            tel: c.tel || "", email: c.email || "",
            address: c.address || "", zipcode: c.zipcode || "",
            birthYear: "", birthMonth: "", birthDay: "",
            birthday: c.birthday || "", firstVisit: "2回目以降", notes: "",
          });
          setExistingCustomer(c);
          customerMatchRef.current = { source: "change_booking", has_tel: !!(c.tel || "").trim(), hits: 1 };
          setNotificationMethod(c.notification_method || "email");
        }
      };
      fetchBookingCustomer();
      setScreen("booking");
    }
  }, [changeBookingId]);

  const fetchCourses = async () => {
    const r = await api("booking-form/courses");
    setCourses(r.ok && Array.isArray(r.data.courses) ? r.data.courses : []);
  };

  const fetchStaff = async (storeId) => {
    const r = await api("booking-form/staff?store_id=" + encodeURIComponent(storeId));
    setStaffList(r.ok && Array.isArray(r.data.staff) ? r.data.staff : []);
  };

  const fetchStoreSettings = async (storeId) => {
    const r = await api("booking-form/store-settings?store_id=" + encodeURIComponent(storeId));
    if (r.ok && r.data.settings) setSameDayLeadTime(r.data.settings.same_day_lead_time);
  };

  const fetchBookedSlots = async (staffId, storeId, dateStr) => {
    // 予約済みの時間帯・休憩解放（time_extensions）・ブロック（blocks）をまとめて取得
    const r = await api("booking-form/booked-slots?store_id=" + encodeURIComponent(storeId)
      + "&staff_id=" + encodeURIComponent(staffId) + "&date=" + encodeURIComponent(dateStr));
    const data = r.ok ? r.data.bookings : null;
    const ext = r.ok ? r.data.extension : null;

    const blocked = new Set();

    // 休憩時間（13:30〜14:30）をデフォルトでブロック、解放されていれば除外
    if (!ext?.break_released_1330) blocked.add("13:30");
    if (!ext?.break_released_1400) blocked.add("14:00");
    if (!ext?.break_released_1430) blocked.add("14:30");

    if (!Array.isArray(data)) { setBookedSlots([...blocked]); return; }

    // 予約済みスロットをブロック（所要時間分）。所要時間が未設定の予約はサーバーがコースの所要時間で補って返す
    for (const b of data) {
      const durationStr = b.course_duration || "30分";
      const durationMin = parseInt(durationStr.replace(/[^0-9]/g, "")) || 30;
      const slots = durationMin / 30;
      const startIdx = TIME_SLOTS.indexOf(b.booking_time);
      if (startIdx >= 0) {
        for (let i = 0; i < slots; i++) {
          if (TIME_SLOTS[startIdx + i]) blocked.add(TIME_SLOTS[startIdx + i]);
        }
      }
    }
    // ブロック情報（同じAPIで取得済み）
    const blocksData = r.data.blocks;
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
    const r = await api("booking-form/shifts?store_id=" + encodeURIComponent(storeId)
      + "&from=" + from + "&to=" + to);
    const shifts = r.ok && Array.isArray(r.data.shifts) ? r.data.shifts : [];

    const dateMap = {};
    if (staffId === "any") {
      // 指名なし：アクティブスタッフが1人でも出勤している日はON
      const activeIds = r.ok && Array.isArray(r.data.active_staff_ids) ? r.data.active_staff_ids : [];
      shifts.filter(s => activeIds.includes(s.staff_id)).forEach(s => {
        dateMap[s.work_date] = "on";
      });
    } else {
      // 特定スタッフ：シフトにレコードがある日だけON
      shifts.filter(s => s.staff_id === staffId).forEach(s => {
        dateMap[s.work_date] = "on";
      });
      // 休院日（closed）は強制的にOFFにする
      shifts.filter(s => s.staff_id === "closed").forEach(s => {
        dateMap[s.work_date] = "off";
      });
    }
    setStaffShiftDates(dateMap);
  };
  // lineUserId はLIFF検証済みのID またはNextAuthセッションのID（authLineUserId 参照）
  const checkExistingCustomer = async (lineUserId = authLineUserId, displayName = liffUser?.displayName || session?.user?.name || "") => {
    if (!lineUserId) return;
    // LINE通知の送信先に使う（照合そのものはサーバーが検証済みのLINEユーザーIDで行う）
    localStorage.setItem('yurari_line_user_id', lineUserId);
    const r = await api("booking-form/line-customer", { method: "POST", body: "{}" });
    if (!r.ok) {
      console.error("[顧客照合] LINEでの照合に失敗", r.status);
      setScreen("auth");
      alert(r.data?.error || "LINEでの確認に失敗しました。お手数ですが、もう一度お試しください。");
      return;
    }
    if (r.data.found && r.data.customer) {
      const c = r.data.customer;
      customerMatchRef.current = { source: "line", has_tel: !!(c.tel || "").trim(), hits: 1 };
      setExistingCustomer(c);
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
      setProfile(p => ({ ...p, name: displayName }));
      setScreen("register");
    }
  };

  const handleAuthSelect = (method) => {
    localStorage.removeItem('yurari_customer_id');
    localStorage.removeItem('yurari_login_expire');
    localStorage.removeItem('yurari_line_user_id');
    setNotificationMethod(method);
    if (method === "line") {
      localStorage.setItem('yurari_notification_method', 'line');
      const startLineLogin = async () => {
        // LIFF（LINEアプリ内）ならリダイレクトせず、検証済みのLINEユーザーIDでそのまま照合
        let liffData = null;
        try { liffData = await liffReadyRef.current; } catch {}
        if (liffData?.lineUserId) {
          checkExistingCustomer(liffData.lineUserId, liffData.displayName || "");
          return;
        }
        const { initOk, isInClient } = liffStateRef.current;
        if (initOk && isInClient) {
          // LIFF内でユーザーIDが取れなかった場合は従来どおり（この経路は変更しない）
          // NextAuth LINE OAuth → /src?notify=line に戻り、checkExistingCustomer で処理
          signIn("line", { callbackUrl: "/src?notify=line" });
          return;
        }

        // ここに来るのは通常ブラウザ（isInClient=false）か liff.init 失敗のとき。
        // 通常ブラウザで NextAuth の OAuth を始めると、戻り先で state cookie が見つからず失敗しやすい
        // （"State cookie was missing."）。そのため OAuth は使わず LIFF URL で LINEアプリを開く。
        const ua = navigator.userAgent || "";
        if (!/Mobile|iPhone|Android/i.test(ua)) {
          // PCで LIFF URL を開くと LINE のログイン画面になり、PC版LINEにログインしていない方は進めない
          alert("LINEでのご登録はスマートフォンからお願いします。\nパソコンの方はメールでご登録ください。");
          localStorage.removeItem('yurari_notification_method');
          setNotificationMethod("email");
          setScreen("register");
          return;
        }
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          console.error("[LINE登録] NEXT_PUBLIC_LIFF_ID が未設定のため LIFF URL を作れません");
          alert("ただいまLINEでのご登録をご利用いただけません。\nお手数ですがメールでご登録ください。");
          localStorage.removeItem('yurari_notification_method');
          setNotificationMethod("email");
          setScreen("register");
          return;
        }
        // 端末によっては LINEアプリが起動せず、このブラウザで開き直ることがある。
        // 同じタブで2回目以降なら、メール登録も選べるようにして行き止まりを防ぐ。
        let triedBefore = false;
        try { triedBefore = !!sessionStorage.getItem("yurari_liff_redirected"); } catch {}
        if (triedBefore && !window.confirm("LINEアプリが開かない場合は、メールでのご登録をお願いします。\n\nもう一度LINEアプリを開きますか？\n（「キャンセル」でメール登録に進みます）")) {
          localStorage.removeItem('yurari_notification_method');
          setNotificationMethod("email");
          setScreen("register");
          return;
        }
        if (!triedBefore && !window.confirm("LINEアプリが開きます。\nLINEアプリ内でもう一度「今すぐ予約する」→「LINEで登録する」を押してお進みください。")) return;
        try { sessionStorage.setItem("yurari_liff_redirected", "1"); } catch {}
        window.location.href = `https://liff.line.me/${liffId}`;
      };
      startLineLogin();
    } else {
      setScreen("register");
    }
  };

  const handleRegisterSubmit = async () => {
    if (!profile.name || !profile.kana || !profile.tel || !profile.email || !profile.address || !profile.zipcode) {
      setError("全ての項目を入力してください");
      return;
    }
    if (!profile.birthday) {
      setError(
        (profile.birthYear || profile.birthMonth || profile.birthDay)
          ? "生年月日が正しくありません。実在する日付を入力してください。"
          : "生年月日を入力してください"
      );
      return;
    }
    setError("");
    // 電話番号が空（空白・記号のみを含む）なら照合しない。
    // 空のまま tel=eq. で検索すると、電話番号が空の別の顧客がヒットしてしまう。
    const tel = String(profile.tel || "").trim();
    if (tel.replace(/[^0-9]/g, "").length === 0) {
      setError("電話番号を入力してください");
      return;
    }
    // 照合・登録はサーバーで行う。同じ電話番号の顧客が既にいる場合は上書きせず、その顧客で予約に進む。
    // 2件以上いる場合はエラー。LINEユーザーIDはサーバーが検証済みのものだけを保存する。
    const r = await api("booking-form/register", {
      method: "POST",
      body: JSON.stringify({
        name: profile.name, kana: profile.kana, tel,
        email: profile.email, address: profile.address,
        zipcode: profile.zipcode, birthday: profile.birthday,
        notification_method: notificationMethod || "email",
      }),
    });
    // 登録に失敗したまま予約画面へ進むと、予約が顧客に紐づかなくなる
    if (!r.ok || !r.data.customer_id) {
      console.error("顧客登録に失敗:", r.status);
      setError(r.data?.error || "お客様情報の確認に失敗しました。通信状態をご確認のうえ、もう一度お試しください。");
      return;
    }
    // 既存の方の登録内容はサーバーから受け取らない（入力された内容で予約・確認メールを送る）
    setExistingCustomer({ id: r.data.customer_id, ...profile, tel, has_line: !!r.data.has_line });
    customerMatchRef.current = r.data.existed
      ? { source: "register_tel", has_tel: true, hits: 1 }
      : { source: "register_new", has_tel: true, hits: 0 };
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
      // 顧客はログイン・登録の段階で確定している必要がある。
      // ここで電話番号から照合し直すと、画面の情報が空のときに電話番号が空の別の顧客に紐づいてしまう
      // （2026-10-01「別の予約をする」で笛木様に紐づいた不具合）。確定していなければ登録しない。
      const customerId = existingCustomer?.id;
      if (!customerId) {
        console.error("[予約] 顧客が確定していないため登録を中止しました");
        setError("お客様情報が確認できませんでした。お手数ですが最初からやり直してください。");
        setLoading(false);
        return;
      }
      const bookingBodies = [{
        store_id: store.id,
        course_id: course.id, course_name: course.name, course_duration: course.duration || "30分",
        staff_id: staff.id, staff_name: staff.name,
        booking_date: formatDate(date), booking_time: time,
        notes: profile.notes, booking_number: num,
      }];
      if (course2) {
        const dur1Min = parseInt((course.duration || "30分").replace(/[^0-9]/g, "")) || 30;
        bookingBodies.push({
          store_id: store.id,
          course_id: course2.id, course_name: course2.name, course_duration: course2.duration || "30分",
          staff_id: staff.id, staff_name: staff.name,
          booking_date: formatDate(date), booking_time: addMinutesToTime(time, dur1Min),
          notes: profile.notes, booking_number: "YR-" + (Date.now() + 1).toString().slice(-6),
        });
      }
      // 登録はサーバーで行い、customer_id がフォームの顧客（電話番号 or 検証済みLINE ID or マイページのセッションが一致）かを検証してもらう。
      // 予約変更の場合、元の予約のキャンセル（本人の予約か確認のうえ）と管理画面への通知もサーバーが行う。
      const createRes = await fetch("/api/booking-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          // 照合の材料は「フォームの電話番号」。LINEユーザーIDはサーバーが検証済みCookie/セッションから取得する。
          // existingCustomer 自身の値を送ると検証が素通りになるため使わない
          tel: profile.tel || "",
          match: customerMatchRef.current,
          bookings: bookingBodies,
          change_booking_id: changeBookingId || null,
        }),
      });
      const createData = await createRes.json().catch(() => ({}));
      const booking1Id = createData?.booking_id;
      // 予約が保存できていないのに「完了」と表示しないよう、ここで必ず検証する
      if (!createRes.ok || !booking1Id) {
        console.error("予約の登録に失敗:", createRes.status, createData);
        setError(createRes.status === 409
          ? "お客様情報が確認できなかったため、予約を登録できませんでした。お手数ですが最初からやり直してください。"
          : "予約の登録に失敗しました。通信状態をご確認のうえ、もう一度お試しください。");
        setLoading(false);
        return;
      }
      // 元の予約のキャンセルは booking-create が新しい予約の登録成功後に行う
      if (changeBookingId && !createData?.change_cancelled) console.error("元の予約のキャンセルに失敗しました");
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
      // 管理画面への通知は booking-create がサーバー側で行う
      setBookingNum(num);
      setScreen("complete");
    } catch (e) {
      // 予約が保存できたか不明な状態で「完了」と表示しない
      console.error("予約処理エラー:", e);
      setError("予約の登録に失敗しました。通信状態をご確認のうえ、もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    window.history.replaceState({}, '', '/src');
    setScreen("top"); setNotificationMethod(null); setStep(0);
    setStore(null); setCourse(null); setCourseCategory(null); setCourseVisitType(null);
    setShowAddEsthe(false); setCourse2(null); setCourseVisitType2(null);
    setStaff(null); setDate(null); setTime(null);
    setProfile({ name: "", kana: "", zipcode: "", address: "", tel: "", birthYear: "", birthMonth: "", birthDay: "", birthday: "", email: "", firstVisit: "初めて", notes: "" });
    setBookingNum(""); setError(""); setExistingCustomer(null);
    customerMatchRef.current = null;
    setStaffShiftDates({});
  };

  // 「別の予約をする」用：確定済みの顧客（existingCustomer・profile・通知方法）は残し、予約内容だけ初期化する。
  // 以前は reset() で顧客まで消したまま予約画面に戻していたため、2件目が電話番号の空の別人に紐づいていた。
  const resetForNextBooking = () => {
    window.history.replaceState({}, '', '/src');
    setStep(0);
    setStore(null); setCourse(null); setCourseCategory(null); setCourseVisitType(null);
    setShowAddEsthe(false); setCourse2(null); setCourseVisitType2(null);
    setStaff(null); setDate(null); setTime(null);
    setProfile(p => ({ ...p, notes: "" }));
    setBookingNum(""); setError("");
    setStaffShiftDates({});
    setScreen(existingCustomer ? "booking" : "top");
  };

  // 実在する日付かを検証する（「13月40日」のような値をDBに送らない）
  const isValidBirthday = (year, month, day) => {
    const y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10);
    if (!y || !m || !d) return false;
    if (String(year).length !== 4 || y < 1900 || y > new Date().getFullYear()) return false;
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  };

  const updateBirthday = (year, month, day) => {
    if (year && month && day && isValidBirthday(year, month, day)) {
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
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input ref={yearRef} inputMode="numeric" maxLength={4} placeholder="1990" value={profile.birthYear}
                  onChange={e => {
                    const y = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setProfile({ ...profile, birthYear: y, birthday: updateBirthday(y, profile.birthMonth, profile.birthDay) });
                    if (y.length === 4) monthRef.current?.focus();
                  }}
                  style={{ flex: 2, minWidth: 0, padding: "12px 8px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white", textAlign: "center", boxSizing: "border-box", outline: "none" }} />
                <span style={{ fontSize: 13, color: "#888", flexShrink: 0 }}>年</span>
                <input ref={monthRef} inputMode="numeric" maxLength={2} placeholder="04" value={profile.birthMonth}
                  onChange={e => {
                    const m = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setProfile({ ...profile, birthMonth: m, birthday: updateBirthday(profile.birthYear, m, profile.birthDay) });
                    if (m.length === 2) dayRef.current?.focus();
                  }}
                  style={{ flex: 1, minWidth: 0, padding: "12px 8px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white", textAlign: "center", boxSizing: "border-box", outline: "none" }} />
                <span style={{ fontSize: 13, color: "#888", flexShrink: 0 }}>月</span>
                <input ref={dayRef} inputMode="numeric" maxLength={2} placeholder="01" value={profile.birthDay}
                  onChange={e => {
                    const d = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setProfile({ ...profile, birthDay: d, birthday: updateBirthday(profile.birthYear, profile.birthMonth, d) });
                  }}
                  style={{ flex: 1, minWidth: 0, padding: "12px 8px", borderRadius: 12, border: "2px solid #e8ddd0", fontSize: 14, color: DARK, background: "white", textAlign: "center", boxSizing: "border-box", outline: "none" }} />
                <span style={{ fontSize: 13, color: "#888", flexShrink: 0 }}>日</span>
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
    // LINE連携済みの方は通知がLINEに届くため、ホーム画面追加・プッシュ通知の案内は出さない（通知の二重化を防ぐ）
    const isLineLinked = !!(existingCustomer?.line_user_id || existingCustomer?.has_line || authLineUserId
      || (typeof localStorage !== "undefined" && localStorage.getItem('yurari_line_user_id')));
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
          <button onClick={resetForNextBooking} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "2px solid " + GREEN, background: "white", color: GREEN, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 20 }}>別の予約をする</button>
          {isLineLinked && (
            <div style={{ background: "#f0f8f4", borderRadius: 16, padding: "16px 20px", marginBottom: 16, textAlign: "left", fontSize: 13, color: GREEN, fontWeight: 700, lineHeight: 1.7 }}>
              💚 予約の確認やお知らせはLINEに届きます
            </div>
          )}
          {!isLineLinked && !pushGranted && (
            <div style={{ background: "linear-gradient(135deg, #e8f5ee, #d4eddf)", borderRadius: 16, padding: "20px", marginBottom: 16, textAlign: "left", border: "1px solid " + LIGHT_GREEN }}>
              {pushStatus === "done" ? (
                <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, textAlign: "center" }}>✅ 通知を設定しました</div>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 6 }}>🔔 予約リマインドを受け取りますか？</div>
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 14, lineHeight: 1.7 }}>前日・当日にLINEまたはプッシュ通知でお知らせします</div>
                  <button onClick={handleRequestPush} disabled={pushStatus === "loading"} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: pushStatus === "loading" ? "#aaa" : GREEN, color: "white", fontSize: 14, fontWeight: 700, cursor: pushStatus === "loading" ? "not-allowed" : "pointer" }}>
                    {pushStatus === "loading" ? "設定中..." : "通知を受け取る"}
                  </button>
                  {!isStandalone && (
                    <div style={{ fontSize: 11, color: "#888", marginTop: 10, textAlign: "center" }}>📱 iPhoneの方はホーム画面に追加後に有効になります</div>
                  )}
                </>
              )}
            </div>
          )}
          {!isLineLinked && (
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
          )}
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
                {/* エステ追加ボタン（整体選択時のみ） */}
                {course && courseCategory === "整体" && !showAddEsthe && (
                  <button onClick={() => setShowAddEsthe(true)} style={{ marginTop: 16, width: "100%", padding: "14px", borderRadius: 14, border: "2px dashed " + LIGHT_GREEN, background: "#f0faf5", color: GREEN, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    ＋ エステも追加する（連続予約）
                  </button>
                )}
                {showAddEsthe && (
                  <div style={{ marginTop: 16, background: "#f0faf5", borderRadius: 16, padding: 16, border: "2px solid " + LIGHT_GREEN }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>連続予約 ― エステ</div>
                      <button onClick={() => { setShowAddEsthe(false); setCourse2(null); setCourseVisitType2(null); }}
                        style={{ padding: "4px 10px", borderRadius: 8, border: "none", background: "#e0e0e0", color: "#888", fontSize: 12, cursor: "pointer" }}>✕ 取消</button>
                    </div>
                    {!courseVisitType2 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {["初回の方", "2回目以降の方"].map(vt => (
                          <div key={vt} onClick={() => setCourseVisitType2(vt)} style={{ background: "white", border: "2px solid #e8ddd0", borderRadius: 12, padding: "16px", cursor: "pointer", textAlign: "center" }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: GREEN }}>{vt}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <button onClick={() => { setCourseVisitType2(null); setCourse2(null); }} style={{ marginBottom: 10, padding: "4px 12px", borderRadius: 8, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 12, cursor: "pointer" }}>← 戻る</button>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {courses.filter(c => (c.category || "整体") === "エステ" && (courseVisitType2 === "初回の方" ? c.is_first_only === true : c.is_first_only !== true)).map(c => (
                            <div key={c.id} onClick={() => setCourse2(c)} style={{ background: course2?.id === c.id ? GREEN + "15" : "white", border: "2px solid " + (course2?.id === c.id ? GREEN : "#e8ddd0"), borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>{c.name}</div>
                                  <div style={{ fontSize: 12, color: "#888" }}>{c.description}</div>
                                </div>
                                <div style={{ textAlign: "right", marginLeft: 12 }}>
                                  <div style={{ fontSize: 16, fontWeight: 700, color: ORANGE }}>{"¥" + (c.price ? c.price.toLocaleString() : "0")}</div>
                                  <div style={{ fontSize: 11, color: "#aaa" }}>{c.duration}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {courses.filter(c => (c.category || "整体") === "エステ" && (courseVisitType2 === "初回の方" ? c.is_first_only === true : c.is_first_only !== true)).length === 0 && (
                            <div style={{ textAlign: "center", padding: 20, color: "#aaa", background: "white", borderRadius: 12 }}>エステのコースがありません</div>
                          )}
                        </div>
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
                {staffList.map(s => (
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
                { label: "コース①", value: course ? course.name + "（" + course.duration + " / ¥" + (course.price ? course.price.toLocaleString() : "0") + "）" : "" },
                ...(course2 ? [{ label: "コース②", value: course2.name + "（" + course2.duration + " / ¥" + (course2.price ? course2.price.toLocaleString() : "0") + "）" }] : []),
                { label: "担当", value: staff ? staff.name : "" },
                { label: "日時", value: date && time ? date.getFullYear() + "年" + (date.getMonth()+1) + "月" + date.getDate() + "日（" + DAYS_JP[date.getDay()] + "） " + time + "〜" + (course2 && course ? " → " + addMinutesToTime(time, parseInt((course.duration||"30分").replace(/[^0-9]/g,""))||30) + "〜（連続）" : "") : "" },
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
