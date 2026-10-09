import { RETELL_API_KEY } from '@/lib/env';
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
        'errorMessage',
        'agentId',
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

/** An organization's agents, A to Z: the choices for "which agent uses this asset". */
export async function fetchOrgAgentOptions(organizationId: string) {
  try {
    return await db.orm.public.Agent.where({ organizationId })
      .select('id', 'name')
      .orderBy((a) => a.name.asc())
      .all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch agents.');
  }
}

/**
 * Retell indexes a source after the upload returns, so a fresh row is saved as
 * INDEXING. This asks Retell where each pending asset's knowledge base stands
 * and settles the rows; a failed lookup leaves them as they are for the next
 * page load.
 */
export async function syncKnowledgeStatus(
  docs: Awaited<ReturnType<typeof fetchKnowledge>>,
) {
  const pending = docs.filter(
    (d) => d.status === 'INDEXING' && d.retellKnowledgeBaseId,
  );
  let changed = false;

  for (const d of pending) {
    const res = await retell(
      'GET',
      `/get-knowledge-base/${d.retellKnowledgeBaseId}`,
    ).catch(() => null);
    if (!res?.ok) continue;
    // "complete" only means Retell finished trying: a source that could not be
    // read (a URL that doesn't resolve, say) is reported in error_messages and
    // leaves the base with nothing in it.
    const problem: string | undefined = res.data?.error_messages?.[0];
    const empty = !(res.data?.knowledge_base_sources ?? []).length;
    const next =
      res.data?.status === 'error' || (res.data?.status === 'complete' && empty && problem)
        ? 'FAILED'
        : res.data?.status === 'complete'
          ? 'INDEXED'
          : null;
    if (!next) continue;

    await db.orm.public.KnowledgeDocument.where({ id: d.id }).update({
      status: next,
      errorMessage: next === 'FAILED' ? (problem ?? 'Retell could not index this.').slice(0, 300) : null,
      ...(next === 'INDEXED' && { indexedAt: new Date().toISOString() }),
    });
    changed = true;
  }
  return changed;
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
  const apiKey = RETELL_API_KEY;
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
  /** ms since epoch: when the agent was last changed on Retell. */
  last_modification_timestamp?: number;
  // null or absent means voicemail detection is off.
  voicemail_option?: { action: { type: string } } | null;
};

export async function fetchRetellAgentDetail(
  agentId: string,
): Promise<RetellAgentDetail> {
  const apiKey = RETELL_API_KEY;
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
    const rows = await db.orm.public.Agent.select('retellAgentId', 'status', 'createdAt')
      .include('organization', (o) => o.select('id', 'name'))
      .all();
    const byRetellId = new Map<
      string,
      { id: string; name: string; status: string; createdAt: string }
    >();
    for (const row of rows) {
      if (row.retellAgentId && row.organization) {
        byRetellId.set(row.retellAgentId, {
          ...row.organization,
          status: row.status,
          createdAt: row.createdAt,
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

/**
 * Everything Retell holds on one agent, for the detail page. Loosely typed on
 * purpose: Retell adds fields often, and the page shows the ones that are there.
 */
export type RetellAgentFull = {
  agent_id: string;
  agent_name?: string | null;
  channel?: string;
  version?: number;
  is_published?: boolean;
  last_modification_timestamp?: number;
  response_engine?: { type: string; llm_id?: string };
  language?: string | string[];
  voice_id?: string;
  voice_model?: string | null;
  voice_speed?: number;
  voice_temperature?: number;
  volume?: number;
  voice_emotion?: string | null;
  responsiveness?: number;
  interruption_sensitivity?: number;
  enable_backchannel?: boolean;
  backchannel_frequency?: number;
  end_call_after_silence_ms?: number;
  max_call_duration_ms?: number;
  stt_mode?: string;
  boosted_keywords?: string[] | null;
  voicemail_option?: unknown;
  ambient_sound?: string | null;
  data_storage_setting?: string;
  data_storage_retention_days?: number;
  webhook_url?: string | null;
};

/** One agent from Retell, or null if it doesn't exist there. */
export async function fetchRetellAgentFull(
  agentId: string,
): Promise<RetellAgentFull | null> {
  const apiKey = RETELL_API_KEY;
  if (!apiKey) throw new Error('RETELL_API_KEY is not set.');

  const res = await fetch(`https://api.retellai.com/get-agent/${agentId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Retell get-agent failed (${res.status}).`);
  return res.json();
}

/** The prompt side of an agent that runs on a Retell LLM. */
export type RetellLlm = {
  llm_id: string;
  model?: string;
  model_temperature?: number;
  general_prompt?: string | null;
  begin_message?: string | null;
  start_speaker?: string;
  general_tools?: { type: string; name: string }[];
  knowledge_base_ids?: string[];
};

/** A Retell LLM, or null when it can't be read (the page then just omits the prompt). */
export async function fetchRetellLlm(llmId: string): Promise<RetellLlm | null> {
  const apiKey = RETELL_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(`https://api.retellai.com/get-retell-llm/${llmId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  }).catch(() => null);
  return res?.ok ? res.json() : null;
}

/** Our record of a Retell agent: which organization it is assigned to, and its status. */
export async function fetchAssignedAgent(retellAgentId: string) {
  try {
    return await db.orm.public.Agent.where({ retellAgentId })
      .select('id', 'name', 'status', 'organizationId')
      .include('organization', (o) => o.select('name', 'slug'))
      .first();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the agent.');
  }
}

/** Voices for the create-agent picker, via GET /list-voices (a bare array). */
export async function fetchRetellVoices(): Promise<RetellVoice[]> {
  const apiKey = RETELL_API_KEY;
  if (!apiKey) throw new Error('RETELL_API_KEY is not set.');

  const res = await fetch('https://api.retellai.com/list-voices', {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Retell list-voices failed (${res.status}).`);
  return res.json();
}

// Imports the Prisma client, so never pull this into a client component.
