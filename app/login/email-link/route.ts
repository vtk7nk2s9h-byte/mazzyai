import { APIError } from 'better-auth/api';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * The "sign in with one click" link in the OTP email, and the target of the
 * login page's code form. Both carry the same code, so clicking and typing
 * verify identically — the code is single-use either way. nextCookies() in lib/auth.ts sets the session
 * cookie on the response.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  try {
    await auth.api.signInEmailOTP({
      body: { email: params.get('email') ?? '', otp: params.get('otp') ?? '' },
      headers: request.headers,
    });
  } catch (error) {
    // Back to the login page's code panel with the reason. A wrong code still
    // has tries left (3 per code), so the address rides along and the code box
    // comes back without sending a new one.
    const code = error instanceof APIError ? error.body?.code : undefined;
    const back = new URLSearchParams({
      error:
        code === 'INVALID_OTP'
          ? 'invalid-code'
          : code === 'TOO_MANY_ATTEMPTS'
            ? 'too-many-attempts'
            : code === 'RATE_LIMITED'
              ? 'rate-limited'
              : 'code-expired',
      email: params.get('email') ?? '',
      callbackUrl: params.get('callbackUrl') ?? '/dashboard',
    });
    redirect(`/login?${back}`);
  }
  // Same-origin paths only, so the form's callbackUrl can't send anyone off
  // the site.
  const next = params.get('callbackUrl');
  redirect(next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
}
