'use client';

import { useRef } from 'react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

import { label } from '@/app/ui/organizations/status';

/** The same field look the dialog forms use, so the trigger matches them. */
const field =
  'block w-full rounded-md border border-gray-200 bg-transparent px-3 py-[9px] text-sm outline-2 placeholder:text-gray-500';

/**
 * A form picker in the app's glass style: a <details> whose panel is the
 * blurred list the organization status picker uses (org-select.tsx). A native
 * <select> opens the operating system's own white list, which no CSS reaches.
 *
 * The panel expands in place instead of floating, so inside a <dialog> it can't
 * cover the buttons or be clipped by the dialog's edge. It closes on pick and
 * when focus leaves, as a <select> would.
 *
 * `format` turns a value into its label — the enum-style sentence case by
 * default; pass `(v) => v` for free text such as sector names. An empty
 * `value` shows `placeholder`.
 */
export default function GlassSelect<T extends string>({
  id,
  value,
  options,
  onChange,
  format = label,
  placeholder = '',
}: {
  id: string;
  value: T | '';
  options: readonly T[];
  onChange: (value: T) => void;
  format?: (value: string) => string;
  placeholder?: string;
}) {
  const details = useRef<HTMLDetailsElement>(null);

  return (
    <details
      ref={details}
      className="group/select"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false;
      }}
    >
      <summary
        id={id}
        className={`${field} group/trigger flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400`}
      >
        {value ? format(value) : <span className="text-gray-500">{placeholder}</span>}
        {/* Same hover as the badge pickers (badge-select.tsx): brand red with a
            soft glow, on the trigger only. */}
        <ChevronDownIcon className="h-4 w-4 text-gray-500 transition-[color,filter,transform] duration-200 group-hover/trigger:text-brand-red-lit group-hover/trigger:[filter:drop-shadow(0_0_6px_rgba(255,46,67,0.7))] group-focus-visible/trigger:text-brand-red-lit group-open/select:rotate-180" />
      </summary>

      <ul
        role="listbox"
        className="mt-2 rounded-lg border border-white/[0.07] bg-white/[0.05] p-1 backdrop-blur-xl"
      >
        {options.map((option) => (
          <li key={option} role="option" aria-selected={option === value}>
            <button
              type="button"
              onClick={() => {
                onChange(option);
                if (details.current) details.current.open = false;
              }}
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
