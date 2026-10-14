import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  CpuChipIcon,
  GlobeAltIcon,
  PhoneArrowDownLeftIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

import { fetchOverviewStats } from '@/app/lib/org-data';
import { lusitana } from '@/app/ui/fonts';
import {
  CallCountBadge,
  KnowledgeHealthBadge,
  SentimentBadge,
  TrendBadge,
} from '@/app/ui/organizations/status';
import ArrowIcon from '@/components/ui/arrow-icon';

const iconMap = {
  contacts: UsersIcon,
  meetings: CalendarDaysIcon,
};

/** The glass every card on this row is cut from: one surface, one edge. */
const glass =
  'rounded-xl border border-white/[0.12] bg-gradient-to-br from-white/[0.10] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_30px_-12px_rgba(0,0,0,0.6)]';

/** The sunken well a card's number sits in — the same glass, a stop darker. */
const well =
  'rounded-lg border border-white/[0.07] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

/**
 * A card, twice the height it was. The height is on the shell, and the well
 * inside it is sized by its own content and pushed down with mt-auto — so the
 * four cards stay level while each inner border still hugs what it holds.
 */
const shell = `${glass} relative flex min-h-[17.5rem] flex-col overflow-hidden p-2 backdrop-blur-xl`;

/**
 * The same card for the ones that hold a detail bubble. It can't blur its own
 * backdrop: an element with a backdrop-filter becomes a backdrop root, and a
 * bubble inside it then blurs nothing beneath itself (the numbers show through
 * sharp). So the blur moves onto a layer inside the card (see LinkCard) and
 * the card is only `isolate`d, which keeps that layer behind its content
 * without making it a root.
 */
const detailShell = `${glass} relative isolate flex min-h-[17.5rem] flex-col overflow-hidden p-2`;

/** The dashboard home's stat row: one organization, or all of them. */
export default async function CardWrapper({
  organizationId,
  canOpenAgents = false,
}: {
  organizationId?: string;
  /** Whether the reader may open the Agents page; the card only links if so. */
  canOpenAgents?: boolean;
}) {
  const {
    totalCalls,
    answeredCalls,
    missedCalls,
    sentiment,
    sentimentCalls,
    callsThisMonth,
    callsLastMonth,
    agents,
    activeAgents,
    busiestAgent,
    knowledge,
    callTypes,
    contacts,
    upcomingMeetings,
  } = await fetchOverviewStats(organizationId);

  return (
    <>
      <CallsCard
        total={totalCalls}
        answered={answeredCalls}
        missed={missedCalls}
        sentiment={sentiment}
        sentimentCalls={sentimentCalls}
        callTypes={callTypes}
        thisMonth={callsThisMonth}
        lastMonth={callsLastMonth}
      />
      <AgentsCard
        total={agents}
        active={activeAgents}
        busiest={busiestAgent}
        knowledge={knowledge}
        href={canOpenAgents ? '/dashboard/agents' : undefined}
      />
      <Card title="Contacts" value={contacts} type="contacts" />
      <Card title="Upcoming meetings" value={upcomingMeetings} type="meetings" />
    </>
  );
}

/**
 * Where this month's calls stand against last month's. A percentage needs
 * something to divide by, so a month that follows an empty one reports the
 * calls themselves instead — "+12", not an infinite climb.
 */
function monthOverMonth(thisMonth: number, lastMonth: number) {
  const delta = thisMonth - lastMonth;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  if (lastMonth === 0) {
    return {
      direction,
      label: delta > 0 ? `+${delta.toLocaleString('en')}` : '0',
    } as const;
  }
  const percent = Math.round((delta / lastMonth) * 100);
  return {
    direction,
    label: `${percent > 0 ? '+' : ''}${percent}%`,
  } as const;
}

/**
 * The call log's caller-name arrow, for a box's own details: a small chevron
 * that reveals a glass bubble on hover or keyboard focus, in the same style.
 * CSS-only, so the cards stay server-rendered.
 *
 * The bubble is placed against the box the arrow sits in (give that box
 * `relative`), not against the arrow, so it spans the box and never pokes out
 * past the card's edge, which clips. Lightly blurred and barely filled, so
 * what is behind it still shows through a little; the call log's is frosted
 * far harder because a table row behind it is quieter than a card's numbers.
 * `above` flips it over the box for one at
 * the bottom of its card. Named group/peer (`tip`), because the card is a
 * `group` itself and an unnamed one would light every bubble on card hover.
 */
