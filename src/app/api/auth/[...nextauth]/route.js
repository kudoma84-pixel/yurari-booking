import NextAuth from "next-auth";
import LineProvider from "next-auth/providers/line";

const handler = NextAuth({
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID,
      clientSecret: process.env.LINE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.lineUserId = profile?.sub;
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
