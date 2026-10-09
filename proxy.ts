import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

const isDev = process.env.NODE_ENV === 'development';

// reCAPTCHA is pinned to its own path rather than the whole host. A bare
// https://www.google.com in script-src would also allow every other script
// that host serves, which is a well-known way around a policy like this one.
const RECAPTCHA_SCRIPTS = [
  'https://www.google.com/recaptcha/',
  'https://www.gstatic.com/recaptcha/',
];
// The web-call SDK (components/ui/voice-agent-widget.tsx): its REST calls, and
// the WebRTC session it opens against Retell's LiveKit host. retell-client-js-sdk
// pins one such host today, but the call response may name another.
const RETELL = [
  'https://api.retellai.com',
  'https://*.livekit.cloud',
  'wss://*.livekit.cloud',
];
// Where Retell serves call recordings for components/ui/call-recording.tsx —
// taken from the recordingUrl values actually stored on call rows.
const RECORDINGS = 'https://dxc03zgurdly9.cloudfront.net';

const REPORT_PATH = '/api/csp-report';

/**
 * The enforced Content-Security-Policy, carrying a per-request nonce.
 *
 * Nonces rather than 'unsafe-inline': a page renders ~30 inline scripts, nearly
 * all of them Next's streaming RSC payload, whose contents differ per request —
 * so hashes cannot cover them and 'unsafe-inline' would be the only other way
 * to run them, which is precisely what makes a script-src stop being a defence.
 * The usual price of nonces is that every route must render dynamically; this
 * app already does, because the root layout awaits currentUser() and this proxy
 * looks up a session on each request. So there is no static rendering or CDN
 * caching here to give up.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Next stamps this nonce onto the script tags it renders, including the
    // inline theme script in app/layout.tsx. The reCAPTCHA entries are here
    // because that script is injected at runtime and so carries no nonce.
    // Dev additionally needs 'unsafe-eval', which React uses there to rebuild
    // server error stacks. Note a nonce makes browsers ignore 'unsafe-inline',
    // which is the point — it cannot be re-added by accident.
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''} ${RECAPTCHA_SCRIPTS.join(' ')}`,
    // Deliberately 'unsafe-inline', and deliberately without a nonce: the
    // rendered page carries ~1,700 style="..." attributes from React style
    // props, and a nonce here would make browsers ignore 'unsafe-inline' and
    // drop every one of them. style-src-attr would be the narrower tool but is
    // unevenly supported. CSS injection is a far smaller problem than script
    // injection, so this is the trade taken.
    "style-src 'self' 'unsafe-inline'",
    // data: for the inline SVGs in the compiled stylesheet.
    "img-src 'self' data: blob:",
    // next/font/google self-hosts at build time, and nothing inlines a font.
    "font-src 'self'",
    `media-src 'self' blob: ${RECORDINGS}`,
    `connect-src 'self'${isDev ? ' ws:' : ''} ${[...RETELL, 'https://www.google.com/recaptcha/'].join(' ')}`,
    // The reCAPTCHA challenge iframe.
    'frame-src https://www.google.com/recaptcha/',
    "worker-src 'self' blob:",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
    // Both spellings: report-to is the current one, report-uri the deprecated
    // one that several browsers still implement and nothing else replaces yet.
    'report-to csp-endpoint',
    `report-uri ${REPORT_PATH}`,
  ].join('; ');
}

/** Puts the policy on a response, whether it redirects or renders. */
function withCsp(response: NextResponse, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set(
    'Reporting-Endpoints',
    `csp-endpoint="${REPORT_PATH}"`,
  );
  return response;
}

/**
 * Signed-out visitors can't reach /dashboard; signed-in ones are sent there
 * from everywhere else (the landing page, /login, …). Also the one place that
 * can mint a CSP nonce, since it is the only code that runs before the page
 * renders on every request.
 *
 * A real session lookup, not just a check that the cookie exists: a stale
 * cookie would otherwise bounce between /login and /dashboard. Proxy runs on
 * the Node.js runtime, so it can query the database like any page.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  const session = await auth.api.getSession({ headers: request.headers });
  const onDashboard = pathname.startsWith('/dashboard');

  if (onDashboard && !session) {
    const login = new URL('/login', request.url);
    login.searchParams.set('callbackUrl', pathname + search);
    return withCsp(NextResponse.redirect(login), csp);
  }
  if (!onDashboard && session) {
    return withCsp(NextResponse.redirect(new URL('/dashboard', request.url)), csp);
  }

  // Next reads the nonce back off the request's own CSP header while rendering,
  // which is how it knows what to stamp onto each script tag — so the header
  // goes on the way in as well as the way out.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), csp);
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
  //
  // One consequence worth knowing: the CSP above rides on this matcher, so it
  // covers documents and not static assets or /api. The headers in
  // next.config.ts have no matcher and cover everything.
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif|bmp|woff2?|ttf|otf|eot|css|js|map|txt|json|xml|webmanifest|wav|mp3|m4a|ogg|opus|aac|mp4|webm)$).*)',
  ],
};
