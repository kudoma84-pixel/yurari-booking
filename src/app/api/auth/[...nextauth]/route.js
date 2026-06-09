import NextAuth from "next-auth";
import LineProvider from "next-auth/providers/line";

const handler = NextAuth({
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID,
      clientSecret: process.env.LINE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: '/src',
  },
  useSecureCookies: true,
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
    pkceCodeVerifier: {
      name: `__Secure-next-auth.pkce.code_verifier`,
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
    state: {
      name: `__Secure-next-auth.state`,
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
    nonce: {
      name: `__Secure-next-auth.nonce`,
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
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
      session.user.lineUserId = token.lineUserId;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
