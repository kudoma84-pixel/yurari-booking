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
