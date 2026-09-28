import NextAuth from "next-auth";
import LineProvider from "next-auth/providers/line";

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
  // 標準の英語エラー画面の代わりに独自ページを表示。
  // OAuthCallback 等はエラーページではなくサインインページに ?error= 付きで飛ぶため signIn も指定する。
  // ※signIn を /src にするとループするので必ず /auth-error（自動で再ログインしないページ）にすること
  pages: {
    signIn: "/auth-error",
    error: "/auth-error",
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
