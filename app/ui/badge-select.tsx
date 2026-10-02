'use client';

import { useRef, useTransition, type ReactNode } from 'react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { label } from '@/app/ui/organizations/status';
import { ToastAction } from '@/components/ui/toast';
import { toastError, toastSuccess } from '@/hooks/use-toast';

/** What a save returns: the server actions' `{ ok }` or `{ error }`. */
export type SaveResult = { error?: string } | undefined;

/**
 * A badge that opens into a picker. A <details> is the disclosure and the
 * blurred glass list is its panel — no overlay or state machine; the only
 * state is the pending transition. A successful pick fires the success toast
 * with an Undo, a refusal fires the error one.
 *
 * Shared by the organization status/plan pickers and the Team page's role
 * picker, so all three behave identically. The caller supplies what differs:
 * the badge to show, the options, the noun for the toasts and how to save.
 */
export default function BadgeSelect({
  value,
  options,
  noun,
  ariaLabel,
  badge,
  format = label,
  save,
}: {
  value: string;
  options: readonly string[];
  /** "Status", "Plan", "Role" — leads the toast titles. */
  noun: string;
  ariaLabel: string;
  /** The current value as a badge, shown on the closed picker. */
  badge: ReactNode;
  /** How an option reads in the list and the toasts; sentence case by default. */
  format?: (value: string) => string;
  save: (next: string) => Promise<SaveResult>;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: string) {
    if (details.current) details.current.open = false;
    if (next === value) return;

    startTransition(async () => {
      const result = await save(next);
      if (result && 'error' in result && result.error) {
        toastError(`${noun} not changed`, result.error);
      } else {
        toastSuccess(
          `${noun} updated`,
          `Now ${format(next)}.`,
          <ToastAction
            altText={`Undo ${noun.toLowerCase()} change`}
            onClick={() => undo(value)}
          >
            Undo
          </ToastAction>,
        );
      }
    });
  }

  // Puts back the value the pick replaced. Its own toast carries no Undo, so
  // undoing cannot turn into an endless back-and-forth.
  async function undo(previous: string) {
    const result = await save(previous);
    if (result && 'error' in result && result.error) {
      toastError('Could not undo', result.error);
    } else {
      toastSuccess(`${noun} restored`, `Back to ${format(previous)}.`);
    }
  }

  return (
    <details
      ref={details}
      className="group/select relative"
      // Closes when focus leaves the whole widget, so clicking elsewhere
      // dismisses it the way a native <select> would.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false;
      }}
    >
      <summary
        aria-label={ariaLabel}
        aria-busy={pending}
        className={clsx(
          'group/trigger flex cursor-pointer list-none items-center gap-1.5 rounded-full transition-opacity [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400',
          pending && 'opacity-60',
        )}
      >
        {badge}
        {/* Lights up on hover the way the sidebar links and the back arrow do:
            brand red with a soft glow. Hovering the open list doesn't count —
            only the trigger — hence group/trigger rather than group/select. */}
        <ChevronDownIcon className="h-4 w-4 text-gray-500 transition-[color,filter,transform] duration-200 group-hover/trigger:text-brand-red-lit group-hover/trigger:[filter:drop-shadow(0_0_6px_rgba(255,46,67,0.7))] group-focus-visible/trigger:text-brand-red-lit group-open/select:rotate-180" />
      </summary>

      {/* In the last row of a table the list opens upward: below it there is
          nothing to scroll into, so the list would be cut off by the table's
          edge. */}
      <ul
        role="listbox"
        className="absolute right-0 z-20 mt-2 max-h-56 [tr:last-child_&]:bottom-full [tr:last-child_&]:mb-2 [tr:last-child_&]:mt-0 w-44 overflow-y-auto rounded-lg border border-white/[0.07] bg-white/[0.05] p-1 shadow-xl backdrop-blur-xl"
      >
        {options.map((option) => (
          <li key={option} role="option" aria-selected={option === value}>
            <button
              type="button"
              disabled={pending}
              onClick={() => choose(option)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-600 transition-colors hover:text-brand-red-lit focus-visible:text-brand-red-lit focus-visible:outline-none"
            >
              {format(option)}
              {option === value && <CheckIcon className="h-4 w-4" />}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
