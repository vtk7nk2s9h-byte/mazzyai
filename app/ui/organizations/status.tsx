import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  MinusIcon,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';

const pill =
  'inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-xs';

// One tone per meaning, each with its own border, so every badge in the app is
// outlined the same way and none reads as the odd one out.
const tone = {
  neutral: 'border-white/[0.12] bg-gray-100 text-gray-500',
  faded: 'border-white/[0.12] bg-gray-100 text-gray-400',
  good: 'border-green-400/50 bg-green-500/15 text-green-400',
  warn: 'border-amber-400/50 bg-amber-500/15 text-amber-300',
  bad: 'border-red-400/50 bg-red-500/15 text-red-400',
  brand: 'border-maroon-300/70 bg-maroon-500/10 text-maroon-200',
};

/** Sentence case for an enum member: PAST_DUE -> Past due. */
export function label(value: string) {
  const words = value.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** TRIAL / ACTIVE / PAST_DUE / SUSPENDED. */
export function OrgStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(pill, {
        [tone.neutral]: status === 'TRIAL',
        [tone.good]: status === 'ACTIVE',
        [tone.warn]: status === 'PAST_DUE',
        [tone.bad]: status === 'SUSPENDED',
      })}
    >
      {label(status)}
    </span>
  );
}

/** FREE / STARTER / PRO / ENTERPRISE — an outline, so it reads under the status. */
export function PlanBadge({ plan }: { plan: string }) {
  return (
    <span
      className={clsx(pill, {
        'border-white/[0.12] text-gray-500': plan === 'FREE',
        'border-white/[0.12] text-gray-600': plan === 'STARTER',
        [tone.brand]: plan === 'PRO',
        'border-brand-red-lit/60 text-brand-red-lit': plan === 'ENTERPRISE',
      })}
    >
      {label(plan)}
    </span>
  );
}

/** The language as its short code (EN / AR / NL); an unlisted locale shows as is. */
export function LanguageBadge({ language }: { language: string }) {
  return <span className={clsx(pill, tone.neutral)}>{language}</span>;
}

/**
 * DRAFT / OPEN / PAID / UNCOLLECTIBLE / VOID — the contract's InvoiceStatus,
 * not the Learn schema's paid/pending behind /dashboard/invoices.
 */
export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(pill, {
        [tone.neutral]: status === 'DRAFT',
        [tone.warn]: status === 'OPEN',
        [tone.good]: status === 'PAID',
        [tone.bad]: status === 'UNCOLLECTIBLE',
        [tone.faded]: status === 'VOID',
      })}
    >
      {label(status)}
    </span>
  );
}

/** Whether a follow-up email went out: green when sent, grey when not. */
export function EmailSentBadge({ sent }: { sent: boolean }) {
  return (
    <span className={clsx(pill, sent ? tone.good : tone.neutral)}>
      {sent ? 'Sent' : 'Not sent'}
    </span>
  );
}

/** IDLE / READY / ACTIVE / PAUSED / DISACTIVATED. */
export function AgentStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(pill, {
        [tone.neutral]: status === 'IDLE',
        [tone.brand]: status === 'READY',
        [tone.good]: status === 'ACTIVE',
        [tone.warn]: status === 'PAUSED',
        [tone.bad]: status === 'DISACTIVATED',
      })}
    >
      {label(status)}
    </span>
  );
}

/**
 * A glowing dot for an agent's status, same look as the Enabled/Disabled dot:
 * green when active, yellow when paused, red when disactivated. Other statuses
 * (idle, ready) show a dim dot, so the column of dots stays aligned.
 */
export function AgentStatusDot({ status }: { status: string }) {
  return (
    <span
      role="img"
      aria-label={label(status)}
      title={label(status)}
      className={clsx('inline-block h-1.5 w-1.5 shrink-0 rounded-full', {
        'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] motion-safe:animate-pulse':
          status === 'ACTIVE',
        'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] motion-safe:animate-pulse':
          status === 'PAUSED',
        'bg-brand-red-lit shadow-[0_0_8px_rgba(255,46,67,0.8)] motion-safe:animate-pulse':
          status === 'DISACTIVATED',
        'bg-gray-400/60': !['ACTIVE', 'PAUSED', 'DISACTIVATED'].includes(status),
      })}
    />
  );
}

