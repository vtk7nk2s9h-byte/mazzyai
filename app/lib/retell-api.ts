import { db } from '@/src/prisma/db';

// Server-side Retell plumbing shared by the server actions. Not a 'use server'
// file: that kind may only export async functions that are public endpoints,
// and nothing here should be callable from a browser.

/** Calls the Retell API; returns the parsed body, or a message to show. */
export async function retell(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ ok: true; data: any } | { ok: false; message: string }> {
  // A FormData body goes out as-is: fetch has to set the multipart boundary in
  // the Content-Type itself, so the header must not be set here.
  const isForm = body instanceof FormData;
  const res = await fetch(`https://api.retellai.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
      ...(!isForm && { 'Content-Type': 'application/json' }),
    },
    body:
      body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    console.error('Retell Error:', method, path, res.status, text);
    return {
      ok: false,
      message: data?.message ?? `Retell error (${res.status}).`,
    };
  }
  return { ok: true, data };
}

/**
 * An organization's "Record calls" and "Data retention" as Retell agent fields.
 *
 * Retell has no switch for recordings alone. The one control is
 * `data_storage_setting`: "everything" keeps transcripts, recordings and logs,
 * "basic_attributes_only" keeps none of the three. So turning recording off
 * turns all three off.
 */
export function retellStorageSettings(settings: {
  recordCalls: boolean;
  dataRetentionDays: number;
}) {
  return {
    data_storage_setting: settings.recordCalls
      ? 'everything'
      : 'basic_attributes_only',
    data_storage_retention_days: settings.dataRetentionDays,
  };
}

/**
 * Pushes an organization's recording and retention settings to every one of its
 * agents that exists on Retell. Agents that were never linked (no
 * `retellAgentId`) have nothing to update. Counts rather than throws on a
 * per-agent failure, so one bad agent doesn't hide that the others went through.
 */
export async function syncOrgToRetell(
  organizationId: string,
  settings: { recordCalls: boolean; dataRetentionDays: number },
) {
  const agents = await db.orm.public.Agent.where({ organizationId })
    .select('retellAgentId')
    .all();
  const ids = agents
    .map((a) => a.retellAgentId)
    .filter((id): id is string => !!id);

  const results = await Promise.all(
    ids.map((id) =>
      retell('PATCH', `/update-agent/${id}`, retellStorageSettings(settings))
        .catch((): { ok: false; message: string } => ({
          ok: false,
          message: 'Could not reach Retell.',
        })),
    ),
  );
  return {
    total: ids.length,
    failed: results.filter((r) => !r.ok).length,
  };
}
