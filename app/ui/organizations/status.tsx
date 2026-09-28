import clsx from 'clsx';

const pill = 'inline-flex shrink-0 items-center rounded-full px-2 py-1 text-xs';

/** Sentence case for an enum member: PAST_DUE -> Past due. */
function label(value: string) {
  const words = value.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** TRIAL / ACTIVE / PAST_DUE / SUSPENDED / CHURNED. */
export function OrgStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(pill, {
        'bg-gray-100 text-gray-500': status === 'TRIAL',
        'bg-green-500 text-white': status === 'ACTIVE',
        'bg-amber-500/15 text-amber-300': status === 'PAST_DUE',
        'bg-red-500/15 text-red-400': status === 'SUSPENDED',
        'bg-gray-100 text-gray-400': status === 'CHURNED',
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
      className={clsx(pill, 'border', {
        'border-white/[0.12] text-gray-500': plan === 'FREE',
        'border-white/[0.12] text-gray-600': plan === 'STARTER',
        'border-maroon-400/50 text-maroon-300': plan === 'PRO',
        'border-brand-red-lit/60 text-brand-red-lit': plan === 'ENTERPRISE',
      })}
    >
      {label(plan)}
    </span>
  );
}

/**
 * DRAFT / OPEN / PAID / UNCOLLECTIBLE / VOID — the contract's InvoiceStatus,
 * not the Learn schema's paid/pending behind /dashboard/invoices.
 */
export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(pill, {
        'bg-gray-100 text-gray-500': status === 'DRAFT',
        'bg-amber-500/15 text-amber-300': status === 'OPEN',
        'bg-green-500 text-white': status === 'PAID',
        'bg-red-500/15 text-red-400': status === 'UNCOLLECTIBLE',
        'bg-gray-100 text-gray-400': status === 'VOID',
      })}
    >
      {label(status)}
    </span>
  );
}

/** DRAFT / PUBLISHED / PAUSED / ARCHIVED. */
export function AgentStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(pill, {
        'bg-gray-100 text-gray-500': status === 'DRAFT',
        'bg-green-500 text-white': status === 'PUBLISHED',
        'bg-amber-500/15 text-amber-300': status === 'PAUSED',
        'bg-gray-100 text-gray-400': status === 'ARCHIVED',
      })}
    >
      {label(status)}
    </span>
  );
}
