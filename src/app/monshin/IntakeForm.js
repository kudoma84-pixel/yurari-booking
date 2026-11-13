"use client";
// デジタル問診票（カウンセリングシート）の画面。入口は3つで、この1つの画面を共通で使う。
//   A mypage   … /mypage/monshin（Web予約済みの方が自宅で事前記入。マイページのログインを使う）
//   B counter  … /monshin?k=<受付トークン>（初めての方。お客様のスマホ、または &kiosk=1 で受付タブレット）
//   C customer … /monshin?k=<顧客限定トークン>（登録済みで未記入の方）
// 画面構成・質問項目・文言・必須項目はオーナー承認済みの試作（カウンセリングシート試作 index.html）に合わせている。
// 入力内容はこの画面の中（メモリ）だけに持ち、送信はサーバーAPI（/api/monshin/submit）経由。
import { Fragment, useEffect, useRef, useState } from "react";

const STEPS = ["ご確認とご同意", "お客様情報", "生活のこと", "お悩みのこと", "入力内容の確認", "完了"];
const CIRCLED = "①②③④⑤";
const DAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];
const KIOSK_RESET_MS = 30000;

const EMPTY = () => ({
  agree: false, editInfo: false,
  kana: "", name: "", gender: "", by: "", bm: "", bd: "", zip: "", addr: "", mobile: "", home: "", email: "", usesLine: "LINEで受け取る",
  found: [], introducer: "", job: "", commute: [], commuteMin: "", workHours: "", holiday: [], family: "",
  bath: "", bathMin: "", sleepPos: [], sleepHours: "", stress: [], stressOther: "",
  sportNow: "", sportPast: "", illness: "", medicine: "",
  symptoms: [{ what: "", since: "", tried: "", want: "" }], marks: [], note: "",
});

// 院のルール（試作の文面のまま。改変しない）
function Rules() {
  return (
    <div className="rules">
      <b>～ 気持ちよく施術を受けていただくために ～</b>
      <ol>
        <li>予約制ですので、来院時間をお守りください。</li>
        <li>予約時間に遅れる際は、必ず電話での連絡をお願いいたします。</li>
        <li>予約の変更は、必ず事前に連絡をしてください。</li>
        <li>予約時間を忘れてしまった場合は、後日でも必ず連絡をしてください。</li>
        <li>予約時間に遅れて来院された場合は、現在順番待ちをされている方の後の施術になります。（混雑時は後日の予約になります）</li>
        <li>無断キャンセルをした場合は、その後のご予約は受け付けません。</li>
        <li>無断キャンセル、当日キャンセル、予約時間の1時間以内の変更は施術料の100％の金額をご負担いただきます。</li>
        <li>院内では、携帯電話の通話はご遠慮ください。また設定をマナーモードにしてください。</li>
        <li>ひどく汚れた服装での来院はご遠慮ください。</li>
      </ol>
      <b>■ 施術を受けられる方へ ■</b>
      <ul>
        <li>当院での整体法は、他の整体療法、カイロプラクティック等の施術とは全く異なります。施術時間もその方の状態により異なります。</li>
        <li>症状を根本に改善する方法ですから、慰安的な刺激や施術の回数で判断される方は最初からご遠慮ください。</li>
        <li>お身体はわずかな刺激であっても疲労することがあります。当院の整体法はお身体にご負担の無い刺激で出来るだけ短時間で症状を改善させる整体法です。</li>
        <li>施術時間は通常10分～20分程度です。施術箇所の多さにより前後します。</li>
        <li>施術方法や施術時間は、その日の体調や症状によって変わります。</li>
        <li>施術は基本的に痛みを伴うことは少ないです。施術中はリラックスして楽な呼吸をしてください。</li>
        <li>基本は手技のみで行います。症状に応じて胸部、腹部、臀部、股関節周辺等にアプローチをする場合もあります。</li>
        <li>症状によってはご予約時間通りに施術が出来ず、お待ちいただく場合があります。</li>
        <li>慢性症状の場合は一度の施術では変化が感じられない場合もあります。繰り返し施術をすることで改善が見込めます。</li>
        <li>楽な時ほど無理な運動や睡眠不足にならないように注意してください。</li>
        <li>当院では初回を含めて6回の施術を改善の目安としております。（初回から3回目までは3日～4日毎、4回～6回目は1週間毎が基本）</li>
        <li>施術後には、その方の状態に合わせて最適なご予約の日程をご提案します。</li>
      </ul>
    </div>
  );
}

