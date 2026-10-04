import { spawn, type ChildProcess } from 'node:child_process';

// Local development only: runs cloudflared as a child of the dev server.
// Not a 'use server' file — nothing here may be callable from a browser. The
// server actions in tunnel-actions.ts are the only way in, and they check the
// role and the environment first.

// On globalThis, not in a module variable: hot reload re-evaluates modules, and
// a handle kept in one would be lost while the process it points at kept
// running, leaving a tunnel nobody can stop.
const g = globalThis as {
  __devTunnel?: ChildProcess;
  __devTunnelHook?: boolean;
};

/** The tunnel this server started and still owns, or null. */
export function ownedTunnel(): ChildProcess | null {
  const child = g.__devTunnel;
  return child && child.exitCode === null && !child.killed ? child : null;
}

/**
 * Starts a quick tunnel to `origin`. Resolves once the process has launched —
 * not once the tunnel is reachable, which takes a few seconds more and is for
 * the caller to wait on.
 */
export function startTunnel(
  origin: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (ownedTunnel()) return Promise.resolve({ ok: true });

  return new Promise((resolve) => {
    const child = spawn(
      'cloudflared',
      ['tunnel', '--url', origin, '--no-autoupdate'],
      { stdio: 'ignore', windowsHide: true },
    );

    child.once('error', (error: NodeJS.ErrnoException) =>
      resolve({
        ok: false,
        message:
          error.code === 'ENOENT'
            ? 'cloudflared is not installed or not on the PATH.'
            : error.message,
      }),
    );
    child.once('spawn', () => {
      g.__devTunnel = child;
      resolve({ ok: true });
    });
    child.once('exit', () => {
      if (g.__devTunnel === child) g.__devTunnel = undefined;
    });

    // The tunnel must not outlive the dev server that opened it.
    if (!g.__devTunnelHook) {
      g.__devTunnelHook = true;
      process.once('exit', () => g.__devTunnel?.kill());
    }
  });
}

/** Stops the tunnel this server started. A tunnel started elsewhere is left alone. */
export function stopTunnel() {
  g.__devTunnel?.kill();
  g.__devTunnel = undefined;
}
