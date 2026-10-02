'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { withRoleAction } from '@/auth';
import { AGENT_STATUSES } from '@/app/lib/utils';
import { retell, retellStorageSettings } from '@/app/lib/retell-api';
import { db } from '@/src/prisma/db';
import {
  AGENT_LANGUAGES,
  ALL_VOICE_MODELS,
  RETELL_LANGUAGES,
  RETELL_MODELS,
  STT_MODES,
  VOICE_EMOTIONS,
} from '@/app/lib/retell-options';

const CreateAgentSchema = z.object({
  name: z.string().trim().min(1, 'Please enter a name.').max(100),
  voiceId: z.string().trim().min(1, 'Please pick a voice.'),
  language: z.enum(RETELL_LANGUAGES),
  prompt: z.string().trim().min(1, 'Please write the agent prompt.').max(20000),
  // Empty means the caller speaks first.
  beginMessage: z.string().trim().max(500),
  model: z.enum(RETELL_MODELS),
  voiceSpeed: z.number().min(0.5).max(2),
  responsiveness: z.number().min(0).max(1),
  interruptionSensitivity: z.number().min(0).max(1),
  backchannel: z.boolean(),
  maxCallMinutes: z.number().int().min(1).max(120),
  webhookUrl: z.union([
    z.literal(''),
    z.string().trim().url('Please enter a valid webhook URL.'),
  ]),
});

export type CreateAgentInput = z.input<typeof CreateAgentSchema>;

/**
 * Creates a Retell voice agent. Retell wants a response engine first, so this
 * makes a Retell LLM from the prompt and first message, then the agent on top
 * of it (and removes the LLM again if the agent is refused). Superusers only.
 */
export const createRetellAgent = withRoleAction(
  'SUPERUSER',
  async (_me, input: CreateAgentInput) => {
    if (!process.env.RETELL_API_KEY) {
      return { error: 'RETELL_API_KEY is not set.' };
    }
    const parsed = CreateAgentSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Check the fields.' };
    }
    const v = parsed.data;

    const llm = await retell('POST', '/create-retell-llm', {
      general_prompt: v.prompt,
      begin_message: v.beginMessage,
      model: v.model,
      start_speaker: v.beginMessage ? 'agent' : 'user',
    });
    if (!llm.ok) return { error: `Could not create the LLM: ${llm.message}` };

    const agent = await retell('POST', '/create-agent', {
      response_engine: { type: 'retell-llm', llm_id: llm.data.llm_id },
      voice_id: v.voiceId,
      agent_name: v.name,
      language: v.language,
      voice_speed: v.voiceSpeed,
      responsiveness: v.responsiveness,
      interruption_sensitivity: v.interruptionSensitivity,
      enable_backchannel: v.backchannel,
      max_call_duration_ms: v.maxCallMinutes * 60_000,
      ...(v.webhookUrl && { webhook_url: v.webhookUrl }),
    });
    if (!agent.ok) {
      await retell('DELETE', `/delete-retell-llm/${llm.data.llm_id}`);
      return { error: `Could not create the agent: ${agent.message}` };
    }

    revalidatePath('/dashboard/agents');
    return { ok: true as const };
  },
);

/**
 * Turns voicemail detection on or off for an agent. Retell has no separate
 * switch: the feature is on when `voicemail_option` is set and off when it is
 * null. "On" hangs up when a voicemail is detected, the one action that needs
 * no extra text; changing it later is a PATCH of the same field.
 */
export const setRetellVoicemail = withRoleAction(
  'USER',
  async (_me, agentId: string, enabled: boolean) => {
    const res = await retell('PATCH', `/update-agent/${agentId}`, {
      voicemail_option: enabled ? { action: { type: 'hangup' } } : null,
    });
    if (!res.ok) return { error: res.message };
    revalidatePath('/dashboard/agents');
    return { ok: true as const };
  },
);

/** Sets an agent's TTS model; null clears it so Retell's default applies. */
export const setRetellVoiceModel = withRoleAction(
  'USER',
  async (_me, agentId: string, model: string | null) => {
    if (model !== null && !ALL_VOICE_MODELS.includes(model)) {
      return { error: 'Unknown voice model.' };
    }
    const res = await retell('PATCH', `/update-agent/${agentId}`, {
      voice_model: model,
    });
    if (!res.ok) return { error: res.message };
    revalidatePath('/dashboard/agents');
    return { ok: true as const };
  },
);

const VoiceSettingsSchema = z.object({
  voiceSpeed: z.number().min(0.5).max(2),
  voiceTemperature: z.number().min(0).max(2),
  volume: z.number().min(0).max(2),
  // null clears the emotion.
  voiceEmotion: z.enum(VOICE_EMOTIONS).nullable(),
  // 0 means the caller can never interrupt; 1 means any sound does.
  interruptionSensitivity: z.number().min(0).max(1),
});

