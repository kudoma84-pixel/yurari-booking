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
