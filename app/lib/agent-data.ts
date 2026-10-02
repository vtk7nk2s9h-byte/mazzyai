import { db } from '@/src/prisma/db';
import type { RetellVoice } from '@/app/lib/retell-options';
import { retell } from '@/app/lib/retell-api';

/**
 * Every agent in the system, newest first, with the organization it belongs to
 * and counts of its phone numbers and calls. Unpaginated: it is the internal
 * overview, and the place to add paging if the list ever outgrows a page.
 * Pass `organizationId` to see only that organization's agents.
 */
export async function fetchAgents(organizationId?: string) {
  try {
    const all = db.orm.public.Agent.select(
      'id',
      'name',
      'description',
      'status',
      'retellAgentId',
      'createdAt',
    )
      .include('organization', (o) => o.select('name', 'slug'))
      .include('phoneNumbers', (p) => p.count())
      .include('calls', (c) => c.count())
      .orderBy((a) => a.createdAt.desc());
    return await (organizationId ? all.where({ organizationId }) : all).all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch agents.');
  }
}

/**
 * The organization whose agents this user may see: their active membership's
 * organization, but only when they are its OWNER or ADMIN. Null for everyone
 * else, which is what keeps the Agents link and page closed to plain members.
 */
export async function fetchAgentsOrganizationId(userId: string) {
  try {
    const membership = await db.orm.public.Membership.where({
      userId,
      status: 'ACTIVE',
    })
      .select('organizationId', 'role')
      .first();
    return membership && ['OWNER', 'ADMIN'].includes(membership.role)
      ? membership.organizationId
      : null;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to find the organization.');
  }
}

/** An organization's uploaded knowledge-base resources, newest first. */
export async function fetchKnowledge(organizationId: string) {
  try {
    return await db.orm.public.KnowledgeDocument.where({ organizationId })
      .select(
        'id',
        'title',
        'sourceType',
        'sourceUrl',
        'filePath',
        'sizeBytes',
        'status',
        'retellKnowledgeBaseId',
        'createdAt',
      )
      .orderBy((d) => d.createdAt.desc())
      .all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the knowledge base.');
  }
}

/**
 * Retell indexes a source after the upload returns, so a fresh row is saved as
 * INDEXING. This asks Retell where the knowledge base stands and settles the
 * rows; a failed lookup leaves them as they are for the next page load.
 */
export async function syncKnowledgeStatus(
  docs: Awaited<ReturnType<typeof fetchKnowledge>>,
) {
  const pending = docs.filter((d) => d.status === 'INDEXING');
  const kbId = pending.find((d) => d.retellKnowledgeBaseId)?.retellKnowledgeBaseId;
  if (!kbId) return false;

  const res = await retell('GET', `/get-knowledge-base/${kbId}`).catch(() => null);
  if (!res?.ok) return false;
  const next =
    res.data?.status === 'complete'
      ? 'INDEXED'
      : res.data?.status === 'error'
        ? 'FAILED'
        : null;
  if (!next) return false;

  for (const d of pending) {
    await db.orm.public.KnowledgeDocument.where({ id: d.id }).update({
      status: next,
      ...(next === 'INDEXED' && { indexedAt: new Date().toISOString() }),
    });
  }
  return true;
}

/** One entry of POST /v2/list-agents `items`. */
export type RetellAgent = {
  agent_id: string;
  agent_name?: string | null;
  channel?: 'voice' | 'chat';
  user_modified_timestamp?: number; // ms since epoch
  tags?: Record<string, { version?: number }>;
};

type RetellListResponse = {
  items: RetellAgent[];
  has_more: boolean;
  pagination_key?: string;
};

/**
 * Every agent on the Retell account, via POST /v2/list-agents. The response is
 * `{ items, has_more, pagination_key }`, so this follows the key until
 * `has_more` is false.
 */
export async function fetchRetellAgents(): Promise<RetellAgent[]> {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) throw new Error('RETELL_API_KEY is not set.');

  const agents: RetellAgent[] = [];
  let paginationKey: string | undefined;

  do {
    const url = new URL('https://api.retellai.com/v2/list-agents');
    url.searchParams.set('limit', '100');
    if (paginationKey) url.searchParams.set('pagination_key', paginationKey);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('Retell Error:', res.status, await res.text());
      throw new Error(`Retell list-agents failed (${res.status}).`);
    }

    const page: RetellListResponse = await res.json();
    agents.push(...page.items);
    paginationKey = page.has_more ? page.pagination_key : undefined;
  } while (paginationKey);

  return agents;
}

/** The settings the Retell table shows, from GET /get-agent (latest version). */
export type RetellAgentDetail = {
  agent_id: string;
  voice_id: string;
  voice_model?: string | null;
  voice_speed?: number;
  voice_temperature?: number;
  volume?: number;
  voice_emotion?: string | null;
  interruption_sensitivity?: number;
  stt_mode?: 'fast' | 'accurate' | 'custom';
  boosted_keywords?: string[] | null;
  language?: string | string[];
  // null or absent means voicemail detection is off.
  voicemail_option?: { action: { type: string } } | null;
};

export async function fetchRetellAgentDetail(
  agentId: string,
): Promise<RetellAgentDetail> {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) throw new Error('RETELL_API_KEY is not set.');

  const res = await fetch(`https://api.retellai.com/get-agent/${agentId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Retell get-agent failed (${res.status}).`);
  return res.json();
}

/**
 * Which organization each Retell agent is assigned to, keyed by Retell agent
 * id. An assignment is an Agent row carrying that `retellAgentId`.
 */
export async function fetchRetellAssignments() {
  try {
    const rows = await db.orm.public.Agent.select('retellAgentId', 'status')
      .include('organization', (o) => o.select('id', 'name'))
      .all();
    const byRetellId = new Map<
      string,
      { id: string; name: string; status: string }
    >();
    for (const row of rows) {
      if (row.retellAgentId && row.organization) {
        byRetellId.set(row.retellAgentId, {
          ...row.organization,
          status: row.status,
        });
      }
    }
    return byRetellId;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch agent assignments.');
  }
}

/** Every live organization, A to Z: the choices in the assign dialog. */
export async function fetchAssignableOrganizations() {
  try {
    return await db.orm.public.Organization.select('id', 'name')
      .where((o) => o.deletedAt.isNull())
      .orderBy((o) => o.name.asc())
      .all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch organizations.');
  }
}

/** Voices for the create-agent picker, via GET /list-voices (a bare array). */
export async function fetchRetellVoices(): Promise<RetellVoice[]> {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) throw new Error('RETELL_API_KEY is not set.');

  const res = await fetch('https://api.retellai.com/list-voices', {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Retell list-voices failed (${res.status}).`);
  return res.json();
}

// Imports the Prisma client, so never pull this into a client component.
