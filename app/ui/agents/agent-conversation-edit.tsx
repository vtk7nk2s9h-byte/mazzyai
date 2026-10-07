'use client';

import { useRef, useState, useTransition } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

import { updateAgentConversation } from '@/app/lib/retell-actions';
import {
  AMBIENT_SOUNDS,
  INTERRUPTION_RANGE,
  STT_MODE_INFO,
  STT_MODES,
} from '@/app/lib/retell-options';
import { input } from '@/app/ui/agents/agent-name-edit';
import { chip, SliderField } from '@/app/ui/agents/agent-voice-edit';
import { Switch } from '@/components/ui/switch';
import { toastError, toastSuccess } from '@/hooks/use-toast';

type Mode = (typeof STT_MODES)[number];

type Values = {
  responsiveness: number;
  interruption: number;
  silenceSeconds: number;
  maxCallMinutes: number;
  sttMode: Mode | 'custom';
  keywords: string[];
  ambientSound: string | null;
  voicemail: boolean;
};

const labelClass = 'mb-1.5 block text-xs font-medium text-gray-900';
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
const RESPONSIVENESS_RANGE = { min: 0, max: 1, step: 0.05 } as const;

/**
 * A pencil beside the Conversation card's heading — the same one the agents
 * table uses for its own edits — opening a <dialog> with every line of the
 * card: responsiveness, interruption sensitivity, the silence and call-length
 * limits, voicemail detection, speech recognition, boosted keywords and the
 * background sound. Backchannel is shown but not editable, as asked.
 */
export default function AgentConversationEdit({
  agentId,
  agentName,
  backchannel,
  current,
}: {
  agentId: string;
  agentName: string;
  /** Shown read-only: this card does not edit it. */
  backchannel: boolean;
  current: Values;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState(current);
  const [keywordText, setKeywordText] = useState(current.keywords.join('\n'));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const keywords = parseKeywords(keywordText);
  const numbersOk =
    Number.isInteger(values.silenceSeconds) &&
    values.silenceSeconds >= 10 &&
    Number.isInteger(values.maxCallMinutes) &&
    values.maxCallMinutes >= 1 &&
    values.maxCallMinutes <= 120;

  const unchanged =
    keywords.join('\n') === current.keywords.join('\n') &&
    (Object.keys(current) as (keyof Values)[])
      .filter((k) => k !== 'keywords')
      .every((k) => values[k] === current[k]);

  function open() {
    setValues(current);
    setKeywordText(current.keywords.join('\n'));
    setError(null);
    dialog.current?.showModal();
  }

  function save() {
    startTransition(async () => {
      const result = await updateAgentConversation(agentId, {
        responsiveness: values.responsiveness,
        interruptionSensitivity: values.interruption,
        silenceSeconds: values.silenceSeconds,
        maxCallMinutes: values.maxCallMinutes,
        // A custom recognition mode is set elsewhere; leave it alone.
        ...(values.sttMode !== 'custom' && { sttMode: values.sttMode }),
        boostedKeywords: keywords,
        ambientSound: values.ambientSound as (typeof AMBIENT_SOUNDS)[number] | null,
        // Only when it changed, so an existing voicemail action isn't overwritten.
        ...(values.voicemail !== current.voicemail && {
          voicemail: values.voicemail,
        }),
      });
      if ('error' in result && result.error) {
        setError(result.error);
        toastError('Conversation not updated', result.error);
      } else {
        dialog.current?.close();
        toastSuccess('Conversation updated', `${agentName} is saved.`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Edit the conversation settings of ${agentName}`}
        className="group inline-flex rounded align-middle focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <PencilSquareIcon className="h-4 w-4 text-gray-500 transition-[color,filter] duration-200 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))] group-focus-visible:text-brand-red-lit" />
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="max-h-[92vh] w-[min(94vw,30rem)] overflow-y-auto whitespace-normal normal-case rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-5 p-5"
        >
          <div>
            <h3 className="text-base font-semibold">Conversation</h3>
            <p className="mt-1 text-xs text-gray-500">
              {agentName} — how it listens and when it stops.
            </p>
          </div>

          <SliderField
            label="Responsiveness"
            hint="Lower waits longer and replies slower; higher answers as soon as it can."
            value={values.responsiveness}
            range={RESPONSIVENESS_RANGE}
            onChangeAction={(v) => set('responsiveness', v)}
          />
          <SliderField
            label="Interruption sensitivity"
            hint="How easily the caller can cut the agent off. 0 never lets them; 1 stops at any sound."
            value={values.interruption}
            range={INTERRUPTION_RANGE}
            onChangeAction={(v) => set('interruption', v)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor={`silence-${agentId}`}>
                Hangs up after silence (s)
              </label>
              <input
                id={`silence-${agentId}`}
                type="number"
                min={10}
                max={3600}
                step={1}
                value={values.silenceSeconds}
                onChange={(e) => set('silenceSeconds', Number(e.target.value))}
                className={input}
              />
              <p className="mt-1.5 text-[11px] text-gray-500">At least 10 seconds.</p>
            </div>
            <div>
              <label className={labelClass} htmlFor={`longest-${agentId}`}>
                Longest call (min)
              </label>
              <input
                id={`longest-${agentId}`}
                type="number"
                min={1}
                max={120}
                step={1}
                value={values.maxCallMinutes}
                onChange={(e) => set('maxCallMinutes', Number(e.target.value))}
                className={input}
              />
              <p className="mt-1.5 text-[11px] text-gray-500">1 to 120 minutes.</p>
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-white/[0.12] px-3 py-2.5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-gray-900">
                  Voicemail detection
                </p>
                <p className="text-[11px] text-gray-500">
                  Hangs up when a voicemail answers.
                </p>
              </div>
              <Switch
                checked={values.voicemail}
                onCheckedChange={(on) => set('voicemail', on)}
                aria-label="Voicemail detection"
              />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] pt-3">
              <div>
                <p className="text-xs font-medium text-gray-900">Backchannel</p>
                <p className="text-[11px] text-gray-500">
                  Can&apos;t be changed here.
                </p>
              </div>
              <span className="text-xs text-gray-600">{backchannel ? 'On' : 'Off'}</span>
            </div>
          </div>

          {values.sttMode === 'custom' ? (
            <div>
              <p className="mb-1 text-xs font-medium text-gray-900">
                Recognition mode
              </p>
              <p className="text-[11px] text-gray-500">
                This agent uses a custom mode, which is set in Retell.
              </p>
            </div>
          ) : (
            <Choice
              legend="Recognition mode"
              name={`sttMode-${agentId}`}
              value={values.sttMode}
              options={STT_MODES}
              info={STT_MODE_INFO}
              onChange={(m) => set('sttMode', m)}
            />
          )}

          <div>
            <label className={labelClass} htmlFor={`keywords-${agentId}`}>
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
              One per line, or separated by commas.
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-medium text-gray-900">
              Ambient sound
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {[null, ...AMBIENT_SOUNDS].map((sound) => (
                <label key={sound ?? 'none'} className={chip}>
                  <input
                    type="radio"
                    name={`ambient-${agentId}`}
                    checked={values.ambientSound === sound}
                    onChange={() => set('ambientSound', sound)}
                    className="sr-only"
                  />
                  {sound ? sound.replace(/-/g, ' ') : 'None'}
                </label>
              ))}
            </div>
          </fieldset>

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
              disabled={pending || unchanged || !numbersOk}
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