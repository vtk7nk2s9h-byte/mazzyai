import {
  CalendarDaysIcon,
  EnvelopeIcon,
  PhoneArrowDownLeftIcon,
} from '@heroicons/react/24/outline';

import { fetchLiveEvents } from '@/app/lib/event-data';

const icons = {
  call: PhoneArrowDownLeftIcon,
  meeting: CalendarDaysIcon,
  email: EnvelopeIcon,
};

/** "just now", "3 min ago", "2 h ago", then the date. Re-evaluated on each refresh. */
export function ago(at: string) {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(at)) / 1000));
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(at));
}

/**
 * The newest events, one row each. A call still in progress gets a pulsing red
 * dot, the same glow as the status dots elsewhere.
 */
// Same glass as the header above and the knowledge-base cards.
const frame =
  'mt-3 rounded-lg border border-white/[0.12] bg-gradient-to-br from-white/[0.10] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl';

export default async function LiveEventsFeed({
  organizationId,
  kind,
}: {
  organizationId?: string;
  kind?: 'call' | 'meeting' | 'email';
}) {
  const events = await fetchLiveEvents(organizationId, undefined, kind);

  if (events.length === 0) {
    return (
      <div className={`${frame} p-10 text-center text-sm text-gray-500`}>
        {kind
          ? `No ${kind === 'call' ? 'calls' : kind === 'meeting' ? 'meetings' : 'emails'} yet.`
          : 'Nothing has happened yet. Calls and meetings will appear here as they come in.'}
      </div>
    );
  }

  return (
    // The frame scrolls on its own, so a long feed doesn't push the page down.
    <div className={`${frame} max-h-[32rem] overflow-y-auto`}>
    <ul className="divide-y divide-white/[0.06]">
      {events.map((e) => {
        const EventIcon = icons[e.kind];
        return (
          <li
            key={e.id}
            className="flex items-start gap-3 px-4 py-3"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.06] text-gray-600">
              <EventIcon className="w-4" />
            </span>
            <div className="min-w-0 grow">
              <p className="flex items-center gap-2 text-sm font-medium">
                {e.live && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand-red-lit shadow-[0_0_8px_rgba(255,46,67,0.8)]"
                  />
                )}
                {e.title}
                <span className="truncate font-normal text-gray-600">
                  {e.subject}
                </span>
              </p>
              {e.detail && (
                <p className="truncate text-xs text-gray-500">{e.detail}</p>
              )}
              {e.organization && (
                <p className="text-xs text-gray-500">{e.organization}</p>
              )}
            </div>
            <time
              dateTime={new Date(e.at).toISOString()}
              className="shrink-0 whitespace-nowrap text-xs text-gray-500"
            >
              {ago(e.at)}
            </time>
          </li>
        );
      })}
    </ul>
    </div>
  );
}
