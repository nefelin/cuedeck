import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

function env(name: string, fallback?: string): string | undefined {
  const value = process.env[name] ?? (fallback ? process.env[fallback] : undefined);
  return value?.trim().replace(/^["']|["']$/g, "");
}

const googleClientId = env("AUTH_GOOGLE_ID", "GOOGLE_CLIENT_ID");
const googleClientSecret = env("AUTH_GOOGLE_SECRET", "GOOGLE_CLIENT_SECRET");
const authSecret = env("AUTH_SECRET", "NEXTAUTH_SECRET");

if (!authSecret && process.env.NODE_ENV === "production") {
  console.error(
    "[auth] Missing AUTH_SECRET on this deployment. Add it in Vercel → Settings → Environment Variables (Production), then redeploy.",
  );
}

if (!googleClientId || !googleClientSecret) {
  console.error(
    "[auth] Missing Google OAuth credentials. Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET on Vercel, then redeploy.",
  );
} else if (!googleClientId.endsWith(".apps.googleusercontent.com")) {
  console.error(
    "[auth] AUTH_GOOGLE_ID does not look like a Google OAuth client ID. Copy the Client ID from Google Cloud Console (ends with .apps.googleusercontent.com).",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    jwt({ token, account, profile }) {
      const profileSub =
        profile && typeof profile === "object" && "sub" in profile
          ? String(profile.sub)
          : undefined;
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      } else if (profileSub) {
        token.sub = profileSub;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
