'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

import { createRetellAgent } from '@/app/lib/retell-actions';
import {
  RETELL_LANGUAGES,
  RETELL_MODELS,
  type RetellVoice,
} from '@/app/lib/retell-options';
import GlassSelect from '@/app/ui/glass-select';
import { toastError, toastSuccess } from '@/hooks/use-toast';

const input =
  'block w-full rounded-md border border-gray-200 bg-transparent px-3 py-[9px] text-sm outline-2 placeholder:text-gray-500';
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-900';
const asIs = (value: string) => value;

/**
 * "Create agent" button and its form, a native <dialog> like the organization
 * one. Only the settings that decide how the agent sounds and behaves are here:
 * identity, voice, what it says, how it listens, and call limits. Everything
 * else keeps Retell's own default. `voices` is empty if Retell's voice list
 * could not be loaded, in which case the voice is typed as an id.
 */
export default function CreateAgent({ voices }: { voices: RetellVoice[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Bumped on every open, so the form remounts empty.
  const [formKey, setFormKey] = useState(0);
  const [voiceId, setVoiceId] = useState('');
  const [language, setLanguage] = useState<string>('en-US');
  const [model, setModel] = useState<string>('gpt-4.1-mini');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const voiceLabel = (id: string) => {
    const v = voices.find((x) => x.voice_id === id);
    if (!v) return id;
    return [v.voice_name, v.provider, v.accent].filter(Boolean).join(' · ');
  };

  function open() {
    setFormKey((k) => k + 1);
    setVoiceId('');
    setLanguage('en-US');
    setModel('gpt-4.1-mini');
    setError(null);
    dialog.current?.showModal();
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (name: string) => String(data.get(name) ?? '');
    const num = (name: string) => Number(data.get(name));
    const name = text('name');

    startTransition(async () => {
      const result = await createRetellAgent({
        name,
        voiceId: voices.length ? voiceId : text('voiceId'),
        language: language as (typeof RETELL_LANGUAGES)[number],
        prompt: text('prompt'),
        beginMessage: text('beginMessage'),
        model: model as (typeof RETELL_MODELS)[number],
        voiceSpeed: num('voiceSpeed'),
        responsiveness: num('responsiveness'),
        interruptionSensitivity: num('interruptionSensitivity'),
        backchannel: data.get('backchannel') === 'on',
        maxCallMinutes: num('maxCallMinutes'),
        webhookUrl: text('webhookUrl'),
      });
      if ('error' in result && result.error) {
        setError(result.error);
        toastError('Agent not created', result.error);
      } else {
        dialog.current?.close();
        toastSuccess('Agent created', `${name} is on Retell now.`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <PlusIcon className="h-4 w-4" />
        Create agent
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="max-h-[92vh] w-[min(92vw,34rem)] rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form key={formKey} onSubmit={submit} className="space-y-4 p-5">
          <h3 className="text-base font-semibold">Create voice agent</h3>

          <div>
            <label className={labelClass} htmlFor="new-agent-name">
              Name
            </label>
            <input
              id="new-agent-name"
              name="name"
              required
              maxLength={100}
              autoFocus
              autoComplete="off"
              placeholder="Front desk receptionist"
              className={input}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="new-agent-voice">
                Voice
              </label>
              {voices.length ? (
                <GlassSelect
                  id="new-agent-voice"
                  value={voiceId}
                  options={voices.map((v) => v.voice_id)}
                  format={voiceLabel}
                  placeholder="Pick a voice"
                  onChange={setVoiceId}
                />
              ) : (
                <input
                  id="new-agent-voice"
                  name="voiceId"
                  required
                  autoComplete="off"
                  placeholder="retell-Cimo"
                  className={input}
                />
              )}
            </div>
            <div>
              <label className={labelClass} htmlFor="new-agent-language">
                Language
              </label>
              <GlassSelect
                id="new-agent-language"
                value={language}
                options={[...RETELL_LANGUAGES]}
                format={asIs}
                placeholder="Language"
                onChange={setLanguage}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="new-agent-prompt">
              Prompt
            </label>
            <textarea
              id="new-agent-prompt"
              name="prompt"
              required
              rows={5}
              maxLength={20000}
              placeholder="You are the receptionist for Bella Napoli. Take reservations, answer questions about the menu and opening hours, and be brief and friendly."
              className={input}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="new-agent-begin">
                First message
              </label>
              <input
                id="new-agent-begin"
                name="beginMessage"
                maxLength={500}
                autoComplete="off"
                placeholder="Leave empty to let the caller speak first"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="new-agent-model">
                Model
              </label>
              <GlassSelect
                id="new-agent-model"
                value={model}
                options={[...RETELL_MODELS]}
                format={asIs}
                placeholder="Model"
                onChange={setModel}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass} htmlFor="new-agent-speed">
                Voice speed
              </label>
              <input
                id="new-agent-speed"
                name="voiceSpeed"
                type="number"
                min={0.5}
                max={2}
                step={0.1}
                defaultValue={1}
                className={input}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="new-agent-resp">
                Responsiveness
              </label>
              <input
                id="new-agent-resp"
                name="responsiveness"
                type="number"
                min={0}
                max={1}
                step={0.1}
                defaultValue={1}
                className={input}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="new-agent-interrupt">
                Interruption
              </label>
              <input
                id="new-agent-interrupt"
                name="interruptionSensitivity"
                type="number"
                min={0}
                max={1}
                step={0.1}
                defaultValue={1}
                className={input}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="new-agent-max">
                Max call length (minutes)
              </label>
              <input
                id="new-agent-max"
                name="maxCallMinutes"
                type="number"
                min={1}
                max={120}
                step={1}
                defaultValue={60}
                className={input}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="new-agent-webhook">
                Webhook URL
              </label>
              <input
                id="new-agent-webhook"
                name="webhookUrl"
                type="url"
                autoComplete="off"
                placeholder="https://…"
                className={input}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-900">
            <input type="checkbox" name="backchannel" />
            Backchannel — say &ldquo;mm-hmm&rdquo; while the caller talks
          </label>

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
              disabled={pending}
              className="rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60"
            >
              {pending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
