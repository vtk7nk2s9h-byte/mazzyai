'use client';

import { useState, useTransition } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

import type { LabResult } from '@/app/lib/test-lab-actions';
import { toastError, toastSuccess } from '@/hooks/use-toast';

/**
 * One request as a card: a preview of the variant that will be sent, a refresh
 * button in the corner to switch to another, and a single Send button. The
 * variants themselves are previews only — the action looks the real one up by
 * index.
 */
export default function RequestCard({
  title,
  description,
  action,
  organizationId,
  variants,
  disabled,
}: {
  title: string;
  description: string;
  action: (organizationId: string, index: number) => Promise<LabResult | { error: string }>;
  organizationId: string;
  /** What each variant looks like, in the order the action indexes them. */
  variants: { heading: string; lines: string[] }[];
  /** Why it can't send, e.g. the organization has no agents. */
  disabled?: string;
}) {
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const variant = variants[index];

  function refresh() {
    // Any other variant, never the one already showing.
    const others = variants.map((_, i) => i).filter((i) => i !== index);
    setIndex(others[Math.floor(Math.random() * others.length)] ?? index);
  }

  function send() {
    startTransition(async () => {
      const result = await action(organizationId, index);
      const failed = 'error' in result;
      const message = failed ? result.error : result.message;
      if (failed || !result.ok) toastError(`${title} not sent`, message);
      else toastSuccess(title, message);
    });
  }

  return (
    <section className="relative rounded-lg bg-gray-50 p-5">
      <button
        type="button"
        onClick={refresh}
        title="Try different data"
        aria-label="Try different data"
        className="absolute right-3 top-3 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
      >
        <ArrowPathIcon className="w-4" />
      </button>

      <h2 className="text-sm font-medium text-gray-900">{title}</h2>
      <p className="mt-0.5 text-xs text-gray-500">{description}</p>

      <div className="mt-3 rounded-md border border-white/[0.12] p-3 text-xs text-gray-600">
        <p className="font-medium text-gray-900">{variant.heading}</p>
        {variant.lines.map((line) => (
          <p key={line} className="mt-0.5">
            {line}
          </p>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={pending || !!disabled}
          className="rounded-md border border-brand-red-lit/35 bg-maroon-500/30 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60"
        >
          {pending ? 'Sending…' : 'Send'}
        </button>
        {disabled && <p className="text-xs text-gray-500">{disabled}</p>}
      </div>
    </section>
  );
}
