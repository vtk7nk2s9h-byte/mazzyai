'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { withRoleAction } from '@/auth';
import { checkTunnel } from '@/app/lib/retell-health';
import { syncWebhookUrlToRetell } from '@/app/lib/retell-api';
import { startTunnel, stopTunnel } from '@/app/lib/tunnel-process';

const DEV_ONLY = { error: 'Tunnels are for local development only.' };
// A quick tunnel usually answers within seconds, but registering with
// Cloudflare and the new hostname resolving can take much longer on a slow
// connection.
const TUNNEL_WAIT_MS = 60_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The address the tunnel will expose. Taken from the Host header only to learn
 * the dev server's port, and only if it names this machine: a Host header is
 * set by whoever makes the request, so using it as-is would let a request pick
 * any destination for the tunnel.
 */
async function localOrigin() {
  const host = (await headers()).get('host') ?? '';
  const port =
    /^(?:localhost|127\.0\.0\.1):(\d{2,5})$/.exec(host)?.[1] ?? '3000';
  return `http://localhost:${port}`;
}

/**
 * Opens a public tunnel to this dev server so Retell's webhooks can reach it,
 * and waits until a request through it gets an answer from the webhook route.
 * Superusers, in development, only.
 */
export const startTunnelAction = withRoleAction('SUPERUSER', async () => {
  if (process.env.NODE_ENV === 'production') return DEV_ONLY;

  if ((await checkTunnel(true)).state !== 'none') {
    return { error: 'A tunnel is already running.' };
  }

  const started = await startTunnel(await localOrigin());
  if (!started.ok) return { error: started.message };

  // The process is up in a moment; the public address takes longer.
  const deadline = Date.now() + TUNNEL_WAIT_MS;
  let last = await checkTunnel(true);
  while (last.state !== 'up' && Date.now() < deadline) {
    await sleep(1000);
    last = await checkTunnel(true);
  }

  if (last.state === 'up') {
    // The address is only useful to Retell if Retell is told about it, and a
    // quick tunnel's hostname is new every time — so push it now rather than
    // leaving the dashboard pointing at the last session's dead address.
    const synced = await syncWebhookUrlToRetell(last.host!);
    revalidatePath('/dashboard/live-events');
    return {
      ok: true as const,
      host: last.host,
      message: synced.ok
        ? "Retell's webhook URL now points here."
        : `Retell was not updated (${synced.message}) — set the webhook URL by hand.`,
    };
  }

  stopTunnel();
  // What the last check saw says where it stalled: no tunnel agent found, the
  // address not answering yet, or the route answering with something unexpected.
  return {
    error: `The tunnel did not come up within ${TUNNEL_WAIT_MS / 1000} seconds (last check: ${last.message}${last.host ? `, ${last.host}` : ''}).`,
  };
});

/** Closes the tunnel this server opened. Superusers, in development, only. */
export const stopTunnelAction = withRoleAction('SUPERUSER', async () => {
  if (process.env.NODE_ENV === 'production') return DEV_ONLY;
  stopTunnel();
  await checkTunnel(true);
  revalidatePath('/dashboard/live-events');
  return { ok: true as const };
});