const CSS = `
.ms{--bg:#FFFFFF;--field:#FAFAF7;--card:#ffffff;--ink:#2f3a2f;--sub:#6b6b6b;--line:#e3e3dc;--green:#3a5a3a;--green2:#5a9e7a;--soft:#eef5ef;--accent:#E8742A;--warn:#b3261e;--chip:#f5f5f0;--chipOn:#3a5a3a;--chipOnInk:#fff;
  background:var(--bg);color:var(--ink);font-family:"Noto Sans JP",system-ui,sans-serif;font-size:16px;line-height:1.7;min-height:100vh}
.ms *{box-sizing:border-box}
.ms.tablet{font-size:19px}
.ms .wrap{max-width:640px;margin:0 auto;padding:16px 16px 120px}
.ms.tablet .wrap{max-width:820px;padding:24px 28px 140px}
.ms header.brand{text-align:center;margin:6px 0 14px}
.ms header.brand .n{font-weight:700;color:var(--green);font-size:1.15em;letter-spacing:.06em}
.ms header.brand .t{font-size:.86em;color:var(--sub)}
.ms .steps{display:flex;gap:4px;margin:0 0 16px}
.ms .steps span{flex:1;height:6px;border-radius:3px;background:var(--line)}
.ms .steps span.on{background:var(--green2)}
.ms .stepname{font-size:.82em;color:var(--sub);margin-bottom:6px}
.ms .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 16px;margin-bottom:14px}
.ms.tablet .card{padding:24px 24px}
.ms h2{font-size:1.15em;margin:0 0 4px;color:var(--green)}
.ms .lead{color:var(--sub);font-size:.9em;margin:0 0 12px}
.ms .field{margin:14px 0}
.ms .field > label,.ms .qlabel{display:block;font-weight:700;font-size:.95em;margin-bottom:6px}
.ms .req{display:inline-block;font-size:.72em;color:#fff;background:var(--accent);border-radius:4px;padding:0 6px;margin-left:6px;vertical-align:middle;font-weight:500}
.ms .opt{display:inline-block;font-size:.72em;color:var(--sub);border:1px solid var(--line);border-radius:4px;padding:0 6px;margin-left:6px;vertical-align:middle;font-weight:500}
.ms .hint{font-size:.8em;color:var(--sub);margin-top:4px}
.ms input[type=text],.ms input[type=tel],.ms input[type=email],.ms input[type=number],.ms select,.ms textarea{width:100%;font:inherit;color:var(--ink);background:var(--field);border:2px solid var(--line);border-radius:12px;padding:10px 12px;outline:none}
.ms input:focus,.ms select:focus,.ms textarea:focus{border-color:var(--green2)}
.ms textarea{min-height:64px;resize:vertical}
.ms .row{display:flex;gap:8px}
.ms .row > *{flex:1;min-width:0}
.ms .inline{display:flex;gap:8px;align-items:center}
.ms .inline input{max-width:110px}
.ms .chips{display:flex;flex-wrap:wrap;gap:8px}
.ms .chip{border:2px solid var(--line);background:var(--chip);color:var(--ink);border-radius:999px;padding:7px 14px;font:inherit;font-size:.92em;cursor:pointer}
.ms.tablet .chip{padding:10px 18px}
.ms .chip.on{background:var(--chipOn);border-color:var(--chipOn);color:var(--chipOnInk);font-weight:700}
.ms .err{color:var(--warn);font-size:.85em;margin-top:6px}
.ms .rules{max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:var(--bg);font-size:.88em}
.ms .rules ol,.ms .rules ul{padding-left:1.3em;margin:6px 0}
.ms .rules li{margin:4px 0}
.ms .agree{display:flex;gap:10px;align-items:flex-start;margin-top:14px;font-weight:700}
.ms .agree input{width:24px;height:24px;margin-top:3px;accent-color:var(--green2)}
.ms .btns{position:fixed;left:0;right:0;bottom:0;background:linear-gradient(transparent,var(--bg) 30%);padding:18px 16px calc(16px + env(safe-area-inset-bottom))}
.ms .btns .in{max-width:640px;margin:0 auto;display:flex;gap:10px}
.ms.tablet .btns .in{max-width:820px}
.ms .btn{flex:2;border:none;border-radius:14px;padding:15px;font:inherit;font-weight:700;background:var(--green);color:var(--chipOnInk);cursor:pointer;text-decoration:none;text-align:center;display:block}
.ms .btn.sub{flex:1;background:var(--card);color:var(--sub);border:2px solid var(--line)}
.ms .btn:disabled{opacity:.45;cursor:default}
.ms .sym{border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:10px 0;background:var(--bg)}
.ms .sym .h{display:flex;justify-content:space-between;align-items:center;font-weight:700;color:var(--green)}
.ms .sym .x{border:none;background:none;color:var(--sub);font:inherit;font-size:.85em;cursor:pointer}
.ms .addbtn{width:100%;border:2px dashed var(--line);background:none;color:var(--green);border-radius:14px;padding:12px;font:inherit;font-weight:700;cursor:pointer}
.ms .bodywrap{position:relative;max-width:420px;margin:8px auto 0;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.ms .bodywrap img{width:100%;display:block;border-radius:10px;background:#fff}
.ms .mark{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;color:var(--warn);font-weight:700;font-size:26px;line-height:30px;text-align:center;pointer-events:none;text-shadow:0 0 3px #fff,0 0 3px #fff}
.ms .bodylbl{display:grid;grid-template-columns:1fr 1fr;text-align:center;max-width:420px;margin:2px auto 0;font-size:.85em;color:var(--sub)}
.ms .bodybar{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:.85em;color:var(--sub)}
.ms .bodybar button{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:4px 12px;font:inherit;cursor:pointer}
.ms dl.sum{margin:0;display:grid;grid-template-columns:8.5em 1fr;gap:6px 12px;font-size:.92em}
.ms dl.sum dt{color:var(--sub)}
.ms dl.sum dd{margin:0;word-break:break-word}
.ms .done{text-align:center;padding:28px 12px}
.ms .done .ok{font-size:46px}
.ms .qr{width:220px;height:220px;margin:14px auto;border:2px solid var(--line);border-radius:12px;display:block;background:#fff}
.ms .count{font-size:.85em;color:var(--sub);margin-top:10px}
.ms .prebn{background:var(--soft);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 14px;font-size:.92em}
.ms .prebn b{color:var(--green)}
.ms .editlink{border:none;background:none;color:var(--green);font:inherit;font-weight:700;text-decoration:underline;cursor:pointer;padding:0;margin-top:12px}
.ms .notice{background:#fff3cd;color:#6b4e00;border:1px solid #f0d58a;border-radius:10px;padding:8px 12px;font-size:.85em;margin-bottom:12px}
.ms .submiterr{background:#fdecea;color:var(--warn);border:1px solid #f5c2bd;border-radius:10px;padding:10px 12px;font-size:.9em;margin-bottom:12px}
`;

