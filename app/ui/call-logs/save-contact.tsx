'use client';

import { useOptimistic, useTransition } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

import {
  removeContactFromCall,
  saveContactFromCall,
} from '@/app/lib/contact-actions';
import { toastError, toastSuccess } from '@/hooks/use-toast';

/**
 * The Caller card's toggle: "Save contact" with a tick until the caller is
 * kept, then "Remove contact" with a cross. Nothing when the call has no number
 * to save.
 *
 * It flips the moment it is clicked and holds that while the action runs; if
 * the action fails the transition ends and it snaps back, with an error toast.
 * (A plain <form action> left the button to wait for the page to re-render.)
 */
export default function SaveContact({
  callId,
  saved,
  hasNumber,
}: {
  callId: string;
  saved: boolean;
  hasNumber: boolean;
}) {
  const [isSaved, setSaved] = useOptimistic(saved, (_, next: boolean) => next);
  const [pending, startTransition] = useTransition();

  if (!hasNumber) return null;

  function toggle() {
    const saving = !isSaved;
    startTransition(async () => {
      setSaved(saving);
      const result = await (saving ? saveContactFromCall : removeContactFromCall)(
        callId,
      );
      if ('error' in result) {
        toastError(
          saving ? 'Contact not saved' : 'Contact not removed',
          result.error,
        );
      } else {
        toastSuccess(
          saving ? 'Contact saved' : 'Contact removed',
          saving
            ? 'The caller is in your contacts now.'
            : 'The caller is no longer in your contacts.',
        );
      }
    });
  }

  const Icon = isSaved ? XMarkIcon : CheckIcon;
  return (
    <button
      type="button"
      // A bare text node beside the icon is what page translators and some
      // extensions rewrite, after which React can no longer find its place and
      // throws insertBefore. The label sits in its own <span>, and the button
      // opts out of translation.
      translate="no"
      onClick={toggle}
      disabled={pending}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60 ${
        isSaved
          ? 'border-white/[0.12] text-gray-600 hover:border-brand-red-lit hover:text-brand-red-lit focus-visible:ring-maroon-400'
          : 'border-brand-red-lit/50 bg-maroon-500/30 text-white hover:border-brand-red-lit hover:bg-maroon-500/50 focus-visible:ring-brand-red-lit'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{isSaved ? 'Remove contact' : 'Save contact'}</span>
    </button>
  );
}
