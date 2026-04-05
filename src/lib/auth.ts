import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    jwt({ token, account, profile }) {
      if (account && profile?.sub) {
        token.sub = profile.sub;
        // Store the id_token for federated logout
        token.idToken = account.id_token;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      // Expose id_token to the session for logout
      (session as unknown as Record<string, unknown>).idToken = token.idToken;
      return session;
    },
    authorized({ auth: session, request }) {
      const protectedPaths = ["/library", "/submit"];
      const { pathname } = request.nextUrl;
      const needsAuth = protectedPaths.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );
      if (needsAuth && !session?.user) {
        return false;
      }
      return true;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
});
