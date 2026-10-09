import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Knowledge-base file uploads travel in a server action; the default 1MB body
  // limit would reject almost any PDF. The action itself caps a file at 8MB.
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  devIndicators: {
    // Out of the sidebar's way — it defaults to bottom-left, right on top of
    // the sign-out button.
    position: 'bottom-right',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // The Content-Security-Policy is set in proxy.ts instead: it carries a
          // per-request nonce, so it cannot be a static value here.
          //
          // Kept as well as the policy's frame-ancestors, which this predates
          // and which some older browsers don't implement.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // The sign-in email links to /login/email-link with the OTP in its
          // query string (lib/auth.ts), so the full URL must never leave in a
          // Referer header to another origin.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // The call widget needs the microphone. Nothing here needs the rest.
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=(), geolocation=(), payment=()',
          },
          // Dev runs on plain http, where this is ignored anyway; sending it
          // only in production also keeps localhost out of the browser's HSTS
          // list for the next two years. No `preload` — that is a submission
          // to the preload list and a separate decision.
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains',
                },
              ]),
        ],
      },
    ];
  },
  // Disabled along with the `app` service in docker-compose.yml — the app runs
  // on the host now, where native file watching works. Uncomment if that
  // service is ever re-enabled.
  //
  // In the container the source arrives over a Windows bind mount, which
  // delivers no inotify events into Linux — without polling, hot reload never
  // fires. WATCHPACK_POLLING / CHOKIDAR_USEPOLLING do nothing here; those are
  // webpack and chokidar options, and dev runs on Turbopack. (Polling alone
  // did not fix it either; see the note in docker-compose.yml.)
  //
  // ...(process.env.DOCKER_DEV === 'true'
  //   ? { watchOptions: { pollIntervalMs: 1000 } }
  //   : {}),
};

export default nextConfig;