function DetailArrow({
  label,
  above = false,
  children,
}: {
  /** What the button announces, e.g. "Show sentiment details". */
  label: string;
  above?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="group/tip inline-flex">
      <button
        type="button"
        aria-label={label}
        // z-10 lifts it over the card's stretched link, so a click on it lands
        // here and goes nowhere instead of following the link. The details
        // are a hover, not an action, so the cursor stays an arrow rather
        // than the pointer a button gets by default.
        className="peer/tip relative z-10 inline-flex cursor-default rounded text-gray-400 transition-colors hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400 group-hover/tip:text-brand-red-lit"
      >
        <ChevronDownIcon className="w-3.5" />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none invisible absolute inset-x-0 z-30 whitespace-normal rounded-lg border border-maroon-400/50 bg-[#140a0d]/60 p-3 text-xs font-medium leading-relaxed text-gray-700 opacity-0 shadow-[0_0_0_1px_rgba(255,46,67,0.08),0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-[3px] transition-opacity duration-150 group-hover/tip:visible group-hover/tip:opacity-100 peer-focus-visible/tip:visible peer-focus-visible/tip:opacity-100 motion-reduce:transition-none ${
          above ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        }`}
      >
        {children}
      </span>
    </span>
  );
}

/** A count behind a status light: green for the good side, red for the bad. */
function Tally({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  /** A mark ahead of the dot; the call types borrow the call log's own. */
  icon?: typeof CpuChipIcon;
  /** `off` is a dim, unlit dot - a thing that exists but isn't running. */
  tone: 'good' | 'bad' | 'off';
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
      {Icon ? <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          tone === 'good'
            ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]'
            : tone === 'bad'
              ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]'
              : 'bg-gray-400/60'
        }`}
      />
      <span className="truncate">{label}</span>
      {/* Pushed to the right edge, so the two stacked counts line up under
          each other rather than following their labels. */}
      <span className="ml-auto font-medium text-gray-700">
        {value.toLocaleString('en')}
      </span>
    </div>
  );
}

/**
 * What the lead cards share: the glass, the sheen, and a header of icon and
 * label. With an `href` the whole card is the way through - it lifts under the
 * pointer, its edge takes the brand red and spills a glow of it, and the icon
 * and the corner arrow light up with it, the same handover the sidebar links
 * make.
 *
 * Without one it is the same card, still: no lift, no arrow, no red. That is
 * for a page the reader can't open - a link to a 404 is worse than none.
 */
function LinkCard({
  href,
  title,
  label,
  icon: Icon,
  children,
}: {
  href?: string;
  /** The link's hover text. */
  title: string;
  /** The header's text. */
  label: string;
  /** The sidebar's own icon for the page this leads to, so the two match. */
  icon: typeof CpuChipIcon;
  children: React.ReactNode;
}) {
  const body = (
    <>
      {/* The card's frosting, as a layer of its own rather than on the card:
          see detailShell. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] backdrop-blur-xl"
      />
      {/* Specular sheen across the top edge - what sells the surface as glass
          rather than a flat translucent fill. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      {href ? (
        // The app's own long-shafted arrow, bare and turned to point out of
        // the corner it sits in. Hover takes it red with a glow, like a
        // sidebar link, and nudges it that way.
        <ArrowIcon
          size={18}
          className="pointer-events-none absolute right-4 top-4 -rotate-45 text-gray-600 transition-[color,filter,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))] group-has-[a:focus-visible]:text-brand-red-lit motion-reduce:transition-none"
        />
      ) : null}
      <div className="flex items-center gap-2 p-4 pb-3 pr-10">
        {/* Grey until the pointer takes it red and lights it, like a sidebar
            link's icon. The label stays put; the icon is what lights up. */}
        <Icon className="h-5 w-5 shrink-0 text-gray-500 transition-[color,filter] duration-300 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_12px_rgba(255,46,67,0.75))] group-has-[a:focus-visible]:text-brand-red-lit group-has-[a:focus-visible]:[filter:drop-shadow(0_0_12px_rgba(255,46,67,0.75))] motion-reduce:transition-none" />
        <h3 className="truncate text-sm font-medium">{label}</h3>
      </div>
      {children}
    </>
  );

  if (!href) return <div className={detailShell}>{body}</div>;
  return (
    // The link is stretched over the card rather than wrapped around it: a
    // card that holds buttons (the detail arrows) can't also be an <a>, since
    // an anchor may not contain interactive content. Everything else is
    // under the link, so a click anywhere but a button follows it.
    <div
      className={`${detailShell} group transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-brand-red-lit/50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_40px_-14px_rgba(0,0,0,0.7),0_0_26px_-6px_rgba(255,46,67,0.45)] has-[a:focus-visible]:border-brand-red-lit/50 motion-reduce:transition-none`}
    >
      {body}
      {/* After the content, on purpose: among positioned elements the later
          one paints on top, and the boxes above are `relative`. Before them,
          the link would sit underneath and a click on a box would never reach
          it. The buttons and bubbles carry z-index, so they still win. */}
      <Link
        href={href}
        title={title}
        // Inset, because the card clips its own overflow and an outside ring
        // would be cut off.
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-red-lit"
      >
        <span className="sr-only">{title}</span>
      </Link>
    </div>
  );
}

