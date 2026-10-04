// Plain constants shared by the create-agent form (client) and its server
// action. Not in the action file: a 'use server' file may only export async
// functions.

export const RETELL_LANGUAGES = [
  'en-US',
  'en-GB',
  'nl-NL',
  'de-DE',
  'fr-FR',
  'es-ES',
  'hi-IN',
  'ja-JP',
  'zh-CN',
] as const;

export const RETELL_MODELS = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-5-mini',
  'claude-4.5-haiku',
  'claude-4.5-sonnet',
  'gemini-3.0-flash',
] as const;

export type RetellVoice = {
  voice_id: string;
  voice_name: string;
  provider: string;
  gender?: string;
  accent?: string;
};

// TTS models from Retell's update-agent docs, grouped by the voice provider
// they belong to. The grouping is inferred from the model names, not stated in
// the docs — Retell remains the judge and rejects a mismatch with a message.
export const VOICE_MODELS_BY_PROVIDER: Record<string, readonly string[]> = {
  elevenlabs: [
    'eleven_flash_v2',
    'eleven_flash_v2_5',
    'eleven_multilingual_v2',
    'eleven_v3',
  ],
  cartesia: ['sonic-3', 'sonic-3-latest', 'sonic-3.5', 'sonic-3.6'],
  openai: ['tts-1', 'gpt-4o-mini-tts'],
  minimax: ['speech-02-turbo', 'speech-2.8-turbo'],
  fish_audio: ['s1', 's2-pro', 's2.1-pro'],
  inworld: ['inworld-tts-2', 'inworld-tts-2-flash'],
};

export const ALL_VOICE_MODELS = Object.values(VOICE_MODELS_BY_PROVIDER).flat();

/** Models offered for a voice's provider; every model if the provider is unknown. */
export function voiceModelsFor(provider?: string): readonly string[] {
  return (provider && VOICE_MODELS_BY_PROVIDER[provider]) || ALL_VOICE_MODELS;
}

export const VOICE_EMOTIONS = [
  'calm',
  'sympathetic',
  'happy',
  'sad',
  'angry',
  'fearful',
  'surprised',
] as const;

// Ranges from the update-agent docs.
export const VOICE_SPEED_RANGE = { min: 0.5, max: 2, step: 0.05 } as const;
export const VOICE_TEMPERATURE_RANGE = { min: 0, max: 2, step: 0.05 } as const;
export const VOICE_VOLUME_RANGE = { min: 0, max: 2, step: 0.05 } as const;
export const INTERRUPTION_RANGE = { min: 0, max: 1, step: 0.05 } as const;

// Background sounds Retell can play under the call (update-agent docs).
export const AMBIENT_SOUNDS = [
  'coffee-shop',
  'convention-hall',
  'summer-outdoor',
  'mountain-outdoor',
  'static-noise',
  'call-center',
] as const;

// "custom" is left out: it needs a provider and endpointing config of its own.
export const STT_MODES = ['fast', 'accurate'] as const;

/** Plain-language descriptions for the speech-recognition dialog. */
export const STT_MODE_INFO: Record<(typeof STT_MODES)[number], string> = {
  fast: 'Answers quickly. Best for most calls, where follow up questions matter most.',
  accurate:
    'Waits a little longer to be sure it heard right. Better for names, numbers and noisy lines, at the cost of a slightly slower reply.',
};

// The languages the agents table offers. Codes are Retell locales; Arabic has
// only ar-SA in Retell's docs.
export const AGENT_LANGUAGES = ['en-US', 'ar-SA', 'nl-NL'] as const;
export type AgentLanguage = (typeof AGENT_LANGUAGES)[number];

export const LANGUAGE_INFO: Record<AgentLanguage, { code: string; name: string }> = {
  'en-US': { code: 'EN', name: 'English' },
  'ar-SA': { code: 'AR', name: 'Arabic' },
  'nl-NL': { code: 'NL', name: 'Dutch' },
};
