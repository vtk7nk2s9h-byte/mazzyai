import NextAuth from 'next-auth';
import type { Adapter, AdapterUser } from 'next-auth/adapters';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '@/src/prisma/db';
import {
  escapeHtml,
  mailColors,
  mailFonts,
  renderEmail,
  sendEmail,
} from '@/app/lib/email';

/** Mirrors the SystemRole enum in src/prisma/contract.prisma. */
export type Role = 'USER' | 'ADMIN' | 'SUPERUSER';

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  /** Set while a superuser is signed in as someone else: who to return to. */
  impersonatorId?: string;
};

/** The account a superuser's profile banner switches into. */
export const ADMIN_ACCOUNT_EMAIL = 'admin@mazzyai.com';

// The one-click switch signs in without a password, so the only thing that may
// unlock it is a token this server minted a moment ago. A server action checks
// who is asking and signs one; the provider below accepts nothing else, so
// POSTing to the callback route by hand gets nowhere.
const SWITCH_TTL_MS = 60_000;

type SwitchPayload = { toId: string; impersonatorId?: string; exp: number };

function switchKey(): string {
  const key = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!key) throw new Error('AUTH_SECRET is not set.');
  return key;
}

function macOf(body: string): string {
  // Prefixed so a MAC made here can't be replayed as one for another purpose.
  return crypto
    .createHmac('sha256', switchKey())
    .update(`switch-account:${body}`)
    .digest('base64url');
}

export function signSwitch(payload: Omit<SwitchPayload, 'exp'>): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + SWITCH_TTL_MS }),
  ).toString('base64url');
  return `${body}.${macOf(body)}`;
}

function verifySwitch(token: unknown): SwitchPayload | null {
  if (typeof token !== 'string') return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expected = Buffer.from(macOf(body));
  const given = Buffer.from(mac);
  if (
    expected.length !== given.length ||
    !crypto.timingSafeEqual(expected, given)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString(),
    ) as SwitchPayload;
    return typeof payload.toId === 'string' && payload.exp > Date.now()
      ? payload
      : null;
  } catch {
    return null;
  }
}

// Ranked rather than matched by name: one numeric comparison expresses
// "SUPERUSER may do anything ADMIN may", so there are no per-role permission
// lists to keep in sync as the app grows.
const RANK: Record<Role, number> = { USER: 0, ADMIN: 1, SUPERUSER: 2 };

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
        // Written on every sign-in, so a normal login (or the trip back)
        // clears it. It lives in the encrypted token, which is why the person
        // it describes can't set it.
        token.impersonatorId = (
          user as { impersonatorId?: string }
        ).impersonatorId;
      }
      return token;
    },
    // Copies them onto the session so every page and action reads the role
    // without touching the database.
    session({ session, token }) {
      Object.assign(session.user, {
        id: token.id,
        role: token.role,
        impersonatorId: token.impersonatorId,
      });
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
    // Passwordless account switch. Only reachable with a token from
    // signSwitch(), which switchAccountAction mints after checking the caller.
    Credentials({
      id: 'switch-account',
      credentials: { token: {} },
      async authorize(credentials) {
        const payload = verifySwitch(credentials?.token);
        if (!payload) return null;

        const user = await db.orm.public.User.where({ id: payload.toId })
          .select('id', 'name', 'email', 'status', 'systemRole')
          .first();
        if (!user || user.status === 'DISABLED') return null;
        // A trip back (no impersonatorId) may only land on a superuser, so the
        // way home can never be used to become anyone else.
        if (!payload.impersonatorId && user.systemRole !== 'SUPERUSER') {
          return null;
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          systemRole: user.systemRole,
          impersonatorId: payload.impersonatorId,
        };
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
        const minutes = OTP_MAX_AGE_SECONDS / 60;
        const c = mailColors;
        // The link is machine-generated, but it carries query separators, so
        // its ampersands still have to be entities inside an href.
        const href = escapeHtml(url);

        await sendEmail({
          to: identifier,
          subject: `Your sign-in code: ${token}`,
          text: `Your sign-in code is ${token}. It expires in ${minutes} minutes.\n\nOr just click this link to sign in:\n${url}`,
          html: renderEmail({
            preheader: `${token} — expires in ${minutes} minutes.`,
            footer:
              'You received this because someone asked to sign in to MazzyAI with this address. If that was not you, you can ignore this email.',
            body: `
<h1 style="margin:0 0 8px;font-family:${mailFonts.serif};font-size:22px;line-height:30px;font-weight:700;color:${c.text};">Your sign-in code</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:22px;color:${c.muted};">Enter it on the sign-in page. It expires in ${minutes} minutes.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="background-color:${c.well};border:1px solid ${c.border};border-radius:10px;padding:18px 12px;font-family:${mailFonts.mono};font-size:30px;line-height:36px;font-weight:700;letter-spacing:10px;color:${c.text};">${token}</td></tr>
</table>
<p style="margin:24px 0 12px;font-size:14px;line-height:22px;color:${c.muted};">Or sign in with one click:</p>
<a href="${href}" style="display:inline-block;background-color:${c.brand};border-radius:8px;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in to MazzyAI</a>
<p style="margin:20px 0 0;font-size:12px;line-height:18px;color:${c.dim};word-break:break-all;">If the button does not work, paste this link into your browser:<br><a href="${href}" style="color:${c.accent};text-decoration:underline;">${href}</a></p>`,
          }),
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
 *   {hasRole(me?.role, 'ADMIN') && <AdminPanel />}
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