export type VoiceSettingsInput = z.input<typeof VoiceSettingsSchema>;

/** Sets an agent's voice speed, temperature, volume, emotion and interruption sensitivity in one PATCH. */
export const setRetellVoiceSettings = withRoleAction(
  'USER',
  async (_me, agentId: string, input: VoiceSettingsInput) => {
    const parsed = VoiceSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Check the values.' };
    }
    const v = parsed.data;
    const res = await retell('PATCH', `/update-agent/${agentId}`, {
      voice_speed: v.voiceSpeed,
      voice_temperature: v.voiceTemperature,
      volume: v.volume,
      voice_emotion: v.voiceEmotion,
      interruption_sensitivity: v.interruptionSensitivity,
    });
    if (!res.ok) return { error: res.message };
    revalidatePath('/dashboard/agents');
    return { ok: true as const };
  },
);

const SpeechRecognitionSchema = z.object({
  sttMode: z.enum(STT_MODES),
  // One keyword per entry, already split by the form.
  boostedKeywords: z.array(z.string().trim().min(1).max(100)).max(100),
});

export type SpeechRecognitionInput = z.input<typeof SpeechRecognitionSchema>;

/** Sets how an agent listens: recognition mode and boosted keywords. */
export const setRetellSpeechRecognition = withRoleAction(
  'USER',
  async (_me, agentId: string, input: SpeechRecognitionInput) => {
    const parsed = SpeechRecognitionSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Check the values.' };
    }
    const v = parsed.data;
    const res = await retell('PATCH', `/update-agent/${agentId}`, {
      stt_mode: v.sttMode,
      // null clears the list.
      boosted_keywords: v.boostedKeywords.length ? v.boostedKeywords : null,
    });
    if (!res.ok) return { error: res.message };
    revalidatePath('/dashboard/agents');
    return { ok: true as const };
  },
);

/** Sets the language an agent speaks and listens in. */
export const setRetellLanguage = withRoleAction(
  'USER',
  async (_me, agentId: string, language: string) => {
    const parsed = z.enum(AGENT_LANGUAGES).safeParse(language);
    if (!parsed.success) return { error: 'Unknown language.' };
    const res = await retell('PATCH', `/update-agent/${agentId}`, {
      language: parsed.data,
    });
    if (!res.ok) return { error: res.message };
    revalidatePath('/dashboard/agents');
    return { ok: true as const };
  },
);

/**
 * Assigns a Retell agent to an organization. The link is an Agent row holding
 * the Retell agent's id (unique), so a first assignment creates the row and a
 * later one moves it to the new organization. The agent is set to Active
 * either way, and a new row carries the Retell agent's name.
 */
export const assignRetellAgent = withRoleAction(
  'SUPERUSER',
  async (_me, retellAgentId: string, name: string, organizationId: string) => {
    try {
      const org = await db.orm.public.Organization.where({ id: organizationId })
        .select('id', 'recordCalls', 'dataRetentionDays')
        .first();
      if (!org) return { error: 'That organization no longer exists.' };

      const existing = await db.orm.public.Agent.where({ retellAgentId })
        .select('id')
        .first();
      if (existing) {
        await db.orm.public.Agent.where({ id: existing.id }).update({
          organizationId,
          status: 'ACTIVE',
        });
      } else {
        await db.orm.public.Agent.create({
          organizationId,
          name: name || retellAgentId,
          retellAgentId,
          status: 'ACTIVE',
        });
      }

      // The agent takes on the organization's recording and retention settings.
      // A refusal here doesn't undo the assignment; the next save of those
      // settings pushes them again.
      await retell(
        'PATCH',
        `/update-agent/${retellAgentId}`,
        retellStorageSettings(org),
      ).catch(() => null);
    } catch (error) {
      console.error('Failed to assign Retell agent:', error);
      return { error: 'Could not assign the agent. Please try again.' };
    }
    revalidatePath('/dashboard/agents');
    revalidatePath('/dashboard/organizations');
    return { ok: true as const };
  },
);

/**
 * Sets an agent's status. Superusers only, like the organization pickers; the
 * org page passes its slug so that page is refreshed along with the lists.
 */
export const updateAgentStatus = withRoleAction(
  'SUPERUSER',
  async (_me, agentId: string, slug: string, status: string) => {
    const parsed = z.enum(AGENT_STATUSES).safeParse(status);
    if (!parsed.success) return { error: 'Unknown status.' };
    try {
      await db.orm.public.Agent.where({ id: agentId }).update({
        status: parsed.data,
      });
    } catch (error) {
      console.error('Failed to update agent status:', error);
      return { error: 'Could not update the status. Please try again.' };
    }
    revalidatePath(`/dashboard/organizations/${slug}`);
    revalidatePath('/dashboard/agents');
    return { ok: true as const };
  },
);
