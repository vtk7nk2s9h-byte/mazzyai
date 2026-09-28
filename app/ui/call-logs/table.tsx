import {
  callerLabel,
  formatCurrency,
  formatDateToLocal,
  formatDuration,
} from '@/app/lib/utils';
import { fetchCalls } from '@/app/lib/call-data';
import {
  CallDirectionBadge,
  CallStatusBadge,
  SentimentDot,
} from '@/app/ui/call-logs/status';
import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';

/**
 * Caller name with a small arrow that opens the call summary.
 *
 * A native popover rather than an absolutely-positioned bubble: the table
 * scrolls sideways, and anything positioned inside a scroll container gets
 * clipped by it — which is exactly what happened to the old hover tooltip, cut
 * off on the left and along the bottom. A popover renders in the top layer, so
 * no ancestor's overflow can touch it, and it brings Escape, light-dismiss and
 * focus handling with it. Still no client component: `popovertarget` is
 * markup, not script.
 *
 * `id` has to be unique per rendered trigger — the mobile cards and the
 * desktop table both render every call, so the call sites prefix it.
 */
function CallerName({
  id,
  name,
  summary,
}: {
  id: string;
  name: string;
  summary: string | null;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-medium">{name}</span>

      {summary && (
        <>
          {/* A speech bubble with text in it, not a chevron: a chevron reads
              as "expand a menu" and says nothing about what is behind it. The
              icon only renders when a summary exists, so its presence is the
              signal that there is one; `title` spells out the action for
              anyone who hovers, and the label carries it for screen readers. */}
          <button
            type="button"
            popoverTarget={id}
            title="Show call summary"
            aria-label={`Show call summary for ${name}`}
            className="inline-flex rounded text-gray-400 transition-colors hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
          >
            <ChatBubbleBottomCenterTextIcon className="w-4" />
          </button>

          {/* The UA centres a popover in the viewport (inset:0 + margin:auto),
              which is what we want — there is no anchor positioning to rely on
              yet. w-[min(...)] keeps it readable without overflowing a phone. */}
          <div
            id={id}
            popover="auto"
            className="w-[min(24rem,calc(100vw-2rem))] whitespace-normal rounded-lg border border-maroon-400/50 bg-white/[0.06] p-4 text-sm font-normal leading-relaxed text-gray-600 shadow-[0_0_0_1px_rgba(255,46,67,0.08),0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
          >
            <p className="mb-1 text-xs text-gray-500">{name}</p>
            {summary}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * With no props this is the global log: every call, unpaginated. The
 * organization page passes `organizationId` and `currentPage` to get the same
 * table scoped to one tenant.
 */
export default async function CallLogsTable({
  organizationId,
  currentPage,
}: {
  organizationId?: string;
  currentPage?: number;
} = {}) {
  const calls = await fetchCalls({ organizationId, currentPage });

  if (calls.length === 0) {
    return (
      <div className="mt-6 rounded-lg bg-gray-50 p-10 text-center text-sm text-gray-500">
        {organizationId ? (
          'No calls for this organization yet.'
        ) : (
          <>
            No calls yet. Run{' '}
            <code className="text-gray-600">pnpm db:seed</code> to add sample
            data.
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 flow-root overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          {/* Stacked cards below md — a six-column table is unreadable on a
              phone, so the same rows are re-laid-out rather than scrolled. */}
          <div className="md:hidden">
            {calls.map((call) => (
              <div
                key={call.id}
                className="mb-2 w-full rounded-md bg-gray-100 p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="mb-1">
                      <CallerName
                        id={`call-summary-card-${call.id}`}
                        name={callerLabel(call)}
                        summary={call.summary}
                      />
                    </div>
                    <p className="text-sm text-gray-500">{call.agent?.name}</p>
                  </div>
                  <CallStatusBadge status={call.status} />
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <div>
                    <p className="text-xl font-medium">
                      {formatDuration(call.durationMs)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {call.startedAt
                        ? formatDateToLocal(call.startedAt)
                        : '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <CallDirectionBadge direction={call.direction} />
                    <SentimentDot sentiment={call.sentiment} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Caller
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Agent
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Direction
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Started
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Duration
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Cost
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Sentiment
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-100">
              {calls.map((call) => (
                <tr
                  key={call.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  {/* No second copy of the summary under the name: it was the
                      widest thing in the table and the popover already carries
                      the full text. */}
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <CallerName
                      id={`call-summary-row-${call.id}`}
                      name={callerLabel(call)}
                      summary={call.summary}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {call.agent?.name ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <CallDirectionBadge direction={call.direction} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {call.startedAt ? formatDateToLocal(call.startedAt) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {formatDuration(call.durationMs)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {formatCurrency(call.costCents ?? 0)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <SentimentDot sentiment={call.sentiment} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <CallStatusBadge status={call.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
