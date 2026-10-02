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
import { ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * Caller name with a small arrow that reveals the full summary on hover.
 *
 * CSS-only — `group-hover` plus `peer-focus-visible`, so it needs no client
 * component and the table stays server-rendered. The arrow is a real button so
 * the popup is reachable by keyboard; a mouse click doesn't keep it open, so it
 * closes as soon as the pointer leaves. And `whitespace-normal` undoes the
 * cell's nowrap so the text wraps inside the bubble.
 */
function CallerName({
  name,
  summary,
}: {
  name: string;
  summary: string | null;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-medium">{name}</span>

      {summary && (
        <span className="group relative inline-flex">
          <button
            type="button"
            aria-label={`Show call summary for ${name}`}
            className="peer inline-flex rounded text-gray-400 transition-colors hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400 group-hover:text-brand-red-lit"
          >
            <ChevronDownIcon className="w-3.5" />
          </button>

          <span
            role="tooltip"
            className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-1.5 w-64 -translate-x-1/2 whitespace-normal rounded-lg border border-maroon-400/50 bg-white/[0.06] p-3 text-xs font-normal leading-relaxed text-gray-600 opacity-0 shadow-[0_0_0_1px_rgba(255,46,67,0.08),0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-opacity duration-150 group-hover:visible group-hover:opacity-100 peer-focus-visible:visible peer-focus-visible:opacity-100 motion-reduce:transition-none"
          >
            {summary}
          </span>
        </span>
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

          <table className="hidden min-w-full text-gray-900 md:table pl-18">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:">
                  Caller
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Agent
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Direction
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Date
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
                  <td className="whitespace-nowrap py-3 pl-12 pr-3">
                    <div>
                      <CallerName
                        name={callerLabel(call)}
                        summary={call.summary}
                      />
                      {call.summary && (
                        <p className="max-w-[26ch] truncate text-xs text-gray-500">
                          {call.summary}
                        </p>
                      )}
                    </div>
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
