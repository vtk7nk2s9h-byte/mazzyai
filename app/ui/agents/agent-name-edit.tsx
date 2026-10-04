'use client';

import { useRef, useState, useTransition } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

import { renameAgent } from '@/app/lib/retell-actions';
import { toastError, toastSuccess } from '@/hooks/use-toast';

export const input =
  'block w-full rounded-md border border-gray-200 bg-transparent px-3 py-[9px] text-sm outline-2 placeholder:text-gray-500';

/**
 * The agents table's pencil, next to an agent's name, opening a <dialog> to
 * rename it. Same icon, glow and dialog frame as the table's other edits.
 */
export default function AgentNameEdit({
  agentId,
  name,
}: {
  agentId: string;
  name: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = value.trim();

  function open() {
    setValue(name);
    setError(null);
    dialog.current?.showModal();
  }

  function save() {
    startTransition(async () => {
      const result = await renameAgent(agentId, trimmed);
      if ('error' in result && result.error) {
        setError(result.error);
        toastError('Agent not renamed', result.error);
      } else {
        dialog.current?.close();
        toastSuccess('Agent renamed', `Now called ${trimmed}.`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Rename ${name}`}
        className="group inline-flex rounded align-middle focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <PencilSquareIcon className="h-4 w-4 text-gray-500 transition-[color,filter] duration-200 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))] group-focus-visible:text-brand-red-lit" />
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="max-h-[92vh] w-[min(92vw,24rem)] whitespace-normal normal-case rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-5 p-5"
        >
          <div>
            <h3 className="text-base font-semibold">Edit agent</h3>
            <p className="mt-1 text-xs text-gray-500">
              Change the name of your agent.
            </p>
          </div>

          <div>
            <label
              htmlFor={`name-${agentId}`}
              className="mb-1.5 block text-xs font-medium text-gray-900"
            >
              Name
            </label>
            <input
              id={`name-${agentId}`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={100}
              autoComplete="off"
              className={input}
            />
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
              disabled={pending || !trimmed || trimmed === name}
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