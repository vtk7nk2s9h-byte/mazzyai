import { callerLabel } from '@/app/lib/utils';
import { db } from '@/src/prisma/db';

/** One line of the Live Events feed, from either a call or a meeting. */
export type LiveEvent = {
  id: string;
  kind: 'call' | 'meeting' | 'email';
  /** When it happened: a call's start, or the moment a meeting was set. */
  at: string;
  title: string;
  subject: string;
  detail: string | null;
  /** True while a call is still going. */
  live: boolean;
  /** Set when the feed spans organizations, so each event can name its own. */
  organization: string | null;
};

const CALL_TITLES = {
  INBOUND: 'Call received',
  OUTBOUND: 'Outbound call',
  WEB: 'Web call',
} as const;

/**
 * The newest calls and meetings, merged and sorted. Pass `organizationId` to
 * keep one tenant's events; leave it out for every organization's. `kind`
 * keeps one type of task (calls or meetings).
 *
 * Calls are events from the moment they are created (the webhook creates the
 * row when Retell reports the call), and a meeting is an event when it is *set*
 * — its createdAt — not when it takes place.
 */
export async function fetchLiveEvents(
  organizationId?: string,
  limit = 40,
  kind?: LiveEvent['kind'],
): Promise<LiveEvent[]> {
  try {
    const calls = db.orm.public.Call.select(
      'id',
      'status',
      'direction',
      'callerName',
      'fromNumber',
      'summary',
      'startedAt',
      'createdAt',
    )
      .include('organization', (o) => o.select('name'))
      .include('agent', (a) => a.select('name'))
      .orderBy((c) => c.createdAt.desc());

    const meetings = db.orm.public.Meeting.select(
      'id',
      'title',
      'attendeeName',
      'startsAt',
      'createdAt',
    )
      .include('organization', (o) => o.select('name'))
      .orderBy((m) => m.createdAt.desc());

    // Emails the system sent are recorded as AuditLog rows with the action
    // "email.sent" and a diff of { to, subject }, so nothing new is needed to
    // list them — whatever sends an email writes one of these.
    const emails = db.orm.public.AuditLog.where({
      action: 'email.sent',
      ...(organizationId && { organizationId }),
    })
      .select('id', 'diff', 'createdAt')
      .include('organization', (o) => o.select('name'))
      .orderBy((a) => a.createdAt.desc());

    const [callRows, meetingRows, emailRows] = await Promise.all([
      (organizationId ? calls.where({ organizationId }) : calls)
        .limit(limit)
        .all(),
      (organizationId ? meetings.where({ organizationId }) : meetings)
        .limit(limit)
        .all(),
      emails.limit(limit).all(),
    ]);

    const scoped = !!organizationId;

    const events: LiveEvent[] = [
      ...callRows.map((c): LiveEvent => {
        const live = c.status === 'ONGOING' || c.status === 'REGISTERED';
        return {
          id: `call-${c.id}`,
          kind: 'call',
          at: c.startedAt ?? c.createdAt,
          title: live
            ? 'Call in progress'
            : c.status === 'FAILED'
              ? 'Call failed'
              : CALL_TITLES[c.direction as keyof typeof CALL_TITLES],
          subject: callerLabel(c),
          detail: c.summary ?? (c.agent ? `Handled by ${c.agent.name}` : null),
          live,
          organization: scoped ? null : (c.organization?.name ?? null),
        };
      }),
      ...meetingRows.map((m): LiveEvent => ({
        id: `meeting-${m.id}`,
        kind: 'meeting',
        at: m.createdAt,
        title: 'Meeting set',
        subject: m.attendeeName ? `${m.title} · ${m.attendeeName}` : m.title,
        detail: `For ${new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(m.startsAt))}`,
        live: false,
        organization: scoped ? null : (m.organization?.name ?? null),
      })),
      ...emailRows.map((a): LiveEvent => {
        const diff = (a.diff ?? {}) as { to?: string; subject?: string };
        return {
          id: `email-${a.id}`,
          kind: 'email',
          at: a.createdAt,
          title: 'Email sent',
          subject: diff.to ?? 'Unknown recipient',
          detail: diff.subject ?? null,
          live: false,
          organization: scoped ? null : (a.organization?.name ?? null),
        };
      }),
    ];

    return events
      .filter((e) => !kind || e.kind === kind)
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, limit);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch live events.');
  }
}

// Imports the Prisma client, so never pull this into a client component.
