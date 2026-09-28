import NextAuth from 'next-auth';
import type { Adapter, AdapterUser } from 'next-auth/adapters';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '@/src/prisma/db';
import { sendEmail } from '@/app/lib/email';

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

const ADAPTER_USER_COLUMNS = [
  'id',
  'email',
  'emailVerifiedAt',
  'name',
  'image',
  'systemRole',
  'status',
] as const;

type AdapterUserRow = {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  name: string | null;
  image: string | null;
  systemRole: Role;
  status: 'ACTIVE' | 'DISABLED';
};

// `role`/`status` ride along on top of the AdapterUser shape, same trick the
// Credentials provider's authorize() uses below, so the jwt() callback below
// can still read them regardless of which provider signed the user in.
function toAdapterUser(
  row: AdapterUserRow,
): AdapterUser & Pick<AdapterUserRow, 'systemRole' | 'status'> {
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.emailVerifiedAt ? new Date(row.emailVerifiedAt) : null,
    name: row.name,
    image: row.image,
    systemRole: row.systemRole,
    status: row.status,
  };
}

/**
 * Auth.js's official adapters (`@auth/prisma-adapter`) expect a real
 * `@prisma/client` instance; this project's Prisma 8 contract client has a
 * different API entirely (`db.orm.public.X`), so the adapter is hand-written
 * against just the methods the Email provider actually calls under the `jwt`
 * session strategy (see next-auth/adapters — createVerificationToken /
 * useVerificationToken / getUserByEmail are the only ones asserted at
 * startup; getUser/createUser/updateUser are called at runtime for
 * account-linking edge cases).
 */
const authAdapter: Adapter = {
  async createVerificationToken({ identifier, token, expires }) {
    await db.orm.public.VerificationToken.create({
      identifier,
      token,
      expiresAt: expires.toISOString(),
    });
    return { identifier, token, expires };
  },
  // Consumes the token so a code or link can only be used once — the lookup
  // and delete run in one transaction so two near-simultaneous attempts
  // can't both succeed.
  async useVerificationToken({ identifier, token }) {
    return db.transaction(async (tx) => {
      const record = await tx.orm.public.VerificationToken.where({
        identifier,
        token,
      }).first();
      if (!record) return null;
      await tx.orm.public.VerificationToken.where({ identifier, token }).delete();
      return {
        identifier: record.identifier,
        token: record.token,
        expires: new Date(record.expiresAt),
      };
    });
  },
  async getUser(id) {
    const row = await db.orm.public.User.where({ id })
      .select(...ADAPTER_USER_COLUMNS)
      .first();
    return row ? toAdapterUser(row) : null;
  },
  async getUserByEmail(email) {
    const row = await db.orm.public.User.where({ email })
      .select(...ADAPTER_USER_COLUMNS)
      .first();
    return row ? toAdapterUser(row) : null;
  },
  async createUser(data) {
    const row = await db.orm.public.User.select(...ADAPTER_USER_COLUMNS).create({
      email: data.email,
      name: data.name ?? null,
      image: data.image ?? null,
      emailVerifiedAt: data.emailVerified?.toISOString() ?? null,
    });
    return toAdapterUser(row);
  },
  async updateUser({ id, ...data }) {
    const row = await db.orm.public.User.where({ id })
      .select(...ADAPTER_USER_COLUMNS)
      .update({
        ...(data.email !== undefined && { email: data.email }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.emailVerified !== undefined && {
          emailVerifiedAt: data.emailVerified?.toISOString() ?? null,
        }),
      });
    if (!row) throw new Error(`updateUser: no user with id ${id}`);
    return toAdapterUser(row);
  },
};

const OTP_MAX_AGE_SECONDS = 10 * 60;

// crypto.randomInt, not Math.random — this code is a bearer credential for
// the few minutes it's valid.
function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  adapter: authAdapter,
  // Forced explicitly: adding an adapter defaults Auth.js to database
  // sessions, which the Credentials provider can't use.
  session: { strategy: 'jwt' },
  callbacks: {
    ...authConfig.callbacks,
    // Blocks a disabled account from the email/OTP path too — the
    // Credentials authorize() above checks this inline, but that flow never
    // runs for an email-type sign-in, so it needs its own check here.
    signIn({ user }) {
      return (user as { status?: string }).status !== 'DISABLED';
    },
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
    {
      id: 'email-otp',
      type: 'email',
      name: 'Email code',
      maxAge: OTP_MAX_AGE_SECONDS,
      generateVerificationToken: generateOtp,
      normalizeIdentifier: (identifier) => identifier.trim().toLowerCase(),
      // Sends one email carrying both a typeable 6-digit code and a
      // clickable link — `url` already embeds `token`, so clicking it and
      // typing the code both land on the same callback route.
      async sendVerificationRequest({ identifier, url, token }) {
        await sendEmail({
          to: identifier,
          subject: `Your sign-in code: ${token}`,
          text: `Your sign-in code is ${token}. It expires in 10 minutes.\n\nOr just click this link to sign in:\n${url}`,
          html: `
            <p>Your sign-in code is:</p>
            <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${token}</p>
            <p>It expires in 10 minutes.</p>
            <p>Or click this link to sign in: <a href="${url}">${url}</a></p>
          `,
        });
      },
    },
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
