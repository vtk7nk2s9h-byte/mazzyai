import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Signed-out visitors can't reach /dashboard; signed-in ones are sent there
 * from everywhere else (the landing page, /login, …).
 *
 * A real session lookup, not just a check that the cookie exists: a stale
 * cookie would otherwise bounce between /login and /dashboard. Proxy runs on
 * the Node.js runtime, so it can query the database like any page.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await auth.api.getSession({ headers: request.headers });
  const onDashboard = pathname.startsWith('/dashboard');

  if (onDashboard && !session) {
    const login = new URL('/login', request.url);
    login.searchParams.set('callbackUrl', pathname + search);
    return NextResponse.redirect(login);
  }
  if (!onDashboard && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // https://nextjs.org/docs/app/api-reference/file-conventions/proxy#matcher
  //
  // Every static file extension has to be excluded, not just .png. Anything
  // that reaches proxy() above redirects a signed-in user off any
  // non-/dashboard path — so a logged-in request for
  // /logo.svg answered 302 to /dashboard, and the browser drew a broken image
  // where it expected the file. Audio and video are in the list for the same
  // reason: the landing page's call recording is /audio/sample-call.wav, and
  // the use-case demos fetch their /audio/demos/*.peaks.json (hence json).
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif|bmp|woff2?|ttf|otf|eot|css|js|map|txt|json|xml|webmanifest|wav|mp3|m4a|ogg|opus|aac|mp4|webm)$).*)',
  ],
};