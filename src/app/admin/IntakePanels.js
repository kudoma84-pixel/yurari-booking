"use client";
// 管理画面の問診票（カウンセリングシート）まわりの部品。
// 問診票は健康情報を含むため、ブラウザの公開キーでは読めない（RLS）。必ずサーバーAPI（/api/admin/intake*）を
// 管理画面のパスワード付きで呼ぶ（LINE連携QR と同じ扱い）。
import { Fragment, useEffect, useState } from "react";

const GREEN = "#3a5a3a";
const CIRCLED = "①②③④⑤";
const SOURCE_LABEL = { mypage: "マイページ（事前記入）", counter_phone: "受付（お客様のスマホ）", counter_tablet: "受付（タブレット）" };

const postJson = async (url, body) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
};

const fmtDateTime = (iso) => new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtBirth = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || "") ? s.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日`) : s || "");

// 問診票の中身を「見出し・値」の行にする（画面と印刷で共通）
export function intakeRows(form) {
  const a = form?.answers || {};
  const p = a.profile || {};
  const arr = (v) => (Array.isArray(v) ? v : []);
  const rows = [
    ["お名前", (p.name || "") + (p.kana ? `（${p.kana}）` : "")],
    ["性別", p.gender],
    ["生年月日", fmtBirth(p.birthday)],
    ["ご住所", [p.zipcode ? "〒" + p.zipcode : "", p.address].filter(Boolean).join(" ")],
    ["携帯電話", p.tel], ["ご自宅", p.tel2], ["メール", p.email],
    ["連絡の受け取り", p.contact === "line" ? "LINEで受け取る" : p.contact === "email" ? "メールで受け取る" : ""],
    ["知ったきっかけ", arr(a.found).join("・") + (a.introducer ? `（${a.introducer}様）` : "")],
    ["ご職業", a.job],
    ["通勤", arr(a.commute).join("・") + (a.commuteMin ? ` 片道${a.commuteMin}分` : "")],
    ["お仕事", (a.workHours ? `1日${a.workHours}時間` : "") + (arr(a.holiday).length ? ` 休日：${arr(a.holiday).join("・")}` : "")],
    ["同居のご家族", a.family],
    ["入浴", (a.bath || "") + (a.bath === "湯船につかる" && a.bathMin ? `（約${a.bathMin}分）` : "")],
    ["睡眠", arr(a.sleepPos).join("・") + (a.sleepHours ? ` 約${a.sleepHours}時間` : "")],
    ["ストレス", arr(a.stress).filter((x) => x !== "その他").concat(a.stressOther ? [a.stressOther] : []).join("・")],
    ["普段の運動", a.sportNow], ["過去の運動", a.sportPast],
    ["病気・怪我", a.illness], ["お薬", a.medicine],
  ];
  arr(a.symptoms).filter((s) => s?.what).forEach((s, i) => {
    rows.push([`お悩み${CIRCLED[i]}`, [s.what, s.since && `いつから：${s.since}`, s.tried && `対処：${s.tried}`, s.want && `したいこと：${s.want}`].filter(Boolean).join(" ／ ")]);
  });
  rows.push(["伝えたいこと", a.note]);
  return rows.filter(([, v]) => v && String(v).trim());
}

// 登録の生年月日と問診票の生年月日が食い違うとき、注意書きを返す
export function birthdayMismatch(form, customer) {
  const b = form?.answers?.profile?.birthday;
  if (b && customer?.birthday && b !== customer.birthday) return `登録の生年月日と相違（登録：${customer.birthday}）`;
  return null;
}

function BodyMarks({ marks, width = 300 }) {
  return (
    <div style={{ position: "relative", width, maxWidth: "100%", margin: "8px auto 0" }}>
      <img src="/monshin-body.jpg" alt="体の図（前・後ろ）" style={{ width: "100%", display: "block", borderRadius: 8, border: "1px solid #eee" }} />
      {(Array.isArray(marks) ? marks : []).map((m, i) => (
        <div key={i} style={{ position: "absolute", left: m.x + "%", top: m.y + "%", width: 24, height: 24, margin: "-12px 0 0 -12px", color: "#b3261e", fontWeight: 700, fontSize: 21, lineHeight: "24px", textAlign: "center", textShadow: "0 0 3px #fff,0 0 3px #fff", pointerEvents: "none" }}>×</div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center", fontSize: 11, color: "#888" }}><span>前</span><span>後ろ</span></div>
    </div>
  );
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 紙のカウンセリングシートに近いレイアウト（A4縦1枚目安）で印刷する
export function printIntake(form, customer) {
  const w = window.open("", "_blank");
  if (!w) { alert("印刷用の画面を開けませんでした。ポップアップを許可してください。"); return; }
  const origin = window.location.origin;
  const mismatch = birthdayMismatch(form, customer);
  const rows = intakeRows(form);
  const half = Math.ceil(rows.length / 2);
  const table = (list) => "<table>" + list.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("") + "</table>";
  const marks = (Array.isArray(form.marks) ? form.marks : []).map((m) => `<div class="mk" style="left:${Number(m.x)}%;top:${Number(m.y)}%">×</div>`).join("");
  w.document.write(`<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>カウンセリングシート ${esc(customer?.name || "")}</title>
