import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { admin, emailOTP } from 'better-auth/plugins';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { db } from '@/src/prisma/db';
import { DATABASE_URL } from '@/lib/env';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  escapeHtml,
  mailColors,
  mailFonts,
  renderEmail,
  sendEmail,
} from '@/app/lib/email';

/** The one account a superuser may switch into (see the impersonation hook). */
export const ADMIN_ACCOUNT_EMAIL = 'admin@mazzyai.com';

// Same work factor the NextAuth sign-up used, so hashes copied across from
// user.passwordHash verify unchanged.
const BCRYPT_ROUNDS = 12;

const OTP_EXPIRES_IN_SECONDS = 10 * 60;

// Shared with the rate limiter, which needs raw SQL Prisma 8 doesn't offer.
const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * Better Auth server instance. Talks to Postgres through its own pg Pool
 * rather than the Prisma 8 client: its Prisma adapter targets @prisma/client,
 * which this project doesn't have. Table and column names in
 * src/prisma/contract.prisma follow Better Auth's defaults, so only `role`
 * needs mapping.
 */
export const auth = betterAuth({
  database: pool,
  // Signing key and base URL come from the environment: Better Auth reads
  // BETTER_AUTH_SECRETS (a versioned list — see .env.example, it rotates a
  // key without signing everyone out), then BETTER_AUTH_SECRET, then
  // AUTH_SECRET, and BETTER_AUTH_URL for the links it builds.
  advanced: {
    // Ids are text columns with no database default (the contract's uuid()
    // is client-side). Better Auth's 'uuid' option leaves the id to the
    // database on Postgres, so mint it here instead.
    database: { generateId: () => crypto.randomUUID() },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 200,
    // bcrypt instead of Better Auth's default scrypt, so passwords set under
    // NextAuth keep working.
    password: {
      hash: (password) => bcrypt.hash(password, BCRYPT_ROUNDS),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Runs for every way of signing in (password, code, link, switch), so
        // a disabled account can't get a session through any of them.
        async before(session) {
          const user = await db.orm.public.User.where({ id: session.userId })
            .select('status')
            .first();
          if (user?.status === 'DISABLED') {
            throw new APIError('FORBIDDEN', {
              message: 'This account is disabled.',
            });
          }
        },
        // Feeds the Team page's "Last sign-in". A superuser switching into an
        // account isn't that person signing in, so it doesn't count.
        async after(session) {
          if ((session as { impersonatedBy?: string | null }).impersonatedBy) {
            return;
          }
          await db.orm.public.User.where({ id: session.userId }).update({
            lastLoginAt: new Date().toISOString(),
          });
        },
      },
    },
  },
  hooks: {
    // Runs for server-action calls (auth.api.*) and HTTP requests alike.
    // Better Auth's own rate limiter only sees HTTP, and only in production.
    before: createAuthMiddleware(async (ctx) => {
      const retryAfter = await checkRateLimit(
        pool,
        ctx.path,
        ctx.headers,
        ctx.body?.email,
      );
      if (retryAfter !== null) {
        const minutes = Math.max(1, Math.ceil(retryAfter / 60));
        throw new APIError(
          'TOO_MANY_REQUESTS',
          {
            code: 'RATE_LIMITED',
            message: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
          },
          { 'Retry-After': String(retryAfter) },
        );
      }

      // The admin plugin lets a superuser impersonate anyone; this app only
      // allows switching into ADMIN_ACCOUNT_EMAIL.
      if (ctx.path !== '/admin/impersonate-user') return;
      const target = await db.orm.public.User.where({
        id: String(ctx.body?.userId ?? ''),
      })
        .select('email')
        .first();
      if (target?.email !== ADMIN_ACCOUNT_EMAIL) {
        throw new APIError('FORBIDDEN', {
          message: 'You can only switch into the admin account.',
        });
      }
    }),
  },
  plugins: [
    admin({
      // Role names are the SystemRole enum's values, stored in user.systemRole.
      schema: { user: { fields: { role: 'systemRole' } } },
      defaultRole: 'USER',
      adminRoles: ['SUPERUSER'],
      roles: { USER: userAc, ADMIN: userAc, SUPERUSER: adminAc },
      // As long as an ordinary session (Better Auth's 7-day default). The
      // plugin's own 1-hour default would sign a superuser out of the admin
      // account mid-task, which the old switch never did.
      impersonationSessionDuration: 60 * 60 * 24 * 7,
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_EXPIRES_IN_SECONDS,
      async sendVerificationOTP({ email, otp, type }, ctx) {
        // The link carries the code to app/login/email-link/route.ts, which
        // signs in with it, so one email serves both typing and clicking.
        const url =
          type === 'sign-in' && ctx
            ? `${new URL(ctx.context.baseURL).origin}/login/email-link?${new URLSearchParams({ email, otp })}`
            : null;
        await sendEmail({
          to: email,
          subject: `Your sign-in code: ${otp}`,
          ...renderOtpEmail(otp, url),
        });
      },
    }),
    // Must stay last: lets auth.api calls in server actions set cookies.
    nextCookies(),
  ],
});

function renderOtpEmail(otp: string, url: string | null) {
  const minutes = OTP_EXPIRES_IN_SECONDS / 60;
  const c = mailColors;
  // The link carries query separators, so its ampersands still have to be
  // entities inside an href.
  const href = url && escapeHtml(url);
  const linkHtml = href
    ? `
<p style="margin:24px 0 12px;font-size:14px;line-height:22px;color:${c.muted};">Or sign in with one click:</p>
<a href="${href}" style="display:inline-block;background-color:${c.brand};border-radius:8px;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in to MazzyAI</a>
<p style="margin:20px 0 0;font-size:12px;line-height:18px;color:${c.dim};word-break:break-all;">If the button does not work, paste this link into your browser:<br><a href="${href}" style="color:${c.accent};text-decoration:underline;">${href}</a></p>`
    : '';

  return {
    text: `Your sign-in code is ${otp}. It expires in ${minutes} minutes.${url ? `\n\nOr just click this link to sign in:\n${url}` : ''}`,
    html: renderEmail({
      preheader: `${otp} — expires in ${minutes} minutes.`,
      footer:
        'You received this because someone asked to sign in to MazzyAI with this address. If that was not you, you can ignore this email.',
      body: `
<h1 style="margin:0 0 8px;font-family:${mailFonts.serif};font-size:22px;line-height:30px;font-weight:700;color:${c.text};">Your sign-in code</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:22px;color:${c.muted};">Enter it on the sign-in page. It expires in ${minutes} minutes.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="background-color:${c.well};border:1px solid ${c.border};border-radius:10px;padding:18px 12px;font-family:${mailFonts.mono};font-size:30px;line-height:36px;font-weight:700;letter-spacing:10px;color:${c.text};">${otp}</td></tr>
</table>${linkHtml}`,
    }),
  };
}

export type Session = typeof auth.$Infer.Session;
