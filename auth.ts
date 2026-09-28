import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '@/src/prisma/db';

/** Mirrors the SystemRole enum in src/prisma/contract.prisma. */
export type Role = 'USER' | 'SUPPORT' | 'SUPERUSER';

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
};

// Ranked rather than matched by name: one numeric comparison expresses
// "SUPERUSER may do anything SUPPORT may", so there are no per-role permission
// lists to keep in sync as the app grows.
const RANK: Record<Role, number> = { USER: 0, SUPPORT: 1, SUPERUSER: 2 };

/** True when `role` sits at or above `min` in the hierarchy. */
export function hasRole(role: Role | null | undefined, min: Role): boolean {
  return !!role && RANK[role] >= RANK[min];
}

async function getUser(email: string) {
  try {
    return await db.orm.public.User.where({ email })
      .select('id', 'name', 'email', 'passwordHash', 'status', 'systemRole')
      .first();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // id and role are written into the token once, at sign-in. The session
    // cookie is signed and encrypted, so this is the only place they can come
    // from — a plain cookie would be editable by the person it describes.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { systemRole?: Role }).systemRole ?? 'USER';
      }
      return token;
    },
    // Copies them onto the session so every page and action reads the role
    // without touching the database.
    session({ session, token }) {
      Object.assign(session.user, { id: token.id, role: token.role });
      return session;
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email.trim().toLowerCase());
          // No passwordHash means the account exists but authenticates through
          // a provider instead, so there is nothing to compare against here.
          if (!user || !user.passwordHash) return null;
          if (user.status === 'DISABLED') return null;

          const passwordsMatch = await bcrypt.compare(
            password,
            user.passwordHash,
          );
          if (passwordsMatch) {
            // systemRole rides along to the jwt callback above.
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              systemRole: user.systemRole,
            };
          }
        }
        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
});

/**
 * The signed-in user, read straight from the session cookie — no database
 * round trip. Returns null when signed out.
 *
 * Use it in pages and layouts to decide what to render:
 *   const me = await currentUser();
 *   {hasRole(me?.role, 'SUPPORT') && <AdminPanel />}
 */
export async function currentUser(): Promise<SessionUser | null> {
  const user = (await auth())?.user as SessionUser | undefined;
  return user?.id ? user : null;
}

/**
 * Wraps a server action so it only runs for `minRole` and above, handing the
 * action the caller it already resolved.
 *
 *   export const deleteOrg = withRoleAction('SUPERUSER', async (me, id: string) => {
 *     await db.orm.public.Organization.where({ id }).delete();
 *   });
 *
 * Refusals come back as `{ error }` rather than thrown, so a form can render
 * them through useActionState like any other validation failure.
 */
export function withRoleAction<A extends unknown[], R>(
  minRole: Role,
  action: (user: SessionUser, ...args: A) => Promise<R>,
) {
  return async (...args: A): Promise<R | { error: string }> => {
    const user = await currentUser();
    if (!user) return { error: 'You must be signed in.' };
    if (!hasRole(user.role, minRole)) {
      return { error: 'You do not have permission to do that.' };
    }
    return action(user, ...args);
  };
}