<style>
@page{size:A4 portrait;margin:10mm}
*{box-sizing:border-box}
body{font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:#222;font-size:10.5px;line-height:1.45;margin:0}
h1{font-size:17px;margin:0;color:#3a5a3a;letter-spacing:.1em}
.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #3a5a3a;padding-bottom:4px;margin-bottom:6px}
.meta{font-size:10px;color:#555;text-align:right}
.warn{border:1px solid #b3261e;color:#b3261e;padding:3px 6px;margin:4px 0;font-weight:700}
.cols{display:flex;gap:8px}
.cols > div{flex:1;min-width:0}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #bbb;padding:3px 5px;vertical-align:top;text-align:left}
th{width:7.5em;background:#f3f6f1;font-weight:700;white-space:nowrap}
td{word-break:break-word;white-space:pre-wrap}
.bodybox{position:relative;width:78mm;margin:6px auto 0}
.bodybox img{width:100%;display:block}
.mk{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;color:#c00;font-weight:700;font-size:18px;line-height:20px;text-align:center}
.lbl{display:flex;justify-content:space-around;font-size:10px;color:#666;width:78mm;margin:0 auto}
.foot{margin-top:6px;font-size:9.5px;color:#555;border-top:1px solid #ccc;padding-top:4px}
</style></head><body>
<div class="head"><div><h1>カウンセリングシート</h1><div>整体院 癒楽里${form.store_id ? " " + (form.store_id === "toda" ? "戸田院" : "南浦和本院") : ""}</div></div>
<div class="meta">顧客番号：${esc(customer?.customer_number ?? "未設定")}<br>記入日時：${esc(fmtDateTime(form.created_at))}<br>記入方法：${esc(SOURCE_LABEL[form.source] || form.source)}</div></div>
${mismatch ? `<div class="warn">⚠ ${esc(mismatch)}</div>` : ""}
<div class="cols"><div>${table(rows.slice(0, half))}</div><div>${table(rows.slice(half))}</div></div>
<div class="bodybox"><img src="${origin}/monshin-body.jpg" alt="">${marks}</div>
<div class="lbl"><span>前</span><span>後ろ</span></div>
<div class="foot">「気持ちよく施術を受けていただくために」「施術を受けられる方へ」を読み、了承済み（${esc(fmtDateTime(form.consented_at))}）</div>
<script>
var img=document.querySelector(".bodybox img");
function go(){setTimeout(function(){window.print()},200)}
if(img.complete)go();else{img.onload=go;img.onerror=go}
<\/script>
</body></html>`);
  w.document.close();
}

function PasswordBox({ onSubmit, error, label = "表示する" }) {
  const [pw, setPw] = useState("");
  return (
    <div style={{ textAlign: "left" }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>確認のため、管理画面のパスワードを入力してください。</div>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSubmit(pw)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #e8ddd0", fontSize: 14, boxSizing: "border-box" }} />
      <button onClick={() => onSubmit(pw)} style={{ width: "100%", marginTop: 8, padding: "10px", borderRadius: 10, border: "none", background: GREEN, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{label}</button>
      {error && <div style={{ fontSize: 12, color: "#c0392b", marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// QR／URL を表示するモーダル（受付トークン）
function TokenModal({ title, sub, state, onClose, onPassword }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "24px 20px", width: "100%", maxWidth: 420, textAlign: "center", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: GREEN, marginBottom: 4 }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>{sub}</div>}
        {state.loading && <div style={{ fontSize: 13, color: "#888", padding: 40 }}>作成中…</div>}
        {state.needPassword && <PasswordBox onSubmit={onPassword} error={state.error} />}
        {!state.needPassword && state.error && <div style={{ fontSize: 13, color: "#c0392b", marginTop: 10 }}>{state.error}</div>}
        {state.qr && (
          <>
            <img src={state.qr} alt="問診票のQR" style={{ width: 260, height: 260, display: "block", margin: "0 auto" }} />
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.8, marginTop: 12, textAlign: "left" }}>お客様のスマホのカメラで読み取ってもらってください。</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 8 }}>このQRは {new Date(state.expiresAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} まで有効です。</div>
          </>
        )}
        {state.opened && <div style={{ fontSize: 13, color: GREEN, marginTop: 10 }}>新しいタブで開きました。タブレットをお客様にお渡しください。</div>}
        <button onClick={onClose} style={{ width: "100%", marginTop: 16, padding: "12px", borderRadius: 12, border: "2px solid #e8ddd0", background: "white", color: "#888", fontSize: 14, cursor: "pointer" }}>閉じる</button>
      </div>
    </div>
  );
}

// 受付トークンを発行して、QR表示 または このタブレットで開く
function useIntakeToken(storeId, password, setPassword) {
  const [state, setState] = useState(null);
  const issue = async (params, pw) => {
    const usePw = pw ?? password;
    setState({ loading: true });
    if (!usePw) { setState({ needPassword: true, params }); return; }
    // ポップアップブロックを避けるため、タブレットで開く場合はクリックの直後に空のタブを開いておく
    const tab = params.kiosk ? window.open("", "_blank") : null;
    try {
      const r = await postJson("/api/admin/intake/token", { ...params, store: storeId, password: usePw });
      if (r.status === 401) { tab?.close(); setState({ needPassword: true, params, error: r.data.error }); return; }
      if (!r.ok) { tab?.close(); setState({ error: r.data.error || "作れませんでした" }); return; }
      if (pw) setPassword(pw);
      if (params.kiosk) {
        if (tab) { tab.location.href = r.data.url; setState({ opened: true }); }
        else { window.location.href = r.data.url; }
        return;
      }
      const QRCode = (await import("qrcode")).default;
      const qr = await QRCode.toDataURL(r.data.url, { width: 320, margin: 1 });
      setState({ qr, url: r.data.url, expiresAt: r.data.expires_at });
    } catch (e) {
      tab?.close();
      setState({ error: "作れませんでした：" + e.message });
    }
  };
  return { state, setState, issue };
}

// ── B：「📝 新規の方の問診票」ボタン（顧客タブ） ───────────────────
export function NewIntakeButton({ storeId, password, setPassword }) {
  const [open, setOpen] = useState(false);
  const tok = useIntakeToken(storeId, password, setPassword);
  const close = () => { setOpen(false); tok.setState(null); };
  const btn = { width: "100%", padding: "14px", borderRadius: 12, border: "none", background: GREEN, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 10 };
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ padding: "8px 16px", borderRadius: 10, border: "2px solid #5a9e7a", background: "white", color: "#3a5a3a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📝 新規の方の問診票</button>
      {open && !tok.state && (
        <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "24px 20px", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: GREEN, marginBottom: 6 }}>📝 新規の方の問診票</div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>初めての方（未登録）に、問診票とお客様登録を一度に入力していただきます。</div>
            <button style={btn} onClick={() => tok.issue({ kind: "counter", kiosk: false })}>📱 お客様のスマホ用QRを表示（2時間有効）</button>
            <button style={{ ...btn, background: "#5a9e7a" }} onClick={() => tok.issue({ kind: "counter", kiosk: true })}>🖥 このタブレットで受付モードを開く（14時間有効）</button>
            <button onClick={close} style={{ ...btn, background: "white", color: "#888", border: "2px solid #e8ddd0" }}>閉じる</button>
          </div>
        </div>
      )}
      {open && tok.state && (
        <TokenModal title="📝 新規の方の問診票" sub="お客様のスマホで読み取ってもらうQR" state={tok.state} onClose={close}
          onPassword={(pw) => tok.issue(tok.state.params, pw)} />
      )}
    </>
  );
}

// ── C／閲覧：顧客詳細の「📝 問診票」欄 ─────────────────────────
export function IntakeCustomerSection({ customer, storeId, password, setPassword }) {
  const [data, setData] = useState(null); // { forms, customer } | { needPassword, error } | { error } | { loading }
  const [openIdx, setOpenIdx] = useState(0);
  const tok = useIntakeToken(storeId, password, setPassword);

  const load = async (pw) => {
    const usePw = pw ?? password;
    if (!usePw) { setData({ needPassword: true }); return; }
    setData({ loading: true });
    const r = await postJson("/api/admin/intake", { customer_id: customer.id, store: storeId, password: usePw }).catch(() => ({ ok: false, data: {} }));
    if (r.status === 401) { setData({ needPassword: true, error: r.data.error }); return; }
    if (!r.ok) { setData({ error: r.data?.error || "問診票を読み込めませんでした" }); return; }
    if (pw) setPassword(pw);
    setData({ forms: Array.isArray(r.data.forms) ? r.data.forms : [], customer: r.data.customer || customer });
    setOpenIdx(0);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setData(null); load(); }, [customer.id]);

  const box = { background: "#f9f6f2", borderRadius: 12, padding: 16, marginBottom: 16 };
  const small = { padding: "8px 12px", borderRadius: 10, border: "2px solid #5a9e7a", background: "white", color: GREEN, fontSize: 13, fontWeight: 700, cursor: "pointer" };

  return (
    <div style={box}>
      <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 8 }}>📝 問診票</div>
      {!data || data.loading ? <div style={{ fontSize: 13, color: "#888" }}>読み込み中…</div> : null}
      {data?.needPassword && <PasswordBox onSubmit={(pw) => load(pw)} error={data.error} />}
      {data?.error && !data.needPassword && (
        <div style={{ fontSize: 13, color: "#c0392b" }}>{data.error} <button onClick={() => load()} style={{ ...small, marginLeft: 8 }}>再読み込み</button></div>
      )}
      {data?.forms && data.forms.length === 0 && (
        <>
          <div style={{ fontSize: 13, color: "#a33", marginBottom: 8 }}>未記入です</div>
          {!customer.is_deleted && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={small} onClick={() => tok.issue({ kind: "customer", customer_id: customer.id, kiosk: false })}>📱 この方の問診票を開く（QR）</button>
              <button style={small} onClick={() => tok.issue({ kind: "customer", customer_id: customer.id, kiosk: true })}>🖥 このタブレットで開く</button>
            </div>
          )}
        </>
      )}
      {data?.forms && data.forms.length > 0 && (
        <>
          {data.forms.map((f, i) => {
            const mismatch = birthdayMismatch(f, data.customer);
            const open = openIdx === i;
            return (
              <div key={f.id} style={{ borderTop: i ? "1px solid #e8ddd0" : "none", paddingTop: i ? 8 : 0, marginTop: i ? 8 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <button onClick={() => setOpenIdx(open ? -1 : i)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: GREEN, fontSize: 13, fontWeight: 700, textAlign: "left" }}>
                    {open ? "▼" : "▶"} 記入日 {fmtDateTime(f.created_at)}　<span style={{ fontWeight: 400, color: "#888" }}>{SOURCE_LABEL[f.source] || f.source}</span>
                  </button>
                  <button onClick={() => printIntake(f, data.customer)} style={{ ...small, padding: "4px 10px", fontSize: 12 }}>🖨 印刷</button>
                </div>
                {mismatch && <div style={{ fontSize: 12, color: "#b3261e", fontWeight: 700, marginTop: 4 }}>⚠ {mismatch}</div>}
                {open && (
                  <>
                    <dl style={{ display: "grid", gridTemplateColumns: "7.5em 1fr", gap: "4px 10px", fontSize: 12, margin: "8px 0 0" }}>
                      {intakeRows(f).map(([k, v]) => (
                        <Fragment key={k}><dt style={{ color: "#7a9a7a", fontWeight: 700 }}>{k}</dt><dd style={{ margin: 0, color: "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{v}</dd></Fragment>
                      ))}
                    </dl>
                    <BodyMarks marks={f.marks} />
                  </>
                )}
              </div>
            );
          })}
        </>
      )}
      {tok.state && (
        <TokenModal title="📝 この方の問診票" sub={customer.name + " 様（この方専用・2時間有効）"} state={tok.state} onClose={() => tok.setState(null)}
          onPassword={(pw) => tok.issue(tok.state.params, pw)} />
      )}
    </div>
  );
}

// ── 予約カード・予約詳細：初回の方の「問診票：未記入／記入済」 ─────────────
// status: { withIntake: {id:true}, visited: {id:true}, beforeStart: {id:true}, loaded: {id:true} }
export function intakeLabelFor(status, customerId) {
  if (!customerId || !status?.loaded?.[customerId]) return null;
  if (status.visited[customerId]) return null; // 来院実績のある方には出さない（初回の方だけ）
  if (status.withIntake[customerId]) return "記入済";
  // 2026/11/14（INTAKE_START_AT）より前に登録された方は紙の問診票なので「未記入」は出さない
  if (status.beforeStart?.[customerId]) return null;
  return "未記入";
}

export function IntakeCardMark({ status, customerId }) {
  const l = intakeLabelFor(status, customerId);
  if (!l) return null;
  return <div style={{ marginTop: 2, background: "white", color: l === "記入済" ? "#3a7a5a" : "#c0392b", borderRadius: 4, padding: "0 3px", fontSize: 9, fontWeight: 700, lineHeight: 1.4 }}>問診{l === "記入済" ? "✓" : "未"}</div>;
}
