import { db } from '@/src/prisma/db';
import { retell } from '@/app/lib/retell-api';

// Server-side only: imports the Prisma client and the Retell plumbing.

/**
 * Every phone number the system knows about, with its organization and the
 * agent that answers it. Unpaginated, like fetchAgents — a tenant has a
 * handful of numbers, not a page of them.
 */
export async function fetchPhoneNumbers(organizationId?: string) {
  try {
    const all = db.orm.public.PhoneNumber.select(
      'id',
      'e164',
      'label',
      'country',
      'isActive',
      'retellPhoneNumberId',
      'purchasedAt',
    )
      .include('organization', (o) => o.select('name', 'slug'))
      .include('agent', (a) => a.select('name', 'status'))
      .orderBy((p) => p.purchasedAt.desc());
    return await (organizationId ? all.where({ organizationId }) : all).all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch phone numbers.');
  }
}

/**
 * Mirrors Retell's phone numbers into the PhoneNumber table.
 *
 * Retell is the source of truth for which number reaches which agent — that
 * mapping lives in its dashboard, and it holds for numbers bought from Retell
 * and for ones carried in over a SIP trunk alike (Vonage numbers arrive here
 * as provider "custom"). So this reads rather than writes: nothing here
 * changes anything on Retell's side.
 *
 * A number is matched to an organization through its inbound agent, the same
 * path the call webhook uses. One with no agent this app knows about is
 * skipped rather than guessed at, and counted in `skipped`.
 */
export async function syncPhoneNumbersFromRetell() {
  const res = await retell('GET', '/list-phone-numbers');
  if (!res.ok) return { ok: false as const, message: res.message };

  const numbers: any[] = Array.isArray(res.data) ? res.data : [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const n of numbers) {
    const e164: string | undefined = n.phone_number;
    if (!e164) continue;

    // Inbound first: it is the agent that answers, and the one the webhook
    // maps a call through. Outbound-only numbers fall back to that agent.
    const retellAgentId: string | undefined =
      n.inbound_agents?.[0]?.agent_id ?? n.outbound_agents?.[0]?.agent_id;
    const agent = retellAgentId
      ? await db.orm.public.Agent.where({ retellAgentId })
          .select('id', 'organizationId')
          .first()
      : null;
    if (!agent) {
      skipped += 1;
      continue;
    }

    const fields = {
      organizationId: agent.organizationId,
      agentId: agent.id,
      label: n.nickname ?? null,
      // Retell carries no country field; the inbound allow-list is the only
      // place it records one, and it is empty when every country is allowed.
      country: n.allowed_inbound_country_list?.[0] ?? '',
      // Retell has no separate id for a phone number — the E.164 string is the
      // key its own APIs take, so that is what is stored here.
      retellPhoneNumberId: e164,
      isActive: true,
    };

    const existing = await db.orm.public.PhoneNumber.where({ e164 })
      .select('id')
      .first();
    if (existing) {
      await db.orm.public.PhoneNumber.where({ id: existing.id }).update(fields);
      updated += 1;
    } else {
      await db.orm.public.PhoneNumber.create({ e164, ...fields });
      created += 1;
    }
  }

  return { ok: true as const, created, updated, skipped, total: numbers.length };
}
