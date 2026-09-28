import NextAuth from "next-auth";
import LineProvider from "next-auth/providers/line";
import { waitUntil } from "@vercel/functions";
import { SUPABASE_URL, sbHeaders } from "../../_lib/server";

// Error オブジェクトは通常の JSON.stringify では {} になるため展開する
const safeStringify = (v) => {
  try {
    return JSON.stringify(v, (k, val) =>
      val instanceof Error
        ? { name: val.name, message: val.message, stack: val.stack }
        : val
    );
  } catch (e) {
    return String(v);
  }
};

// NextAuth 内部の失敗理由を auth_error_logs に記録する。
// 失敗しても認証処理に影響させないため、await せず例外もすべて握りつぶす。
// waitUntil で応答後も送信完了まで関数を生かす（Vercel）
const recordAuthError = (code, detail) => {
  try {
    const p = fetch(`${SUPABASE_URL}/rest/v1/auth_error_logs`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ error_code: code, detail }),
    }).catch(e => console.error("[next-auth][error] 記録失敗", e));
    try { waitUntil(p); } catch {}
  } catch (e) {
    console.error("[next-auth][error] 記録失敗", e);
  }
};

if (!process.env.NEXTAUTH_SECRET) {
  console.error("[auth] NEXTAUTH_SECRET が未設定です。Vercelの環境変数に設定してください。");
}

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID,
      clientSecret: process.env.LINE_CLIENT_SECRET,
    }),
  ],
  // NEXTAUTH_URLが未設定のVercel環境でもcookieが正しく設定されるようにする
  useSecureCookies: true,
  // OAuth のやり取りで使う cookie の SameSite 制限を緩める（保険）。
  // 名前は useSecureCookies: true 時の NextAuth v4 デフォルトに合わせて __Secure- 接頭辞付き
  cookies: {
    state: {
      name: "__Secure-next-auth.state",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true, maxAge: 900 },
    },
    pkceCodeVerifier: {
      name: "__Secure-next-auth.pkce.code_verifier",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true, maxAge: 900 },
    },
    nonce: {
      name: "__Secure-next-auth.nonce",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true, maxAge: 900 },
    },
  },
  // 標準の英語エラー画面の代わりに独自ページを表示。
  // OAuthCallback 等はエラーページではなくサインインページに ?error= 付きで飛ぶため signIn も指定する。
  // ※signIn を /src にするとループするので必ず /auth-error（自動で再ログインしないページ）にすること
  pages: {
    signIn: "/auth-error",
    error: "/auth-error",
  },
  // 失敗理由（state cookie missing / invalid_grant など）は logger の metadata にしか出ないため記録する
  logger: {
    error(code, metadata) {
      const detail = safeStringify(metadata);
      console.error("[next-auth][error]", code, detail);
      recordAuthError(code, detail);
    },
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.lineUserId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      session.lineUserId = token.lineUserId;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
