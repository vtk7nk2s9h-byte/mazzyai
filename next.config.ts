import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Knowledge-base file uploads travel in a server action; the default 1MB body
  // limit would reject almost any PDF. The action itself caps a file at 8MB.
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  devIndicators: {
    // Out of the sidebar's way — it defaults to bottom-left, right on top of
    // the sign-out button.
    position: 'bottom-right',
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
