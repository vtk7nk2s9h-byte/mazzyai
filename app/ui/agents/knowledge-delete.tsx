'use client';

import { useRef, useState, useTransition } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

import { deleteKnowledge } from '@/app/lib/knowledge-actions';
import { toastError, toastSuccess } from '@/hooks/use-toast';

/**
 * A small trash icon that opens a confirmation <dialog>, in the same shape as
 * the other agent dialogs. Deleting takes the asset away from the agents that
 * use it, so it asks first.
 */
export default function KnowledgeDelete({
  documentId,
  title,
}: {
  documentId: string;
  title: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setError(null);
    dialog.current?.showModal();
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteKnowledge(documentId);
      if (result && 'error' in result && result.error) {
        setError(result.error);
        toastError('Not deleted', result.error);
      } else {
        dialog.current?.close();
        toastSuccess('Resource deleted', `${title} was removed.`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Delete ${title}`}
        className="group inline-flex rounded align-middle focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <TrashIcon className="h-4 w-4 text-gray-500 transition-[color,filter] duration-200 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))] group-focus-visible:text-brand-red-lit" />
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="max-h-[92vh] w-[min(92vw,24rem)] whitespace-normal normal-case rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            remove();
          }}
          className="p-5"
        >
          <h3 className="text-base font-semibold">Delete resource?</h3>
          <p className="mt-1 truncate text-xs text-gray-500">{title}</p>
          <p className="mt-4 text-sm text-gray-600">
            Your voice agents will stop using it. This can&apos;t be undone.
          </p>

          <p aria-live="polite" className="mt-3 min-h-4 text-xs text-red-400">
            {error}
          </p>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:text-brand-red-lit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60"
            >
              {pending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
