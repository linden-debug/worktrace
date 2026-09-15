import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { createDatabase } from '@/lib/db';

const allowedDomain = 'example.com';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      return Boolean(email?.endsWith(`@${allowedDomain}`));
    },
    async jwt({ token, profile }) {
      const email = (profile?.email ?? token.email)?.toLowerCase();
      if (email?.endsWith(`@${allowedDomain}`)) {
        const database = createDatabase();
        const user = database.findOrCreateUser(email, profile?.name ?? token.name ?? email.split('@')[0] ?? 'Member');
        database.close();
        token.role = user.role;
        token.worktraceUserId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.worktraceUserId as string;
        session.user.role = token.role as 'ADMIN' | 'MEMBER';
      }
      return session;
    },
  },
});
