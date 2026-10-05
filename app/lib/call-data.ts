import { EMAIL_TYPES, PAGE_SIZE, type EmailType } from '@/app/lib/utils';
import { db } from '@/src/prisma/db';

/** Rows per page when the call log is paginated (the organization tables). */
export const CALLS_PER_PAGE = PAGE_SIZE;

/**
 * Calls, newest first, with the agent that handled each one.
 *
 * Unfiltered and unpaginated by default — that is what the global call logs
 * view shows. Pass `organizationId` to scope the list to one tenant and
 * `currentPage` to page through it, which is how the organization page reads
 * its own calls.
 */
export async function fetchCalls({
  organizationId,
  currentPage,
}: {
  organizationId?: string;
  currentPage?: number;
} = {}) {
  try {
    let calls = db.orm.public.Call.include('agent', (agent) =>
      agent.select('name'),
    ).orderBy((f) => f.startedAt.desc());

    if (organizationId) {
      calls = calls.where({ organizationId });
    }
    if (currentPage) {
      calls = calls
        .limit(CALLS_PER_PAGE)
        .offset((currentPage - 1) * CALLS_PER_PAGE);
    }

    return await calls.all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch calls.');
  }
}

/**
 * One call with every column the detail page shows, its agent and its
 * organization. Null when the id matches nothing. Who may see it is the page's
 * decision: this reads whatever it is asked for.
 */
export async function fetchCall(id: string) {
  try {
    return await db.orm.public.Call.where({ id })
      .select(
        'id',
        'organizationId',
        'retellCallId',
        'direction',
        'status',
        'fromNumber',
        'toNumber',
        'callerName',
        'startedAt',
        'endedAt',
        'durationMs',
        'disconnectReason',
        'transferredTo',
        'transferredAt',
        'recordingUrl',
        'consentToRecord',
        'transcript',
        'summary',
        'sentiment',
        'dynamicVariables',
        'collectedVariables',
        'costCents',
        'rawEvents',
        'createdAt',
      )
      .include('agent', (a) => a.select('name'))
      .include('organization', (o) => o.select('name', 'slug'))
      .first();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the call.');
  }
}

/**
 * The emails the system sent because of one call, newest first. Each send is an
 * AuditLog row (action "email.sent", target the Retell call id, diff
 * { to, subject }) — see follow-up-email.ts.
 */
export async function fetchCallEmails(retellCallId: string) {
  try {
    const rows = await db.orm.public.AuditLog.where({
      action: 'email.sent',
      targetType: 'call',
      targetId: retellCallId,
    })
      .select('id', 'diff', 'createdAt')
      .orderBy((a) => a.createdAt.desc())
      .all();
    return rows.map((r) => {
      const diff = (r.diff ?? {}) as {
        to?: string;
        subject?: string;
        type?: string;
      };
      return {
        id: r.id,
        to: diff.to ?? null,
        subject: diff.subject ?? null,
        // Rows logged before the type was recorded were all follow-ups.
        type: (EMAIL_TYPES as readonly string[]).includes(diff.type ?? '')
          ? (diff.type as EmailType)
          : ('FOLLOW_UP' as EmailType),
        sentAt: r.createdAt,
      };
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the call emails.');
  }
}

/**
 * Every email the system has sent, oldest first: its type and when. Scoped to
 * one organization when `organizationId` is given, every organization
 * otherwise (the superuser's Analytics). Same AuditLog rows as above.
 */
export async function fetchSentEmails(organizationId?: string) {
  try {
    const rows = await db.orm.public.AuditLog.where(
      organizationId
        ? { action: 'email.sent', organizationId }
        : { action: 'email.sent' },
    )
      .select('diff', 'createdAt')
      .orderBy((a) => a.createdAt.asc())
      .all();
    return rows.map((r) => {
      const type = (r.diff as { type?: string } | null)?.type ?? '';
      return {
        // Rows logged before the type was recorded were all follow-ups.
        type: (EMAIL_TYPES as readonly string[]).includes(type)
          ? (type as EmailType)
          : ('FOLLOW_UP' as EmailType),
        sentAt: r.createdAt,
      };
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch sent emails.');
  }
}

/** How many pages one organization's call log spans. */
export async function fetchCallPages(organizationId: string) {
  try {
    const { total } = await db.orm.public.Call.where({
      organizationId,
    }).aggregate((aggregate) => ({ total: aggregate.count() }));
    return Math.ceil(total / CALLS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to count calls.');
  }
}

// This module imports the Prisma client, so it must never be pulled into a
// client component. The presentational helpers live in @/app/lib/utils.
export type CallRow = Awaited<ReturnType<typeof fetchCalls>>[number];
