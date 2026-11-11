// 院ごとの電話番号と、変更・キャンセルの受付締切を過ぎたときの案内文。
// 画面（マイページ・予約フォーム）とサーバー（API の拒否レスポンス）の両方から使うため、
// サーバー専用のモジュール（環境変数・DB）は読み込まないこと。

// 予約の院の電話番号。院名の出し分けは一覧の表示（toda 以外は南浦和）に合わせる。
export const STORE_TEL = {
  toda: { name: "戸田院", tel: "0482873318", label: "048-287-3318" },
  minamiurawa: { name: "南浦和院", tel: "0487628333", label: "048-762-8333" },
};
export const storeTel = (storeId) => storeId === "toda" ? STORE_TEL.toda : STORE_TEL.minamiurawa;

// store_settings.cancel_deadline_time（"17:30:00" など）を "17:30" の形にする。解釈できなければ null。
export function formatDeadlineTime(deadlineTime) {
  const t = /^(\d{1,2}):(\d{2})/.exec(String(deadlineTime ?? ""));
  return t ? `${Number(t[1])}:${t[2]}` : null;
}

// 締切を過ぎた予約の案内文（3行）。「前日17:30」の部分は設定値から組み立てる。
export function deadlineMessage(storeId, deadlineTime) {
  const time = formatDeadlineTime(deadlineTime);
  const t = storeTel(storeId);
  return [
    (time ? `前日${time}` : "受付期限") + "を過ぎているため、こちらからの変更・キャンセルはできません。",
    "お手数ですが、お電話でご連絡ください。",
    `${t.name} ${t.label}`,
  ].join("\n");
}
