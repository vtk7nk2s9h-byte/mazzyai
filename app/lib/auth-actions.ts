'use server';

import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { ADMIN_ACCOUNT_EMAIL, currentUser, hasRole } from '@/auth';
import { auth } from '@/lib/auth';
import { db } from '@/src/prisma/db';

export type SignUpState = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string | null;
};

const SignUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Please enter your name.' })
    .max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(8, { message: 'Passwords must be at least 8 characters.' })
    .max(200),
});

/**
 * Creates a password account, then signs the new user straight in.
 *
 * Email is stored lower-cased because the unique index is case-sensitive —
 * without normalising, Alice@ and alice@ would be two separate accounts.
 */
export async function signUp(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = SignUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Check the fields above and try again.',
    };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.orm.public.User.where({ email })
    .select('id')
    .first();

  if (existing) {
    return {
      errors: { email: ['That email is already registered.'] },
      message: null,
    };
  }

  // Creates the user and its credential account, and signs in: nextCookies()
  // in lib/auth.ts sets the session cookie on this action's response.
  try {
    await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });
  } catch (error) {
    // Backstop for the race between the check above and this insert: two
    // simultaneous sign-ups with the same address both pass the read, and the
    // unique index rejects the loser.
    // Better Auth's 4xx messages ("Password too short", …) are written for
    // the person filling the form in; anything else is our failure.
    if (error instanceof APIError && error.statusCode < 500) {
      return { message: error.message };
    }
    console.error('Sign-up failed:', error);
    return { message: 'Could not create the account. Please try again.' };
  }

  // redirect() throws NEXT_REDIRECT, so it must sit outside the try above.
  redirect('/dashboard');
}

export type RequestEmailCodeState = {
  error?: string;
  message?: string | null;
  /**
   * The address the code went to, echoed back so the verify form can carry it
   * in a hidden field instead of asking for it a second time. Only set on a
   * successful send.
   */
  email?: string;
};

const RequestEmailCodeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please enter a valid email address.' }),
});

/**
 * Starts the email/OTP sign-in: generates a code and emails it, with a
 * one-click link alongside it (see lib/auth.ts). Nothing here redirects, so
 * it's safe to catch every error, including a Resend outage, and hand the
 * caller a plain message instead of a crashed page.
 */
export async function requestEmailCode(
  _prevState: RequestEmailCodeState,
  formData: FormData,
): Promise<RequestEmailCodeState> {
  const parsed = RequestEmailCodeSchema.safeParse({
    email: formData.get('email'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.flatten().fieldErrors.email?.[0] ?? 'Invalid email.',
    };
  }

  try {
    await auth.api.sendVerificationOTP({
      body: { email: parsed.data.email, type: 'sign-in' },
    });
  } catch (error) {
    if (error instanceof APIError && error.status === 'TOO_MANY_REQUESTS') {
      return { error: error.message };
    }
    console.error('Failed to send sign-in email:', error);
    return { error: 'Could not send the code. Please try again in a moment.' };
  }

  return {
    email: parsed.data.email,
    message: 'Check your email for a 6-digit code (and a sign-in link).',
  };
}

/**
 * One-click switch behind the sidebar's profile banner: a superuser steps into
 * the admin account, and from there steps back.
 *
 * Who may do what is decided from the session, not from anything the form
 * posts: a superuser can impersonate ADMIN_ACCOUNT_EMAIL (lib/auth.ts refuses
 * any other target), and an impersonated session can stop impersonating. An
 * admin who simply logged in has neither, so this cannot be used to climb to
 * superuser.
 */
export async function switchAccountAction() {
  const me = await currentUser();
  if (!me) return;

  if (me.impersonatorId) {
    await auth.api.stopImpersonating({ headers: await headers() });
  } else if (hasRole(me.role, 'SUPERUSER')) {
    const admin = await db.orm.public.User.where({ email: ADMIN_ACCOUNT_EMAIL })
      .select('id')
      .first();
    if (!admin) return;
    await auth.api.impersonateUser({
      body: { userId: admin.id },
      headers: await headers(),
    });
  } else {
    return;
  }

  redirect('/dashboard');
}

/**
 * Password sign-in, for login-form.tsx's useActionState. Returns an error
 * message, or redirects to the page the visitor was sent to /login from.
 */
export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (error) {
    // 403 (disabled or banned) and 429 (rate limited) carry a message meant
    // for the user.
    if (
      error instanceof APIError &&
      (error.status === 'FORBIDDEN' || error.status === 'TOO_MANY_REQUESTS')
    ) {
      return error.message;
    }
    if (error instanceof APIError) return 'Invalid credentials.';
    console.error('Sign-in failed:', error);
    return 'Something went wrong.';
  }

  redirect(safeRedirect(formData.get('redirectTo')));
}

// Same-origin paths only: "//evil.com" is protocol-relative, so it's refused
// along with absolute URLs.
function safeRedirect(target: FormDataEntryValue | null): string {
  return typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//')
    ? target
    : '/dashboard';
}

// Callable from client components, so the animated logout button can run its
// sequence first and sign out when it finishes.
export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect('/');
}
