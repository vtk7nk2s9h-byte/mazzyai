'use client';

import { useTransition } from 'react';

import { changePlan, setCancelAtPeriodEnd } from '@/app/lib/billing-actions';
import type { SubscriptionRow } from '@/app/lib/billing-data';
import BadgeSelect from '@/app/ui/badge-select';
import { label, PlanBadge } from '@/app/ui/organizations/status';
import { ORG_PLANS } from '@/app/lib/utils';
import { toastError, toastSuccess } from '@/hooks/use-toast';

// Green is live, yellow is at risk or not yet billing, red is not running.
const dot: Record<string, string> = {
  ACTIVE: 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.7)]',
  TRIALING: 'bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.6)]',
  PAST_DUE: 'bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.6)]',
  CANCELED: 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.7)]',
  UNPAID: 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.7)]',
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });

/**
 * The subscription, read-mostly: the plan is a picker (included minutes and
 * the overage rate follow it) and cancellation is a toggle at period end.
 * Status and the billing dates are shown but not editable.
 */
export default function Subscription({
  organizationId,
  subscription: s,
}: {
  organizationId: string;
  subscription: SubscriptionRow;
}) {
  const [pending, startTransition] = useTransition();

  function toggleCancel() {
    const cancel = !s.cancelAtPeriodEnd;
    startTransition(async () => {
      const result = await setCancelAtPeriodEnd(organizationId, cancel);
      if ('error' in result) toastError('Subscription not updated', result.error);
      else if (cancel) toastSuccess('Cancellation scheduled', `Ends on ${day(s.currentPeriodEnd)}.`);
      else toastSuccess('Cancellation removed', 'The subscription will renew.');
    });
  }

  return (
    <div className="overflow-x-auto md:overflow-visible">
      <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
      <table className="min-w-full text-gray-900">
        <thead className="rounded-lg text-left text-sm font-normal">
          <tr>
            <th scope="col" className="py-5 pl-6 pr-3 font-medium">Plan</th>
            <th scope="col" className="px-3 py-5 font-medium">Status</th>
            <th scope="col" className="px-3 py-5 font-medium">Included minutes</th>
            <th scope="col" className="px-3 py-5 font-medium">Overage</th>
          </tr>
        </thead>
        <tbody className="bg-gray-100">
          <tr className="w-full text-sm [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg">
            <td className="whitespace-nowrap py-3 pl-6 pr-3">
              <BadgeSelect
                value={s.plan}
                options={ORG_PLANS}
                noun="Plan"
                ariaLabel="Change plan"
                openUp
                badge={<PlanBadge plan={s.plan} />}
                save={async (next) => {
                  const result = await changePlan(organizationId, next);
                  return 'error' in result ? { error: result.error } : undefined;
                }}
              />
            </td>
            <td className="whitespace-nowrap px-3 py-3">
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${dot[s.status] ?? 'bg-gray-400'}`}
                />
                {label(s.status)}
              </span>
            </td>
            <td className="whitespace-nowrap px-3 py-3">{s.minutesIncluded.toLocaleString('en')} / month</td>
            <td className="whitespace-nowrap px-3 py-3">
              {s.overageRateCentsPerMinute
                ? `$${(s.overageRateCentsPerMinute / 100).toFixed(2)} / min`
                : 'None'}
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-gray-600">
          Current period {day(s.currentPeriodStart)} – {day(s.currentPeriodEnd)}
          {s.cancelAtPeriodEnd && (
            <span className="ml-2 text-amber-300">Cancels at period end</span>
          )}
        </p>
        <button
          type="button"
          onClick={toggleCancel}
          disabled={pending}
          className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-red-lit/50 hover:text-brand-red-lit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60"
        >
          {s.cancelAtPeriodEnd ? 'Keep subscription' : 'Cancel at period end'}
        </button>
      </div>
    </div>
  );
}
