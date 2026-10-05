import { ChevronDownIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { currentUser, hasRole } from '@/auth';
import { fetchAgentsOrganizationId } from '@/app/lib/agent-data';
import { fetchCalls, fetchSentEmails } from '@/app/lib/call-data';
import { fetchOrganizationCount, MONTHLY_MINUTES } from '@/app/lib/org-data';
import AgentCallsBar from '@/app/ui/analytics/agent-calls-bar';
import Donut from '@/app/ui/analytics/donut';
import EmailsBar from '@/app/ui/analytics/emails-bar';
import RangeFilter from '@/app/ui/analytics/range-filter';
import { lusitana } from '@/app/ui/fonts';
import { EMAIL_TYPES, EMAIL_TYPE_LABELS } from '@/app/lib/utils';

export const metadata: Metadata = {
  title: 'Analytics',
};

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.05] p-4 backdrop-blur-xl">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`${lusitana.className} mt-1 text-2xl`}>{value}</p>
    </div>
  );
}

/** How far back the page can look, in months. */
const RANGES = [3, 6, 12] as const;
const DEFAULT_RANGE = 6;

type Params = { calls?: string; cost?: string; minutes?: string; range?: string };

/**
 * The page's URL with one choice changed and every other kept, so picking a
 * range keeps each card's month and picking a month keeps the range.
 */
function hrefWith(params: Params, change: Partial<Params>) {
  const next = new URLSearchParams();
  for (const n of ['range', 'calls', 'cost', 'minutes'] as const) {
    const v = n in change ? change[n] : params[n];
    if (v) next.set(n, v);
  }
  return `?${next}`;
}

/** The last `count` months, newest first, as "YYYY-MM" keys with a readable label. */
function recentMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return {
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
    };
  });
}

/**
 * A card's own month picker. A <details> is the dropdown and each month is a
 * link, so the choice lives in the URL; the other choices are kept.
 */
