import https from 'node:https';
import dns, { Resolver } from 'node:dns/promises';
import { RETELL_API_KEY } from '@/lib/env';

export type RetellHealth = { ok: boolean; message: string; ms?: number };

// The Live Events page refreshes every few seconds, and each refresh would
// otherwise make a Retell call. Thirty seconds is fresh enough for a status dot.
const CACHE_MS = 30_000;
let cached: { at: number; value: RetellHealth } | null = null;

/**
 * Is Retell reachable with our API key? One read-only request — the first page
 * of the agent list, which the Agents page already makes — classified by how it
 * came back. The messages are safe to show any signed-in viewer: they say what
 * is wrong, never the key or Retell's response body.
 */
export async function checkRetell(): Promise<RetellHealth> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const value = await probe();
  cached = { at: Date.now(), value };
  return value;
}

async function probe(): Promise<RetellHealth> {
  const apiKey = RETELL_API_KEY;
  if (!apiKey) return { ok: false, message: 'RETELL_API_KEY is not set' };

  const started = Date.now();
  try {
    const res = await fetch('https://api.retellai.com/v2/list-agents?limit=1', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const ms = Date.now() - started;
    if (res.ok) return { ok: true, message: 'Connected', ms };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'API key rejected', ms };
    }
    if (res.status === 402) {
      return { ok: false, message: 'Billing problem on the Retell account', ms };
    }
    if (res.status === 429) return { ok: false, message: 'Rate limited', ms };
    return { ok: false, message: `Retell error (${res.status})`, ms };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return {
      ok: false,
      message: timedOut ? 'Timed out reaching Retell' : 'Could not reach Retell',
    };
  }
}

export type TunnelHealth = {
  state: 'up' | 'down' | 'none';
  message: string;
  host?: string;
};

const WEBHOOK_PATH = '/api/retell/webhook';

/** Asks a local tunnel agent for the public hostname it is serving, or null. */
async function localTunnelHost(): Promise<string | null> {
  const ask = async (url: string, pick: (json: any) => string | undefined) => {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(700),
      });
      return res.ok ? (pick(await res.json()) ?? null) : null;
    } catch {
      return null;
    }
  };

  const found = await Promise.all([
    // cloudflared quick tunnels serve {"hostname": "..."} on their metrics
    // port, which is the first free one from 20241 up.
    ...[20241, 20242, 20243, 20244, 20245].map((port) =>
      ask(`http://127.0.0.1:${port}/quicktunnel`, (j) => j?.hostname),
    ),
    // ngrok lists its tunnels on its local API.
    ask('http://127.0.0.1:4040/api/tunnels', (j) => {
      const url = j?.tunnels?.find((t: any) =>
        String(t.public_url).startsWith('https://'),
      )?.public_url;
      return url ? new URL(url).host : undefined;
    }),
  ]);
  return found.find(Boolean) ?? null;
}

// Tunnels are started and stopped while testing, so this is cached for less
// time than the Retell probe.
const TUNNEL_CACHE_MS = 10_000;
let cachedTunnel: { at: number; value: TunnelHealth } | null = null;

/**
 * Is a tunnel carrying the internet to this dev server, and does it reach the
 * webhook route? Found through the tunnel agent's local API, then proven by an
 * unsigned POST through the public address: the route rejects it with 401
 * before touching the database, so getting a 401 back means the whole path —
 * tunnel, server, route — is up, without sending anything Retell would send.
 *
 * `fresh` skips the cache, for the moments right after starting or stopping one.
 *
 * Only meaningful in local development. On a deployed host there is no tunnel
 * agent to find, and this reports "none".
 */
export async function checkTunnel(fresh = false): Promise<TunnelHealth> {
  if (!fresh && cachedTunnel && Date.now() - cachedTunnel.at < TUNNEL_CACHE_MS) {
    return cachedTunnel.value;
  }
  const value = await probeTunnel();
  cachedTunnel = { at: Date.now(), value };
  return value;
}

// A new tunnel's hostname is visible to public resolvers within seconds, but
// this machine's own resolver can stay behind for a minute or more (and
// remembers a lookup that failed before the name existed). Retell resolves
// through its own, so asking the same kind of resolver answers the question
// that matters — can Retell reach this? — instead of "has my router caught up?".
const publicDns = new Resolver();
publicDns.setServers(['1.1.1.1', '8.8.8.8']);

/** Public resolvers first; this machine's own if they are unreachable (a network that blocks them). */
async function resolveHost(name: string): Promise<string[]> {
  try {
    return await publicDns.resolve4(name);
  } catch {
    return (await dns.lookup(name, { family: 4, all: true })).map((a) => a.address);
  }
}

/** POSTs an empty body to the tunnel's webhook route and returns the status. */
function postThroughTunnel(host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host,
        path: WEBHOOK_PATH,
        method: 'POST',
        timeout: 4000,
        lookup: (name, options, callback) => {
          resolveHost(name).then(
            (addresses) =>
              options.all
                ? (callback as any)(
                    null,
                    addresses.map((address) => ({ address, family: 4 })),
                  )
                : callback(null, addresses[0], 4),
            (error) => callback(error, '', 4),
          );
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end('{}');
  });
}

async function probeTunnel(): Promise<TunnelHealth> {
  const host = await localTunnelHost();
  if (!host) return { state: 'none', message: 'No tunnel running' };

  try {
    const status = await postThroughTunnel(host);
    return status === 401
      ? { state: 'up', message: 'Up', host }
      : { state: 'down', message: `Route answered ${status}`, host };
  } catch {
    // Not found yet, not answering yet: a fresh tunnel is both for its first
    // seconds, which is why the start action keeps asking.
    return { state: 'down', message: 'Not reachable yet', host };
  }
}
