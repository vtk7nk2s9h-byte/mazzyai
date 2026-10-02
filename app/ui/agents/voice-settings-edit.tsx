'use client';

import { useRef, useState, useTransition } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { setRetellVoiceSettings } from '@/app/lib/retell-actions';
import {
  INTERRUPTION_RANGE,
  VOICE_EMOTIONS,
  VOICE_SPEED_RANGE,
  VOICE_TEMPERATURE_RANGE,
  VOICE_VOLUME_RANGE,
} from '@/app/lib/retell-options';
import { Slider } from '@/components/ui/slider';
import { toastError, toastSuccess } from '@/hooks/use-toast';

type Settings = {
  speed: number;
  temperature: number;
  volume: number;
  emotion: string | null;
  interruption: number;
};

const chip =
  'cursor-pointer rounded-full border border-white/[0.12] px-2.5 py-1 text-xs capitalize text-gray-600 transition-colors hover:text-brand-red-lit has-[:checked]:border-brand-red-lit/60 has-[:checked]:bg-maroon-500/30 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-red-lit';

function SliderField({
  label,
  hint,
  value,
  range,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (value: number) => void;
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
        onValueChange={([next]) => onChange(next)}
      />
      <p className="mt-1.5 text-[11px] text-gray-500">{hint}</p>
    </div>
  );
}

/**
 * A pencil next to the voice-settings summary, opening a <dialog> with a slider
 * each for speed, temperature and volume and a pick of emotion. One Save sends
 * all four. Retell's defaults are 1 / 1 / 1 and no emotion, which is what the
 * sliders start at when the agent has none set.
 */
export default function VoiceSettingsEdit({
  agentId,
  agentName,
  current,
}: {
  agentId: string;
  agentName: string;
  current: Settings;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const unchanged =
    values.speed === current.speed &&
    values.temperature === current.temperature &&
    values.volume === current.volume &&
    values.emotion === current.emotion &&
    values.interruption === current.interruption;

  function open() {
    setValues(current);
    setError(null);
    dialog.current?.showModal();
  }

  function save() {
    startTransition(async () => {
      const result = await setRetellVoiceSettings(agentId, {
        voiceSpeed: values.speed,
        voiceTemperature: values.temperature,
        volume: values.volume,
        voiceEmotion: values.emotion as (typeof VOICE_EMOTIONS)[number] | null,
        interruptionSensitivity: values.interruption,
      });
      if ('error' in result && result.error) {
        setError(result.error);
        toastError('Voice settings not updated', result.error);
      } else {
        dialog.current?.close();
        toastSuccess('Voice settings updated', `${agentName} is saved.`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Edit voice settings for ${agentName}`}
        className="group ml-2 inline-flex rounded align-middle focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <PencilSquareIcon className="h-4 w-4 text-gray-500 transition-[color,filter] duration-200 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))] group-focus-visible:text-brand-red-lit" />
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="max-h-[92vh] whitespace-normal normal-case w-[min(92vw,26rem)] rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-5 p-5"
        >
          <div>
            <h3 className="text-base font-semibold">Voice settings</h3>
            <p className="mt-1 text-xs text-gray-500">{agentName}</p>
          </div>

          <SliderField
            label="Voice speed"
            hint="How fast the agent talks. 1 is normal."
            value={values.speed}
            range={VOICE_SPEED_RANGE}
            onChange={(v) => set('speed', v)}
          />
          <SliderField
            label="Voice temperature"
            hint="Higher is more expressive and varied; lower is steadier."
            value={values.temperature}
            range={VOICE_TEMPERATURE_RANGE}
            onChange={(v) => set('temperature', v)}
          />
          <SliderField
            label="Volume"
            hint="How loud the agent is. 1 is normal."
            value={values.volume}
            range={VOICE_VOLUME_RANGE}
            onChange={(v) => set('volume', v)}
          />

          <SliderField
            label="Interruption sensitivity"
            hint="How easily the caller can cut the agent off. 0 never lets them; 1 stops at any sound."
            value={values.interruption}
            range={INTERRUPTION_RANGE}
            onChange={(v) => set('interruption', v)}
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
                    name="voiceEmotion"
                    checked={values.emotion === emotion}
                    onChange={() => set('emotion', emotion)}
                    className="sr-only"
                  />
                  {emotion ?? 'None'}
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