function MonthFilter({
  name,
  current,
  months,
  params,
  allTime = true,
}: {
  name: 'calls' | 'cost' | 'minutes';
  current?: string;
  months: { key: string; label: string }[];
  params: Params;
  /** Offer "All time" as an option; the minutes card has none. */
  allTime?: boolean;
}) {
  const href = (key?: string) => hrefWith(params, { [name]: key });
  const options = allTime ? [{ key: undefined, label: 'All time' }, ...months] : months;
  return (
    // Keyed on the choice, so the list closes once a month is picked.
    <details key={current ?? 'all'} className="relative shrink-0">
      <summary className="flex h-7 cursor-pointer list-none items-center gap-1 rounded-md border border-white/[0.12] px-2 text-xs text-gray-600 transition-colors hover:border-brand-red-lit/50 hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit [&::-webkit-details-marker]:hidden">
        {options.find((o) => o.key === current)?.label}
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </summary>
      <ul className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-white/[0.07] bg-[#140a0d]/90 p-1 shadow-xl backdrop-blur-xl">
        {options.map((o) => (
          <li key={o.label}>
            <Link
              href={href(o.key)}
              aria-current={o.key === current ? 'page' : undefined}
              className="block rounded-md px-3 py-1.5 text-xs text-gray-600 hover:text-brand-red-lit aria-[current=page]:text-white"
            >
              {o.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function Page(props: {
  searchParams?: Promise<Params>;
}) {
  const params = (await props.searchParams) ?? {};
  const range =
    RANGES.find((n) => String(n) === params.range) ?? DEFAULT_RANGE;
  const months = recentMonths(range);
  const period = `last ${range} months`;
  const pick = (asked?: string) => months.find((m) => m.key === asked)?.key;
  const callsMonth = pick(params.calls);
  const costMonth = pick(params.cost);
  // Minutes are a monthly allowance, so there is no "all time": it defaults to
  // the current month.
  const minutesMonth = pick(params.minutes) ?? months[0].key;

  // Closed at the route, like Live Events: notFound() for anyone who is
  // neither a superuser nor an organization admin.
  const me = await currentUser();
  if (!me) notFound();

  // A superuser reads every organization; an admin only their own.
  let organizationId: string | undefined;
  if (!hasRole(me.role, 'SUPERUSER')) {
    organizationId = (await fetchAgentsOrganizationId(me.id)) ?? undefined;
    if (!organizationId) notFound();
  }

  // Totals are computed over the whole list, fine at this size; push them into
  // aggregate queries if the call table grows past it.
  const [allCalls, orgCount, emails] = await Promise.all([
    fetchCalls({ organizationId }),
    fetchOrganizationCount(organizationId),
    fetchSentEmails(organizationId),
  ]);
  // Each card filters on its own month. Minutes are the organization's running
  // balance, not a per-month figure, so that card has no filter. The tiles
  // always cover all time.
  const inMonth = (month?: string) =>
    month
      ? allCalls.filter((c) => (c.startedAt ?? c.createdAt).slice(0, 7) === month)
      : allCalls;
  const calls = allCalls;
  const callsShown = inMonth(callsMonth);
  const costCalls = inMonth(costMonth);
  const timed = calls.filter((c) => c.durationMs != null);
  const avgSeconds = timed.length
    ? Math.round(timed.reduce((n, c) => n + (c.durationMs ?? 0), 0) / timed.length / 1000)
    : 0;
  const costCents = calls.reduce((n, c) => n + (c.costCents ?? 0), 0);
  const count = <T,>(key: (c: (typeof calls)[number]) => T) => {
    const m = new Map<T, number>();
    for (const c of callsShown) m.set(key(c), (m.get(key(c)) ?? 0) + 1);
    return m;
  };
  const byStatus = [...count((c) => c.status)].map(([name, value]) => ({
    name: capitalize(String(name).toLowerCase()),
    value,
  }));
  const costByAgent = new Map<string, number>();
  for (const c of costCalls) {
    const name = c.agent?.name ?? 'Unknown';
    costByAgent.set(name, (costByAgent.get(name) ?? 0) + (c.costCents ?? 0) / 100);
  }
  const costSlices = [...costByAgent]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  // Minutes used in the chosen month: the sum of that month's call durations,
  // against the monthly allowance of every organization in scope.
  const included = MONTHLY_MINUTES * orgCount;
  const usedMinutes = Math.round(
    inMonth(minutesMonth).reduce((n, c) => n + (c.durationMs ?? 0), 0) / 60000,
  );
  const used = Math.min(usedMinutes, included);
  const money = (n: number) => `$${n.toFixed(2)}`;

  // Calls per agent for each month of the range (oldest first), for the top
  // five agents by volume over that window.
  const chartMonths = [...months].reverse();
  const perAgent = new Map<string, Map<string, number>>();
  for (const c of allCalls) {
    const month = (c.startedAt ?? c.createdAt).slice(0, 7);
    if (!chartMonths.some((m) => m.key === month)) continue;
    const name = c.agent?.name ?? 'Unknown';
    const byMonth = perAgent.get(name) ?? new Map<string, number>();
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    perAgent.set(name, byMonth);
  }
  const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
  const topAgents = [...perAgent]
    .sort((a, b) => total(b[1]) - total(a[1]))
    .slice(0, 5);
  const agentNames = topAgents.map(([name]) => name);
  const agentMonthRows = chartMonths.map((m) => ({
    month: m.label,
    ...Object.fromEntries(topAgents.map(([, byMonth], i) => [`a${i}`, byMonth.get(m.key) ?? 0])),
  }));

  // Emails sent in each of the same months (oldest first), by type.
  const emailMonthRows = chartMonths.map((m) => {
    const inThisMonth = emails.filter((e) => e.sentAt.slice(0, 7) === m.key);
    return {
      month: m.label,
      total: inThisMonth.length,
      ...Object.fromEntries(
        EMAIL_TYPES.map((type, i) => [
          `t${i}`,
          inThisMonth.filter((e) => e.type === type).length,
        ]),
      ),
    };
  });

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className={`${lusitana.className} text-2xl`}>Analytics</h1>
        <RangeFilter
          ranges={RANGES}
          current={range}
          hrefs={RANGES.map((n) =>
            hrefWith(params, {
              range: n === DEFAULT_RANGE ? undefined : String(n),
            }),
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Total calls" value={calls.length} />
        <Tile
          label="Avg duration"
          value={`${Math.floor(avgSeconds / 60)}m ${avgSeconds % 60}s`}
        />
        <Tile label="Total cost" value={`$${(costCents / 100).toFixed(2)}`} />
        <Tile label="Agents active" value={new Set(calls.map((c) => c.agentId)).size} />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <Donut
          title="Total calls"
          description="By call status"
          slices={byStatus}
          center={callsShown.length.toLocaleString('en')}
          centerLabel="calls"
          filter={
            <MonthFilter name="calls" current={callsMonth} months={months} params={params} />
          }
        />
        <Donut
          title="Minutes"
          description="Used of the monthly allowance"
          slices={[
            { name: 'Used', value: used },
            { name: 'Remaining', value: included - used },
          ]}
          center={`${usedMinutes.toLocaleString('en')} / ${included.toLocaleString('en')}`}
          filter={
            <MonthFilter name="minutes" current={minutesMonth} months={months} params={params} allTime={false} />
          }
          centerLabel="minutes used"
          inlineLegend
        />
        <Donut
          title="Cost"
          description="By agent"
          slices={costSlices}
          center={money(costCalls.reduce((n, c) => n + (c.costCents ?? 0), 0) / 100)}
          centerLabel="total cost"
          filter={
            <MonthFilter name="cost" current={costMonth} months={months} params={params} />
          }
          currency
        />
      </div>

      <div className="mt-3">
        <AgentCallsBar
          title="Calls per agent"
          description={`${capitalize(period)}, top five agents`}
          agents={agentNames}
          data={agentMonthRows}
        />
      </div>

      {/* Half the width of the chart above: the other column is free. */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <EmailsBar
          title="Emails sent"
          description={`${capitalize(period)}, by type`}
          period={period}
          types={EMAIL_TYPES.map((t) => EMAIL_TYPE_LABELS[t])}
          data={emailMonthRows}
        />
      </div>
    </div>
  );
}
