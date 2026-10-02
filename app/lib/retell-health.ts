import { db } from '@/src/prisma/db';

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
  const apiKey = process.env.RETELL_API_KEY;
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

/**
 * When Retell last delivered a correctly signed webhook, or null if it never
 * has. This is the only real evidence that Retell can reach us.
 */
export async function lastWebhookAt(): Promise<string | null> {
  try {
    const row = await db.orm.public.WebhookEvent.where({
      provider: 'RETELL',
      signatureValid: true,
    })
      .select('createdAt')
      .orderBy((w) => w.createdAt.desc())
      .first();
    return row?.createdAt ?? null;
  } catch (error) {
    console.error('Database Error:', error);
    return null;
  }
}

// Imports the Prisma client, so never pull this into a client component.