/**
 * The row's lead card: how the calls split between answered and missed, the
 * running total under them, and the month-over-month move beside it. Green up
 * / red down are semantic signals rather than brand paint, so they stay red
 * and green against the maroon glass (see the status colours in global.css).
 */
function CallsCard({
  total,
  answered,
  missed,
  sentiment,
  sentimentCalls,
  callTypes,
  thisMonth,
  lastMonth,
}: {
  total: number;
  answered: number;
  missed: number;
  /** The verdict most of the graded calls came out as. */
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'UNKNOWN';
  /** The split behind it, for the box's hover text. */
  sentimentCalls: { positive: number; neutral: number; negative: number };
  /** Calls per type, and whether the type took a call in the last 30 days. */
  callTypes: Record<
    'inbound' | 'outbound' | 'web',
    { calls: number; active: boolean }
  >;
  thisMonth: number;
  lastMonth: number;
}) {
  const { direction, label } = monthOverMonth(thisMonth, lastMonth);

  return (
    <LinkCard
      href="/dashboard/call-logs"
      title="Call logs"
      label="Calls"
      icon={PhoneArrowDownLeftIcon}
    >
      {/* Which kinds of call the line takes. A lit dot is a type that took a
          call in the last 30 days; a dim one hasn't, so an organization that
          only wants inbound shows the other two off. The count beside it is
          every call of that type. mt-auto on this first box, so the three
          sit on the bottom of the card together. */}
      <div
        className={`${well} mt-3 flex flex-col gap-1.5 px-4 py-4`}
        title="A lit dot means the type took a call in the last 30 days"
      >
        <Tally
          label="Inbound"
          icon={ArrowDownLeftIcon}
          value={callTypes.inbound.calls}
          tone={callTypes.inbound.active ? 'good' : 'off'}
        />
        <Tally
          label="Outbound"
          icon={ArrowUpRightIcon}
          value={callTypes.outbound.calls}
          tone={callTypes.outbound.active ? 'good' : 'off'}
        />
        <Tally
          label="Web"
          icon={GlobeAltIcon}
          value={callTypes.web.calls}
          tone={callTypes.web.active ? 'good' : 'off'}
        />
      </div>
      {/* How the calls went rather than how many, the verdict carried by a
          badge from the app's own set. */}
      <div
        className={`${well} relative mt-2 flex items-center justify-between gap-3 px-4 py-4`}
      >
        <p className={`${lusitana.className} min-w-0 text-base leading-tight`}>
          Overall sentiment
        </p>
        <div className="flex items-center gap-1.5">
          <SentimentBadge sentiment={sentiment} />
          <DetailArrow label="Show sentiment details">
            {sentimentCalls.positive.toLocaleString('en')} positive,{' '}
            {sentimentCalls.neutral.toLocaleString('en')} neutral and{' '}
            {sentimentCalls.negative.toLocaleString('en')} negative. The verdict
            is whichever the most graded calls came out as; calls Retell
            hasn&apos;t graded yet don&apos;t count.
          </DetailArrow>
        </div>
      </div>
      <div className={`${well} relative mt-2 flex flex-col gap-3 px-4 py-4`}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <p
              className={`${lusitana.className} truncate text-4xl leading-none`}
            >
              {total.toLocaleString('en')}
            </p>
            <span className="truncate text-xs text-gray-500">Total calls</span>
          </div>
          <div className="flex items-center gap-1.5 self-center">
            <TrendBadge
              direction={direction}
              change={label}
              description="against last month"
            />
            <DetailArrow label="Show month-over-month details" above>
              {thisMonth.toLocaleString('en')} calls this month against{' '}
              {lastMonth.toLocaleString('en')} last month. Months are counted
              by calendar month, UTC.
            </DetailArrow>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Tally label="Answered Calls" value={answered} tone="good" />
          <Tally label="Missed Calls" value={missed} tone="bad" />
        </div>
      </div>
    </LinkCard>
  );
}

