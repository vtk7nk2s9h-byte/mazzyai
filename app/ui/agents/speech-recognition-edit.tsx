'use client';

import { useRef, useState, useTransition } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

import { setRetellSpeechRecognition } from '@/app/lib/retell-actions';
import {
  STT_MODE_INFO,
  STT_MODES,
} from '@/app/lib/retell-options';
import { toastError, toastSuccess } from '@/hooks/use-toast';

type Mode = (typeof STT_MODES)[number];

const input =
  'block w-full rounded-md border border-gray-200 bg-transparent px-3 py-[9px] text-sm outline-2 placeholder:text-gray-500';
const card =
  'flex cursor-pointer flex-col gap-0.5 rounded-md border border-white/[0.12] px-3 py-2 transition-colors hover:bg-white/[0.04] has-[:checked]:border-brand-red-lit/50 has-[:checked]:bg-maroon-500/30 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-red-lit';

/** Keywords arrive one per line or comma-separated; blanks and repeats go. */
function parseKeywords(text: string) {
  return [
    ...new Set(
      text
        .split(/[\n,]/)
        .map((k) => k.trim())
        .filter(Boolean),
    ),
  ];
}

function Choice<T extends string>({
  legend,
  name,
  value,
  options,
  info,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly T[];
  info: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-gray-900">
        {legend}
      </legend>
      <div className="space-y-1.5">
        {options.map((option) => (
          <label key={option} className={card}>
            <input
              type="radio"
              name={name}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            <span className="text-sm font-medium capitalize">{option}</span>
            <span className="text-xs text-gray-500">{info[option]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * A pencil next to the speech-recognition summary, opening a <dialog> for how
 * the agent hears callers: recognition mode and a list of words it
 * should listen out for. Each setting says in plain words what it does.
 */
export default function SpeechRecognitionEdit({
  agentId,
  agentName,
  current,
}: {
  agentId: string;
  agentName: string;
  current: { mode: Mode; keywords: string[] };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>(current.mode);
  const [keywordText, setKeywordText] = useState(current.keywords.join('\n'));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const keywords = parseKeywords(keywordText);
  const unchanged =
    mode === current.mode &&
    keywords.join('\n') === current.keywords.join('\n');

  function open() {
    setMode(current.mode);
    setKeywordText(current.keywords.join('\n'));
    setError(null);
    dialog.current?.showModal();
  }

  function save() {
    startTransition(async () => {
      const result = await setRetellSpeechRecognition(agentId, {
        sttMode: mode,
        boostedKeywords: keywords,
      });
      if ('error' in result && result.error) {
        setError(result.error);
        toastError('Speech recognition not updated', result.error);
      } else {
        dialog.current?.close();
        toastSuccess('Speech recognition updated', `${agentName} is saved.`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Edit speech recognition for ${agentName}`}
        className="group ml-2 inline-flex rounded align-middle focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <PencilSquareIcon className="h-4 w-4 text-gray-500 transition-[color,filter] duration-200 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))] group-focus-visible:text-brand-red-lit" />
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="max-h-[92vh] whitespace-normal normal-case w-[min(94vw,30rem)] overflow-y-auto rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-5 p-5"
        >
          <div>
            <h3 className="text-base font-semibold">Speech recognition</h3>
            <p className="mt-1 text-xs text-gray-500">
              {agentName} — how the agent hears and understands callers.
            </p>
          </div>

                    <Choice
            legend="Recognition mode"
            name="sttMode"
            value={mode}
            options={STT_MODES}
            info={STT_MODE_INFO}
            onChange={setMode}
          />

          <div>
            <label
              htmlFor={`keywords-${agentId}`}
              className="mb-1.5 block text-xs font-medium text-gray-900"
            >
              Boosted keywords
            </label>
            <textarea
              id={`keywords-${agentId}`}
              value={keywordText}
              onChange={(e) => setKeywordText(e.target.value)}
              rows={3}
              placeholder={'Bella Napoli\nMargherita\nGnocchi'}
              className={input}
            />
            <p className="mt-1.5 text-[11px] text-gray-500">
              Words the agent should listen out for — brand names, menu items,
              people, jargon. Put one per line or separate them with commas.
              {keywords.length > 0 && ` ${keywords.length} added.`}
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