function Chips({ value, options, multi, onChange }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = multi ? value.includes(o) : value === o;
        return (
          <button key={o} type="button" className={"chip" + (on ? " on" : "")}
            onClick={() => onChange(multi ? (on ? value.filter((x) => x !== o) : [...value, o]) : (on ? "" : o))}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

const formatBookingLabel = (nb) => {
  if (!nb?.date) return "";
  const [y, m, d] = nb.date.split("-").map(Number);
  const dow = DAYS_JP[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}月${d}日（${dow}）${nb.time ? "　" + nb.time : ""}　${nb.store_name || ""}`;
};

const contactLabel = (c) => (c === "line" ? "LINEで受け取る" : c === "email" ? "メールで受け取る" : "未設定");

// 登録済みの方の値を入力欄に入れる
function stateFromProfile(p) {
  const [by, bm, bd] = (p?.birthday || "").split("-");
  return {
    kana: p?.kana || "", name: p?.name || "", gender: p?.gender || "",
    by: by || "", bm: bm ? String(Number(bm)) : "", bd: bd ? String(Number(bd)) : "",
    zip: p?.zipcode || "", addr: p?.address || "", mobile: p?.tel || "", home: p?.tel2 || "", email: p?.email || "",
    usesLine: p?.contact === "email" ? "メールで受け取る" : "LINEで受け取る",
  };
}

const profileComplete = (p) => !!(p?.name && p?.kana && /^\d{4}-\d{2}-\d{2}$/.test(p?.birthday || "")
  && String(p?.tel || "").replace(/\D/g, "").length >= 10);

export default function IntakeForm({ entry }) {
  const [phase, setPhase] = useState("loading"); // loading | ready | error | closed
  const [errorMsg, setErrorMsg] = useState("");
  const [ctx, setCtx] = useState(null); // { mode, kiosk, profile, next_booking, k }
  const [S, setS] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [errs, setErrs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [result, setResult] = useState(null); // { line_link_url, qr, line_linked }
  const [left, setLeft] = useState(0);
  const timerRef = useRef(null);
  const bodyRef = useRef(null);

  const set = (patch) => setS((s) => ({ ...s, ...patch }));
  const top = () => window.scrollTo(0, 0);

  // ── 読み込み（どの入口か判定） ─────────────────────
  useEffect(() => {
    (async () => {
      const k = entry === "token" ? new URLSearchParams(window.location.search).get("k") || "" : "";
      if (entry === "token" && !k) { setErrorMsg("このページは受付でお渡ししたQRコードから開いてください。"); setPhase("error"); return; }
      const load = () => fetch("/api/monshin/context", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ k }),
      }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }));
      try {
        let r = await load();
        if (entry === "mypage" && r.status === 401) {
          // 未ログイン：LINEアプリ内なら LINE で自動ログイン（連携済みの方のみ）。だめならマイページのログインへ（戻り先はここ）
          if (/\bLine\//i.test(navigator.userAgent) && process.env.NEXT_PUBLIC_LIFF_ID_MYPAGE) {
            try {
              const liff = (await import("@line/liff")).default;
              await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID_MYPAGE });
              if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.href }); return; }
              const lr = await fetch("/api/mypage/line-login", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: liff.getAccessToken() }),
              });
              if (lr.ok) r = await load();
            } catch (e) {
              console.error("LINE auto login error:", e);
            }
          }
          if (r.status === 401) { window.location.replace("/mypage?next=" + encodeURIComponent("/mypage/monshin")); return; }
        }
        if (!r.ok) { setErrorMsg(r.data?.error || "読み込みに失敗しました。受付でお声がけください。"); setPhase("error"); return; }
        const c = { ...r.data, k };
        setCtx(c);
        const init = EMPTY();
        if (c.profile) {
          Object.assign(init, stateFromProfile(c.profile));
          // 登録内容に足りない項目（生年月日など）があれば、最初から入力欄で開く
          if (!profileComplete(c.profile)) init.editInfo = true;
        }
        setS(init);
        setPhase("ready");
      } catch (e) {
        console.error(e);
        setErrorMsg("読み込みに失敗しました。通信状態をご確認のうえ、もう一度お開きください。");
        setPhase("error");
      }
    })();
  }, [entry]);

  const kiosk = !!ctx?.kiosk;
  const registered = ctx?.mode === "mypage" || ctx?.mode === "customer";
  const confirmOnly = registered && !S.editInfo;

  // ── 受付タブレット：完了から30秒で最初に戻り、入力内容を消す ─────────
  const resetKiosk = () => {
    clearInterval(timerRef.current);
    setResult(null); setErrs({}); setSubmitErr("");
    if (ctx?.mode === "customer") {
      // 顧客限定の画面は、次の方に前の方のご登録内容が見えないよう閉じる（もう一度開くには受付で発行し直す）
      setS(EMPTY()); setCtx((c) => ({ ...c, profile: null, next_booking: null })); setPhase("closed");
    } else {
      setS(EMPTY()); setStep(0);
    }
    top();
  };
  useEffect(() => {
    if (step !== 5 || !kiosk) return;
    const until = Date.now() + KIOSK_RESET_MS;
    setLeft(Math.ceil(KIOSK_RESET_MS / 1000));
    timerRef.current = setInterval(() => {
      const ms = until - Date.now();
      if (ms <= 0) resetKiosk(); else setLeft(Math.ceil(ms / 1000));
    }, 500);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, kiosk]);

  // 郵便番号から住所を入れる（予約フォーム・管理画面と同じ zipcloud）
  const onZip = async (v) => {
    set({ zip: v });
    const zip = v.replace(/\D/g, "");
    if (zip.length !== 7 || S.addr.trim()) return;
    try {
      const res = await fetch("https://zipcloud.ibsnet.co.jp/api/search?zipcode=" + zip);
      const data = await res.json();
      const r = data?.results?.[0];
      if (r) setS((s) => (s.addr.trim() ? s : { ...s, addr: r.address1 + r.address2 + r.address3 }));
    } catch { /* 住所は手で入れてもらう */ }
  };

  const validate = () => {
    const e = {};
    if (step === 1 && !confirmOnly) {
      if (!S.kana.trim()) e.kana = "ふりがなを入力してください";
      if (!S.name.trim()) e.name = "お名前を入力してください";
      if (!(S.by && S.bm && S.bd)) e.birth = "生年月日を選んでください";
      const tel = S.mobile.replace(/\D/g, "");
      if (!tel) e.mobile = "携帯電話の番号を入力してください";
      else if (tel.length < 10 || tel.length > 11) e.mobile = "携帯電話の番号を確認してください";
      const zip = S.zip.replace(/\D/g, "");
      if (zip && zip.length !== 7) e.zip = "郵便番号は7桁で入力してください";
      if (S.usesLine === "メールで受け取る" && !S.email.trim()) e.email = "メールアドレスを入力してください";
      else if (S.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S.email.trim())) e.email = "メールアドレスの形式が正しくありません";
    }
    if (step === 3 && !S.symptoms[0].what.trim()) e.sym = "1つ目のお悩みを入力してください";
    setErrs(e);
    if (Object.keys(e).length > 0) {
      setTimeout(() => document.querySelector(".ms .err")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return false;
    }
    return true;
  };

  const birthday = S.by && S.bm && S.bd ? `${S.by}-${String(S.bm).padStart(2, "0")}-${String(S.bd).padStart(2, "0")}` : "";

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true); setSubmitErr("");
    try {
      const r = await fetch("/api/monshin/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          k: ctx.k || undefined,
          consent: S.agree,
          edited: !confirmOnly,
          profile: confirmOnly ? undefined : {
            name: S.name, kana: S.kana, gender: S.gender, birthday, zipcode: S.zip, address: S.addr,
            tel: S.mobile, tel2: S.home, email: S.email, contact: S.usesLine === "メールで受け取る" ? "email" : "line",
          },
          answers: {
            found: S.found, introducer: S.found.includes("ご紹介") ? S.introducer : "", job: S.job,
            commute: S.commute, commuteMin: S.commuteMin, workHours: S.workHours, holiday: S.holiday, family: S.family,
            bath: S.bath, bathMin: S.bath === "湯船につかる" ? S.bathMin : "", sleepPos: S.sleepPos, sleepHours: S.sleepHours,
            stress: S.stress, stressOther: S.stress.includes("その他") ? S.stressOther : "",
            sportNow: S.sportNow, sportPast: S.sportPast, illness: S.illness, medicine: S.medicine,
            symptoms: S.symptoms, note: S.note,
          },
          marks: S.marks,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 410) { setErrorMsg(data.error || "このページの有効期限が切れています。受付でお声がけください。"); setPhase("error"); return; }
        setSubmitErr(data.error || "送信できませんでした。もう一度「送信する」を押してください。");
        return;
      }
      let qr = null;
      if (data.line_link_url && kiosk) {
        const QRCode = (await import("qrcode")).default;
        qr = await QRCode.toDataURL(data.line_link_url, { width: 440, margin: 1 });
      }
      setResult({ line_link_url: data.line_link_url || null, qr, line_linked: !!data.line_linked });
      setStep(5); top();
    } catch (e) {
      console.error(e);
      setSubmitErr("送信できませんでした。通信状態をご確認のうえ、もう一度「送信する」を押してください。");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 5) { if (kiosk) resetKiosk(); return; }
    if (!validate()) return;
    if (step === 4) { submit(); return; }
    setStep(step + 1); top();
  };
  const back = () => { if (step > 0 && step < 5) { setErrs({}); setSubmitErr(""); setStep(step - 1); top(); } };

  const onBodyClick = (e) => {
    const el = bodyRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
    const hit = S.marks.findIndex((m) => Math.hypot((m.x - x) * r.width / 100, (m.y - y) * r.height / 100) < 22);
    if (hit >= 0) set({ marks: S.marks.filter((_, i) => i !== hit) });
    else if (S.marks.length < 60) set({ marks: [...S.marks, { x: +x.toFixed(1), y: +y.toFixed(1) }] });
  };

  const ac = kiosk ? "off" : undefined; // 受付タブレットでは前の方の入力を候補に出さない
  const inp = (key, type = "text", ph = "", extra = {}) => (
    <input type={type} value={S[key]} placeholder={ph} autoComplete={ac} onChange={(e) => set({ [key]: e.target.value })} {...extra} />
  );
  const ta = (key, ph = "") => <textarea value={S[key]} placeholder={ph} autoComplete={ac} onChange={(e) => set({ [key]: e.target.value })} />;
  const Err = ({ k }) => (errs[k] ? <div className="err">{errs[k]}</div> : null);
  const nowYear = new Date().getFullYear();

  if (phase !== "ready") {
    return (
      <div className={"ms" + (kiosk ? " tablet" : "")}>
        <style>{CSS}</style>
        <div className="wrap">
          <header className="brand"><div className="n">整体院 癒楽里</div><div className="t">カウンセリングシート（ご来院前のご記入）</div></header>
          {phase === "loading" && <div className="card" style={{ textAlign: "center", color: "#888" }}>読み込んでいます…</div>}
          {phase === "error" && (
            <div className="card" style={{ textAlign: "center" }}>
              <h2 style={{ color: "#b3261e" }}>ご記入いただけません</h2>
              <p style={{ whiteSpace: "pre-line" }}>{errorMsg}</p>
            </div>
          )}
          {phase === "closed" && (
            <div className="card done">
              <div className="ok">✅</div><h2>ご記入ありがとうございました</h2>
              <p>この端末を受付にお戻しください。</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const stepNames = STEPS.map((n, i) => (i === 1 && confirmOnly ? "ご登録内容の確認" : n));
  const nb = ctx.next_booking;
  const p = ctx.profile;
  const wantsLine = S.usesLine === "LINEで受け取る";

  const row = (k, v) => (v ? <><dt>{k}</dt><dd>{v}</dd></> : null);

  return (
    <div className={"ms" + (kiosk ? " tablet" : "")}>
      <style>{CSS}</style>
      <div className="wrap">
        <header className="brand"><div className="n">整体院 癒楽里</div><div className="t">カウンセリングシート（ご来院前のご記入）</div></header>
        <div className="steps">{STEPS.map((_, i) => <span key={i} className={i <= step ? "on" : ""} />)}</div>
        {registered && p && step < 5 && (
          <div className="prebn">
            <b>{p.name} 様</b>　{nb ? "ご予約ありがとうございます。" : ""}
            {nb && <><br />{formatBookingLabel(nb)}</>}
            <br />ご来院前に、カウンセリングシートのご記入をお願いします（約5分）。
          </div>
        )}
        <div className="stepname">{Math.min(step + 1, STEPS.length)} / {STEPS.length}　{stepNames[step]}</div>

        {step === 0 && (
          <section className="card">
            <h2>はじめにお読みください</h2>
            <p className="lead">ご記入の前に、当院からのお願いをご確認ください。</p>
            <Rules />
            <label className="agree"><input type="checkbox" checked={S.agree} onChange={(e) => set({ agree: e.target.checked })} /> 上記の内容を読み、了承しました</label>
          </section>
        )}

        {step === 1 && confirmOnly && (
          <section className="card">
            <h2>ご登録内容の確認</h2>
            <p className="lead">ご予約のときにご登録いただいた内容です。お間違いがなければ「次へ」へお進みください。</p>
            <dl className="sum">
              <dt>お名前</dt><dd>{p.name}（{p.kana}）</dd>
              <dt>生年月日</dt><dd>{p.birthday ? p.birthday.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日`) : ""}</dd>
              <dt>携帯電話</dt><dd>{p.tel}</dd>
              <dt>ご連絡方法</dt><dd>{contactLabel(p.contact)}</dd>
            </dl>
            <button type="button" className="editlink" onClick={() => set({ editInfo: true })}>内容を修正する・ご住所などを追加する</button>
          </section>
        )}

        {step === 1 && !confirmOnly && (
          <section className="card">
            <h2>お客様情報</h2>
            <p className="lead">ご予約や会員登録にも使います。</p>
            {registered && !profileComplete(p) && <div className="notice">ご登録に足りない項目があります。ご入力をお願いします。</div>}
            <div className="field"><label>ふりがな<span className="req">必須</span></label>{inp("kana", "text", "やまだ はなこ")}<Err k="kana" /></div>
            <div className="field"><label>お名前<span className="req">必須</span></label>{inp("name", "text", "山田 花子")}<Err k="name" /></div>
            <div className="field"><label>性別<span className="opt">任意</span></label><Chips value={S.gender} options={["男性", "女性", "回答しない"]} onChange={(v) => set({ gender: v })} /></div>
            <div className="field"><label>生年月日<span className="req">必須</span></label>
              <div className="row">
                <select value={S.by} onChange={(e) => set({ by: e.target.value })}>
                  <option value="">年</option>
                  {Array.from({ length: nowYear - 1920 + 1 }, (_, i) => nowYear - i).map((y) => <option key={y} value={String(y)}>{y}</option>)}
                </select>
                <select value={S.bm} onChange={(e) => set({ bm: e.target.value })}>
                  <option value="">月</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={String(m)}>{m}</option>)}
                </select>
                <select value={S.bd} onChange={(e) => set({ bd: e.target.value })}>
                  <option value="">日</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={String(d)}>{d}</option>)}
                </select>
              </div>
              <div className="hint">マイページのログイン（携帯番号の下4桁＋誕生日）にも使います</div>
              <Err k="birth" />
            </div>
            <div className="field"><label>郵便番号<span className="opt">任意</span></label>
              <input type="tel" inputMode="numeric" value={S.zip} placeholder="336-0025" autoComplete={ac} style={{ maxWidth: 180 }} onChange={(e) => onZip(e.target.value)} />
              <div className="hint">郵便番号を入れると、ご住所が自動で入ります</div><Err k="zip" /></div>
            <div className="field"><label>ご住所<span className="opt">任意</span></label>{inp("addr", "text", "さいたま市南区…")}</div>
            <div className="field"><label>携帯電話<span className="req">必須</span></label>{inp("mobile", "tel", "090-1234-5678", { inputMode: "tel" })}<Err k="mobile" /></div>
            <div className="field"><label>ご自宅の電話<span className="opt">任意</span></label>{inp("home", "tel", "048-…", { inputMode: "tel" })}</div>
            <div className="field"><label className="qlabel">ご予約の連絡の受け取り方</label>
              <Chips value={S.usesLine} options={["LINEで受け取る", "メールで受け取る"]} onChange={(v) => set({ usesLine: v || S.usesLine })} /></div>
            <div className="field"><label>メールアドレス{S.usesLine === "メールで受け取る" ? <span className="req">必須</span> : <span className="opt">任意</span>}</label>
              {inp("email", "email", "example@mail.com", { inputMode: "email", autoCapitalize: "off" })}<Err k="email" /></div>
          </section>
        )}

        {step === 2 && (
          <section className="card">
            <h2>生活のこと</h2>
            <p className="lead">分かる範囲でお答えください。施術の参考にします。</p>
            <div className="field"><label className="qlabel">当院を何でお知りになりましたか？（いくつでも）</label>
              <Chips multi value={S.found} options={["看板", "ホームページ", "Googleマップ", "ホットペッパー", "エキテン", "EPARK", "楽天ビューティー", "チラシ", "LINE", "ご紹介"]} onChange={(v) => set({ found: v })} />
              {S.found.includes("ご紹介") && <div style={{ marginTop: 8 }}>{inp("introducer", "text", "ご紹介者のお名前")}</div>}</div>
            <div className="field"><label>ご職業</label>{inp("job", "text", "例：事務職、主婦、学生")}</div>
            <div className="field"><label className="qlabel">通勤方法と時間</label>
              <Chips multi value={S.commute} options={["車", "電車", "バス", "自転車", "徒歩", "在宅"]} onChange={(v) => set({ commute: v })} />
              <div className="inline" style={{ marginTop: 8 }}>片道 {inp("commuteMin", "number", "30", { inputMode: "numeric" })} 分</div></div>
            <div className="field"><label className="qlabel">お仕事の時間・お休み</label>
              <div className="inline">1日 {inp("workHours", "number", "8", { inputMode: "numeric" })} 時間</div>
              <div style={{ marginTop: 8 }}><Chips multi value={S.holiday} options={["月", "火", "水", "木", "金", "土", "日", "不定休"]} onChange={(v) => set({ holiday: v })} /></div></div>
            <div className="field"><label>同居されているご家族</label>{inp("family", "text", "例：夫、子ども2人")}</div>
            <div className="field"><label className="qlabel">入浴</label>
              <Chips value={S.bath} options={["シャワーのみ", "湯船につかる"]} onChange={(v) => set({ bath: v })} />
              {S.bath === "湯船につかる" && <div className="inline" style={{ marginTop: 8 }}>約 {inp("bathMin", "number", "15", { inputMode: "numeric" })} 分</div>}</div>
            <div className="field"><label className="qlabel">寝るときの姿勢（いくつでも）と睡眠時間</label>
              <Chips multi value={S.sleepPos} options={["仰向け", "うつ伏せ", "右向き", "左向き"]} onChange={(v) => set({ sleepPos: v })} />
              <div className="inline" style={{ marginTop: 8 }}>約 {inp("sleepHours", "number", "6", { inputMode: "numeric" })} 時間</div></div>
            <div className="field"><label className="qlabel">ストレスを感じていること（いくつでも）</label>
              <Chips multi value={S.stress} options={["体調", "家族", "仕事", "育児", "介護", "特にない", "その他"]} onChange={(v) => set({ stress: v })} />
              {S.stress.includes("その他") && <div style={{ marginTop: 8 }}>{inp("stressOther", "text", "その他の内容")}</div>}</div>
            <div className="field"><label>普段している運動</label>{inp("sportNow", "text", "例：ウォーキング週2回")}</div>
            <div className="field"><label>過去にしていた運動</label>{inp("sportPast", "text", "例：学生時代にバレーボール")}</div>
            <div className="field"><label>これまでの病気・怪我</label>{ta("illness", "例：10年前にぎっくり腰、骨折など")}</div>
            <div className="field"><label>現在飲んでいるお薬</label>{ta("medicine", "例：血圧の薬、痛み止め　など（なければ「なし」）")}</div>
          </section>
        )}

        {step === 3 && (
          <>
            <section className="card">
              <h2>お悩みのこと</h2>
              <p className="lead">お悩みの症状を、気になる順に最大5つまで教えてください（身体・メンタルなど）。</p>
              {S.symptoms.map((s, i) => {
                const upd = (f, v) => set({ symptoms: S.symptoms.map((x, j) => (j === i ? { ...x, [f]: v } : x)) });
                const field = (f, label, ph, req) => (
                  <div className="field"><label>{label}{req && <span className="req">必須</span>}</label>
                    <input type="text" value={s[f]} placeholder={ph} autoComplete={ac} onChange={(e) => upd(f, e.target.value)} /></div>
                );
                return (
                  <div className="sym" key={i}>
                    <div className="h">{CIRCLED[i]} のお悩み {S.symptoms.length > 1 && <button type="button" className="x" onClick={() => set({ symptoms: S.symptoms.filter((_, j) => j !== i) })}>削除</button>}</div>
                    {field("what", "症状", "例：右の腰が痛い", i === 0)}
                    {field("since", "いつから・きっかけ", "例：3か月前、重い物を持ってから")}
                    {field("tried", "これまでの対処", "例：湿布、整形外科で電気治療")}
                    {field("want", "この症状がなくなったら何をしたいですか？", "例：孫と公園で遊びたい")}
                  </div>
                );
              })}
              <Err k="sym" />
              {S.symptoms.length < 5 && <button type="button" className="addbtn" onClick={() => set({ symptoms: [...S.symptoms, { what: "", since: "", tried: "", want: "" }] })}>＋ お悩みを追加</button>}
            </section>
            <section className="card">
              <h2>お悩みの場所</h2>
              <p className="lead">図の気になるところをタップすると「×」が付きます。もう一度タップすると消えます。</p>
              <div className="bodywrap" ref={bodyRef} onClick={onBodyClick}>
                <img src="/monshin-body.jpg" alt="体の図（前・後ろ）" draggable={false} />
                {S.marks.map((m, i) => <div key={i} className="mark" style={{ left: m.x + "%", top: m.y + "%" }}>×</div>)}
              </div>
              <div className="bodylbl"><span>前</span><span>後ろ</span></div>
              <div className="bodybar"><span>印：{S.marks.length}か所</span><button type="button" onClick={() => set({ marks: [] })}>すべて消す</button></div>
            </section>
            <section className="card">
              <h2>その他、伝えたいこと</h2>
              {ta("note", "ご自由にお書きください")}
            </section>
          </>
        )}

        {step === 4 && (
          <section className="card">
            <h2>入力内容の確認</h2>
            <p className="lead">内容をご確認のうえ「送信する」を押してください。</p>
            {submitErr && <div className="submiterr">{submitErr}</div>}
            <dl className="sum">
              {row("お名前", S.name + (S.kana ? `（${S.kana}）` : ""))}
              {row("性別", S.gender)}
              {row("生年月日", S.by && S.bm && S.bd ? `${S.by}年${S.bm}月${S.bd}日` : "")}
              {row("ご住所", [S.zip ? "〒" + S.zip : "", S.addr].filter(Boolean).join(" "))}
              {row("携帯電話", S.mobile)}{row("ご自宅", S.home)}{row("メール", S.email)}
              {row("連絡の受け取り", confirmOnly ? contactLabel(p?.contact) : S.usesLine)}
              {row("知ったきっかけ", S.found.join("・") + (S.found.includes("ご紹介") && S.introducer ? `（${S.introducer}様）` : ""))}
              {row("ご職業", S.job)}
              {row("通勤", S.commute.join("・") + (S.commuteMin ? ` 片道${S.commuteMin}分` : ""))}
              {row("お仕事", (S.workHours ? `1日${S.workHours}時間` : "") + (S.holiday.length ? ` 休日：${S.holiday.join("・")}` : ""))}
              {row("同居のご家族", S.family)}
              {row("入浴", S.bath + (S.bath === "湯船につかる" && S.bathMin ? `（約${S.bathMin}分）` : ""))}
              {row("睡眠", S.sleepPos.join("・") + (S.sleepHours ? ` 約${S.sleepHours}時間` : ""))}
              {row("ストレス", S.stress.filter((x) => x !== "その他").concat(S.stress.includes("その他") && S.stressOther ? [S.stressOther] : []).join("・"))}
              {row("普段の運動", S.sportNow)}{row("過去の運動", S.sportPast)}
              {row("病気・怪我", S.illness)}{row("お薬", S.medicine)}
              {S.symptoms.filter((s) => s.what).map((s, i) => (
                <Fragment key={i}>
                  {row(`お悩み${CIRCLED[i]}`, [s.what, s.since && `いつから：${s.since}`, s.tried && `対処：${s.tried}`, s.want && `したいこと：${s.want}`].filter(Boolean).join(" ／ "))}
                </Fragment>
              ))}
              {row("お悩みの場所", S.marks.length ? `${S.marks.length}か所に印` : "")}
              {row("伝えたいこと", S.note)}
            </dl>
          </section>
        )}

        {step === 5 && ctx.mode === "mypage" && (
          <section className="card done">
            <div className="ok">✅</div><h2>ご記入ありがとうございました</h2>
            <p>当日はこのままお越しいただき、受付でお名前をお伝えください。<br />ご記入内容は施術者が事前に拝見し、当日のカウンセリングに活かします。</p>
            <p className="hint">内容を直したいときは、当日受付でお申し付けください。</p>
            {result?.line_link_url && <a className="btn" href={result.line_link_url} style={{ marginTop: 16 }}>LINEで受け取る設定へ</a>}
            <a className="btn sub" href="/mypage" style={{ marginTop: 10 }}>マイページへ戻る</a>
          </section>
        )}

        {step === 5 && ctx.mode !== "mypage" && kiosk && (
          <section className="card done">
            <div className="ok">✅</div><h2>ご記入ありがとうございました</h2>
            <p>内容は受付に届きました。お名前をお呼びするまでお待ちください。</p>
            {result?.qr && (
              <>
                <p style={{ fontWeight: 700, marginTop: 18 }}>LINEでご予約の連絡を受け取るために、<br />ご自分のスマホでこのQRを読み取ってください</p>
                <img className="qr" src={result.qr} alt="LINE連携QR" />
              </>
            )}
            <div className="count">このあと画面は自動で最初に戻り、入力内容は消えます（あと{left}秒）。<br />
              <button type="button" className="btn sub" onClick={resetKiosk} style={{ marginTop: 10, maxWidth: 260, marginLeft: "auto", marginRight: "auto" }}>次の方へ（すぐに消す）</button>
            </div>
          </section>
        )}

        {step === 5 && ctx.mode !== "mypage" && !kiosk && (
          <section className="card done">
            <div className="ok">✅</div><h2>ご記入ありがとうございました</h2>
            {result?.line_link_url ? (
              <>
                <p>内容は受付に届きました。<br />続けて、ご予約のリマインドなどをLINEで受け取る設定をお願いします。</p>
                <a className="btn" href={result.line_link_url} style={{ marginTop: 16, background: "#06C755" }}>LINEで受け取る設定へ</a>
              </>
            ) : (
              <p>内容は受付に届きました。{wantsLine && result?.line_linked
                ? <><br />ご予約のリマインドなどはLINEでお届けします。</>
                : !wantsLine ? <><br />ご予約のご連絡はメールでお届けします。</> : null}</p>
            )}
            <p className="hint">ご予約の確認・変更は、{result?.line_linked || result?.line_link_url ? "LINEのメニュー「マイページ」" : "マイページ"}からいつでもできます。</p>
          </section>
        )}
      </div>

      {!(step === 5 && !kiosk) && (
        <div className="btns"><div className="in">
          {step > 0 && step < 5 && <button className="btn sub" type="button" onClick={back} disabled={submitting}>戻る</button>}
          {step < 5 && (
            <button className="btn" type="button" onClick={next} disabled={(step === 0 && !S.agree) || submitting}>
              {step === 4 ? (submitting ? "送信しています…" : "送信する") : step === 0 ? "同意して入力へ進む" : "次へ"}
            </button>
          )}
        </div></div>
      )}
    </div>
  );
}
