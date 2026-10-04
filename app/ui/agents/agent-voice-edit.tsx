'use client';

import { useRef, useState, useTransition } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

import { updateAgentVoice } from '@/app/lib/retell-actions';
import {
  AGENT_LANGUAGES,
  LANGUAGE_INFO,
  RETELL_LANGUAGES,
  VOICE_EMOTIONS,
  VOICE_SPEED_RANGE,
  VOICE_TEMPERATURE_RANGE,
  VOICE_VOLUME_RANGE,
  voiceModelsFor,
  type AgentLanguage,
} from '@/app/lib/retell-options';
import GlassSelect from '@/app/ui/glass-select';
import { Slider } from '@/components/ui/slider';
import { toastError, toastSuccess } from '@/hooks/use-toast';

export const chip =
  'cursor-pointer rounded-full border border-white/[0.12] px-2.5 py-1 text-xs capitalize text-gray-600 transition-colors hover:text-brand-red-lit has-[:checked]:border-brand-red-lit/60 has-[:checked]:bg-maroon-500/30 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-red-lit';

export function SliderField({
  label,
  hint,
  value,
  range,
  onChangeAction,
}: {
  label: string;
  hint: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChangeAction: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium text-gray-900">{label}</span>
        <span className="text-xs tabular-nums text-gray-600">
          {value.toFixed(2)}
        </span>
      </div>
      <Slider
        aria-label={label}
        {...range}
        value={[value]}
        onValueChange={([next]) => onChangeAction(next)}
      />
      <p className="mt-1.5 text-[11px] text-gray-500">{hint}</p>
    </div>
  );
}

export type VoiceOption = {
  voice_id: string;
  voice_name: string;
  provider: string;
  accent?: string;
};

type Values = {
  voiceId: string;
  voiceModel: string | null;
  speed: number;
  temperature: number;
  volume: number;
  emotion: string | null;
  language: string;
};

const labelClass = 'mb-1.5 block text-xs font-medium text-gray-900';
// GlassSelect's options are plain strings, so "no model chosen" gets a value
// that is not a model name.
const DEFAULT_MODEL = 'default';

const languageName = (code: string) =>
  LANGUAGE_INFO[code as AgentLanguage]?.name
    ? `${LANGUAGE_INFO[code as AgentLanguage].name} (${code})`
    : code;

/**
 * A pencil beside the Voice card's heading — the same one the agents table uses
 * for its own edits — opening a <dialog> with every line of the card: the voice,
 * its model, speed, temperature, volume, emotion and the language. One Save
 * sends them all.
 */
