'use client';

import { useRef, useState, useTransition } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

import { setRetellVoiceModel } from '@/app/lib/retell-actions';
import { toastError, toastSuccess } from '@/hooks/use-toast';

const DEFAULT = '';

/**
 * A pencil next to the model name that opens a native <dialog> listing the
 * models the agent's voice can use. "Default" clears the setting. The pencil
 * glows red on hover, like the nav icons.
 */
export default function VoiceModelEdit({
  agentId,
  agentName,
  current,
  options,
}: {
  agentId: string;
  agentName: string;
  current: string | null;
  options: readonly string[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState(current ?? DEFAULT);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setChoice(current ?? DEFAULT);
    setError(null);
    dialog.current?.showModal();
  }

  function save() {
    startTransition(async () => {
      const result = await setRetellVoiceModel(agentId, choice || null);
      if ('error' in result && result.error) {
        setError(result.error);
        toastError('Voice model not updated', result.error);
      } else {
        dialog.current?.close();
        toastSuccess('Voice model updated', `${agentName} now uses ${choice || 'the default'}.`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Edit voice model for ${agentName}`}
        className="group ml-2 inline-flex rounded align-middle focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <PencilSquareIcon className="h-4 w-4 text-gray-500 transition-[color,filter] duration-200 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))] group-focus-visible:text-brand-red-lit" />
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="max-h-[92vh] whitespace-normal normal-case w-[min(92vw,24rem)] rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="p-5"
        >
          <h3 className="text-base font-semibold">Voice model</h3>
          <p className="mt-1 text-xs text-gray-500">{agentName}</p>

          <fieldset className="mt-4 max-h-64 space-y-1 overflow-y-auto">
            <legend className="sr-only">Available voice models</legend>
            {[DEFAULT, ...options].map((model) => (
              <label
                key={model || 'default'}
                className="flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-sm transition-colors hover:bg-white/[0.04] has-[:checked]:border-brand-red-lit/50 has-[:checked]:bg-maroon-500/30"
              >
                <input
                  type="radio"
                  name="voiceModel"
                  value={model}
                  checked={choice === model}
                  onChange={() => setChoice(model)}
                  className="accent-[#ff2e43]"
                />
                {model || 'Default (Retell picks)'}
              </label>
            ))}
          </fieldset>

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
              disabled={pending || choice === (current ?? DEFAULT)}
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
