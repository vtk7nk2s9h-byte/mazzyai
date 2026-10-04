import {
  CalendarDaysIcon,
  ChevronDownIcon,
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
    // overflow-x-hidden: a row mid-slide sits outside the frame and would
    // otherwise flash a horizontal scrollbar.
    <div className={`${frame} max-h-[32rem] overflow-y-auto overflow-x-hidden`}>
    <ul className="divide-y divide-white/[0.06]">
      {events.map((e) => {
        const EventIcon = icons[e.kind];
        return (
          // The animation runs when the element is created. The 5-second
          // refresh keeps existing rows' DOM nodes (same key), so only a row
          // that is new to the list slides in.
          <li key={e.id} className="live-row-in">
            {/* A native disclosure: no state to keep. The page re-renders every
                few seconds, but the element keeps its key, so an opened row
                stays open. */}
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-red-lit [&::-webkit-details-marker]:hidden">
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
                <ChevronDownIcon
                  aria-hidden="true"
                  className="w-3.5 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180 group-hover:text-brand-red-lit"
                />
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
              </summary>

              <div className="space-y-3 px-4 pb-4 pl-[3.75rem] text-xs">
                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
                  {e.fields.map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="break-words text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
                {e.blocks.map((b) => (
                  <div key={b.label}>
                    <p className="mb-1 text-gray-500">{b.label}</p>
                    <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-white/[0.07] bg-black/20 p-3 leading-relaxed text-gray-600">
                      {b.content}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
    </div>
  );
}