export default function AgentVoiceEdit({
  agentId,
  agentName,
  voices,
  current,
}: {
  agentId: string;
  agentName: string;
  voices: VoiceOption[];
  current: Values;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  // The agent's own voice stays pickable even if Retell's list doesn't carry it.
  const voiceIds = voices.some((v) => v.voice_id === current.voiceId)
    ? voices.map((v) => v.voice_id)
    : [current.voiceId, ...voices.map((v) => v.voice_id)];
  const voiceLabel = (id: string) => {
    const v = voices.find((x) => x.voice_id === id);
    return v ? `${v.voice_name} · ${v.provider}${v.accent ? ` · ${v.accent}` : ''}` : id;
  };

  // Only the models that fit the chosen voice's provider; Retell is the judge.
  const provider = voices.find((v) => v.voice_id === values.voiceId)?.provider;
  const models = [...voiceModelsFor(provider)];
  const modelOptions = [
    DEFAULT_MODEL,
    ...(values.voiceModel && !models.includes(values.voiceModel)
      ? [values.voiceModel]
      : []),
    ...models,
  ];

  const languages = [
    ...new Set([...AGENT_LANGUAGES, ...RETELL_LANGUAGES, current.language]),
  ];

  const unchanged = (Object.keys(current) as (keyof Values)[]).every(
    (k) => values[k] === current[k],
  );

  function open() {
    setValues(current);
    setError(null);
    dialog.current?.showModal();
  }

  function save() {
    startTransition(async () => {
      const result = await updateAgentVoice(agentId, {
        voiceId: values.voiceId,
        voiceModel: values.voiceModel,
        voiceSpeed: values.speed,
        voiceTemperature: values.temperature,
        volume: values.volume,
        voiceEmotion: values.emotion as (typeof VOICE_EMOTIONS)[number] | null,
        language: values.language,
      });
      if ('error' in result && result.error) {
        setError(result.error);
        toastError('Voice not updated', result.error);
      } else {
        dialog.current?.close();
        toastSuccess('Voice updated', `${agentName} is saved.`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Edit the voice of ${agentName}`}
        className="group inline-flex rounded align-middle focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <PencilSquareIcon className="h-4 w-4 text-gray-500 transition-[color,filter] duration-200 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))] group-focus-visible:text-brand-red-lit" />
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="max-h-[92vh] w-[min(92vw,26rem)] overflow-y-auto whitespace-normal normal-case rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-5 p-5"
        >
          <div>
            <h3 className="text-base font-semibold">Voice</h3>
            <p className="mt-1 text-xs text-gray-500">{agentName}</p>
          </div>

          <div>
            <label className={labelClass} htmlFor={`voice-${agentId}`}>
              Voice
            </label>
            <GlassSelect
              id={`voice-${agentId}`}
              value={values.voiceId}
              options={voiceIds}
              format={voiceLabel}
              placeholder="Pick a voice"
              onChange={(id) =>
                setValues((v) => {
                  // A model belongs to one provider; if the new voice's provider
                  // doesn't offer it, fall back to the default.
                  const next = voices.find((x) => x.voice_id === id)?.provider;
                  const keep =
                    v.voiceModel && voiceModelsFor(next).includes(v.voiceModel);
                  return { ...v, voiceId: id, voiceModel: keep ? v.voiceModel : null };
                })
              }
            />
          </div>

          <div>
            <label className={labelClass} htmlFor={`model-${agentId}`}>
              Voice model
            </label>
            <GlassSelect
              id={`model-${agentId}`}
              value={values.voiceModel ?? DEFAULT_MODEL}
              options={modelOptions}
              format={(m) => (m === DEFAULT_MODEL ? 'Default' : m)}
              onChange={(m) => set('voiceModel', m === DEFAULT_MODEL ? null : m)}
            />
          </div>

          <SliderField
            label="Voice speed"
            hint="How fast the agent talks. 1 is normal."
            value={values.speed}
            range={VOICE_SPEED_RANGE}
            onChangeAction={(v) => set('speed', v)}
          />
          <SliderField
            label="Voice temperature"
            hint="Higher is more expressive and varied; lower is steadier."
            value={values.temperature}
            range={VOICE_TEMPERATURE_RANGE}
            onChangeAction={(v) => set('temperature', v)}
          />
          <SliderField
            label="Volume"
            hint="How loud the agent is. 1 is normal."
            value={values.volume}
            range={VOICE_VOLUME_RANGE}
            onChangeAction={(v) => set('volume', v)}
          />

          <fieldset>
            <legend className="mb-2 text-xs font-medium text-gray-900">
              Voice emotion
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {[null, ...VOICE_EMOTIONS].map((emotion) => (
                <label key={emotion ?? 'none'} className={chip}>
                  <input
                    type="radio"
                    name={`emotion-${agentId}`}
                    checked={values.emotion === emotion}
                    onChange={() => set('emotion', emotion)}
                    className="sr-only"
                  />
                  {emotion ?? 'None'}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className={labelClass} htmlFor={`language-${agentId}`}>
              Language
            </label>
            <GlassSelect
              id={`language-${agentId}`}
              value={values.language}
              options={languages}
              format={languageName}
              onChange={(l) => set('language', l)}
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
