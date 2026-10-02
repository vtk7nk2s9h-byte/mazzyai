'use client';

import { useRef, useState, useTransition } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

import { updateOrgSettings } from '@/app/lib/org-actions';
import { Switch } from '@/components/ui/switch';
import { toastError, toastSuccess } from '@/hooks/use-toast';

const input =
  'block w-full rounded-md border border-gray-200 bg-transparent px-3 py-[9px] text-sm outline-2 placeholder:text-gray-500';
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-900';
const hint = 'mt-1.5 text-[11px] leading-relaxed text-gray-500';

const toDollars = (cents: number | null) =>
  cents === null ? '' : (cents / 100).toFixed(2);

/**
 * A pencil in the Call handling card's header, opening a <dialog> for the three
 * settings that can be changed: whether calls are recorded, how long Retell
 * keeps the data, and the daily budget. Recording and retention are pushed to
 * the organization's Retell agents on save; the budget stays in this app.
 */
export default function CallHandlingEdit({
  orgId,
  slug,
  orgName,
  current,
}: {
  orgId: string;
  slug: string;
  orgName: string;
  current: {
    recordCalls: boolean;
    dataRetentionDays: number;
    dailyBudgetCents: number | null;
  };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [recordCalls, setRecordCalls] = useState(current.recordCalls);
  const [retention, setRetention] = useState(String(current.dataRetentionDays));
  const [budget, setBudget] = useState(toDollars(current.dailyBudgetCents));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Empty budget = uncapped. Anything else is dollars, kept as whole cents.
  const budgetCents = budget.trim() === '' ? null : Math.round(Number(budget) * 100);
  const retentionDays = Number(retention);

  const unchanged =
    recordCalls === current.recordCalls &&
    retentionDays === current.dataRetentionDays &&
    budgetCents === current.dailyBudgetCents;

  function open() {
    setRecordCalls(current.recordCalls);
    setRetention(String(current.dataRetentionDays));
    setBudget(toDollars(current.dailyBudgetCents));
    setError(null);
    dialog.current?.showModal();
  }

  function save() {
    if (budgetCents !== null && !Number.isFinite(budgetCents)) {
      setError('Please enter the budget as a number.');
      return;
    }
    startTransition(async () => {
      const result = await updateOrgSettings(orgId, slug, {
        recordCalls,
        dataRetentionDays: retentionDays,
        dailyBudgetCents: budgetCents,
      });
      if ('error' in result && result.error) {
        setError(result.error);
        toastError('Settings not saved', result.error);
        return;
      }
      dialog.current?.close();
      const sync = 'sync' in result ? result.sync : null;
      if (sync === null || (sync && sync.failed > 0)) {
        // The database has the new values; Retell may not.
        toastError(
          'Saved, but Retell was not fully updated',
          sync
            ? `${sync.failed} of ${sync.total} agents did not accept the change. Saving again retries them.`
            : 'Could not reach Retell. Saving again retries it.',
        );
      } else {
        toastSuccess('Settings saved', `${orgName} is up to date.`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Edit call handling settings for ${orgName}`}
        className="group inline-flex rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <PencilSquareIcon className="h-4 w-4 text-gray-500 transition-[color,filter] duration-200 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))] group-focus-visible:text-brand-red-lit" />
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="max-h-[92vh] w-[min(92vw,28rem)] overflow-y-auto rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-5 p-5"
        >
          <div>
            <h3 className="text-base font-semibold">Call handling</h3>
            <p className="mt-1 text-xs text-gray-500">
              {orgName} — applies to every agent in this organization.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor={`record-${orgId}`} className="text-xs font-medium text-gray-900">
                Record calls
              </label>
              <Switch
                id={`record-${orgId}`}
                checked={recordCalls}
                onCheckedChange={setRecordCalls}
              />
            </div>
            <p className={hint}>
              Sent to Retell. Retell has no recording-only switch, so turning
              this off also stops it keeping transcripts and call logs.
            </p>
          </div>

          <div>
            <label htmlFor={`retention-${orgId}`} className={labelClass}>
              Data retention (days)
            </label>
            <input
              id={`retention-${orgId}`}
              type="number"
              required
              min={1}
              max={730}
              step={1}
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              className={input}
            />
            <p className={hint}>
              Sent to Retell. How long it keeps call data before deleting it,
              from 1 to 730 days.
            </p>
          </div>

          <div>
            <label htmlFor={`budget-${orgId}`} className={labelClass}>
              Daily budget (USD)
            </label>
            <input
              id={`budget-${orgId}`}
              type="number"
              min={0.01}
              step={0.01}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Uncapped"
              className={input}
            />
            <p className={hint}>
              The most this organization may spend in a day. Leave it empty for
              no limit. Once reached, the service shows as paused until midnight
              in the organization&rsquo;s timezone or until the budget is
              raised. Retell itself is not touched.
            </p>
          </div>

          <p aria-live="polite" className="min-h-4 text-xs text-red-400">
            {error}
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:text-brand-red-lit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || unchanged}
              className="rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