/**
 * How many agents there are and how many of them are live. "Active" is an
 * agent whose status is ACTIVE; everything else - idle, ready, paused,
 * disactivated - is inactive, so the two always add up to the total.
 */
function AgentsCard({
  total,
  active,
  busiest,
  knowledge,
  href,
}: {
  total: number;
  active: number;
  /** The agent with the most calls; null while no agent has taken one. */
  busiest: { name: string; calls: number } | null;
  /** Knowledge documents by where they stand. */
  knowledge: { indexed: number; failed: number; inProgress: number };
  /** Absent when the reader can't open the Agents page. */
  href?: string;
}) {
  return (
    <LinkCard href={href} title="Agents" label="Agents" icon={CpuChipIcon}>
      {/* Who carries the load: their calls in a badge up beside the label, so
          the name below keeps the whole width of the box. mt-auto on this
          first box, so the three sit on the bottom of the card together. */}
      <div className={`${well} mt-3 flex flex-col gap-1.5 px-4 py-4`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Busiest agent</p>
          {busiest ? <CallCountBadge calls={busiest.calls} /> : null}
        </div>
        <p
          className={`${lusitana.className} truncate text-base leading-tight`}
          title={busiest?.name}
        >
          {busiest?.name ?? 'No calls yet'}
        </p>
      </div>
      {/* Whether what the agents know can be relied on. The badge carries the
          verdict; the split behind it is the hover text. */}
      <div
        className={`${well} relative mt-2 flex items-center justify-between gap-3 px-4 py-4`}
      >
        <p className={`${lusitana.className} min-w-0 text-base leading-tight`}>
          Knowledge base
        </p>
        <div className="flex items-center gap-1.5">
          <KnowledgeHealthBadge {...knowledge} />
          <DetailArrow label="Show knowledge base details">
            {knowledge.indexed.toLocaleString('en')} indexed,{' '}
            {knowledge.inProgress.toLocaleString('en')} in progress and{' '}
            {knowledge.failed.toLocaleString('en')} failed. Only indexed
            documents are available to the agents.
          </DetailArrow>
        </div>
      </div>
      <div className={`${well} mt-2 flex flex-col gap-3 px-4 py-4`}>
        <div className="flex min-w-0 items-baseline gap-2">
          <p className={`${lusitana.className} truncate text-4xl leading-none`}>
            {total.toLocaleString('en')}
          </p>
          <span className="truncate text-xs text-gray-500">Total agents</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Tally label="Active Agents" value={active} tone="good" />
          <Tally label="Inactive Agents" value={total - active} tone="bad" />
        </div>
      </div>
    </LinkCard>
  );
}

export function Card({
  title,
  value,
  type,
}: {
  title: string;
  value: number | string;
  type: keyof typeof iconMap;
}) {
  const Icon = iconMap[type];

  return (
    <div className={shell}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      <div className="flex items-center p-4 pb-3">
        {Icon ? <Icon className="h-5 w-5 shrink-0 text-gray-500" /> : null}
        <h3 className="ml-2 truncate text-sm font-medium">{title}</h3>
      </div>
      <div
        className={`${well} mt-auto flex items-center justify-center px-4 py-5`}
      >
        <p className={`${lusitana.className} truncate text-2xl leading-none`}>
          {value}
        </p>
      </div>
    </div>
  );
}