/** Which agent an asset applies to: a brand badge for one, neutral for all. */
export function AssignmentBadge({ name }: { name: string | null }) {
  return (
    <span className={clsx(pill, name ? tone.brand : tone.neutral)}>
      {name ?? 'All agents'}
    </span>
  );
}

/** SCHEDULED / COMPLETED / CANCELLED — same ladder the calendar events use. */
export function MeetingStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(pill, {
        [tone.brand]: status === 'SCHEDULED',
        [tone.neutral]: status === 'COMPLETED',
        [tone.bad]: status === 'CANCELLED',
      })}
    >
      {label(status)}
    </span>
  );
}

/** USER / ADMIN / SUPERUSER — the contract's SystemRole. */
export function UserRoleBadge({ role }: { role: string }) {
  return (
    <span
      className={clsx(pill, {
        [tone.neutral]: role === 'USER',
        [tone.warn]: role === 'ADMIN',
        [tone.brand]: role === 'SUPERUSER',
      })}
    >
      {label(role)}
    </span>
  );
}

/** ACTIVE / DISABLED. */
export function UserStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(pill, {
        [tone.good]: status === 'ACTIVE',
        [tone.faded]: status === 'DISABLED',
      })}
    >
      {label(status)}
    </span>
  );
}

/**
 * POSITIVE / NEUTRAL / NEGATIVE / UNKNOWN — how a call went, or how a run of
 * them went overall. Same ladder as the call log's SentimentDot; UNKNOWN is
 * faded because it means ungraded, not neutral.
 */
export function SentimentBadge({ sentiment }: { sentiment: string }) {
  return (
    <span
      className={clsx(pill, {
        [tone.good]: sentiment === 'POSITIVE',
        [tone.neutral]: sentiment === 'NEUTRAL',
        [tone.bad]: sentiment === 'NEGATIVE',
        [tone.faded]: sentiment === 'UNKNOWN',
      })}
    >
      {sentiment === 'UNKNOWN' ? 'Ungraded' : label(sentiment)}
    </span>
  );
}

/**
 * A move against the period before it: a leaning arrow and the change, green
 * when it's up, red when it's down, neutral when it hasn't moved. `change`
 * comes in already formatted ("+12%", "-8%", "+3", "0") — what divides by what
 * is the caller's business, not the badge's.
 *
 * The only badge here carrying an icon, hence the gap.
 */
export function TrendBadge({
  direction,
  change,
  description,
}: {
  direction: 'up' | 'down' | 'flat';
  change: string;
  /** Read after the change by a screen reader, e.g. "against last month". */
  description?: string;
}) {
  const Icon =
    direction === 'up'
      ? ArrowUpRightIcon
      : direction === 'down'
        ? ArrowDownRightIcon
        : MinusIcon;
  return (
    <span
      className={clsx(pill, 'gap-1', {
        [tone.good]: direction === 'up',
        [tone.bad]: direction === 'down',
        [tone.neutral]: direction === 'flat',
      })}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {change}
      {description ? <span className="sr-only"> {description}</span> : null}
    </span>
  );
}

/** How many calls an agent has taken, in the brand tone: a figure, not a verdict. */
export function CallCountBadge({ calls }: { calls: number }) {
  return (
    <span className={clsx(pill, tone.brand)}>
      {calls.toLocaleString('en')} {calls === 1 ? 'call' : 'calls'}
    </span>
  );
}

/**
 * Whether a knowledge base can be relied on: red as soon as any document has
 * failed, amber while some are still being indexed, green when everything is
 * indexed, neutral when there is nothing in it yet. Failure wins over
 * progress, since that is the one that needs somebody.
 */
export function KnowledgeHealthBadge({
  indexed,
  failed,
  inProgress,
}: {
  indexed: number;
  failed: number;
  inProgress: number;
}) {
  const [text, badgeTone] =
    failed > 0
      ? [`${failed.toLocaleString('en')} failed`, tone.bad]
      : inProgress > 0
        ? [`${inProgress.toLocaleString('en')} indexing`, tone.warn]
        : indexed > 0
          ? ['Healthy', tone.good]
          : ['Empty', tone.faded];
  return <span className={clsx(pill, badgeTone)}>{text}</span>;
}

/** Whether an agent is linked to its Retell voice agent (retellAgentId set). */
export function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span className={clsx(pill, connected ? tone.good : tone.faded)}>
      {connected ? 'Connected' : 'Not connected'}
    </span>
  );
}
