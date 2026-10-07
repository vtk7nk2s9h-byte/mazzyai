import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { currentUser, hasRole } from '@/auth';
import {
  fetchAgentsOrganizationId,
  fetchAssignedAgent,
  fetchKnowledge,
  fetchRetellAgentFull,
  fetchRetellLlm,
  fetchRetellVoices,
} from '@/app/lib/agent-data';
import { formatDateToLocal } from '@/app/lib/utils';
import AgentConversationEdit from '@/app/ui/agents/agent-conversation-edit';
import AgentVoiceEdit from '@/app/ui/agents/agent-voice-edit';
import Breadcrumbs from '@/app/ui/breadcrumbs';
import { Field, Section, Toggle } from '@/app/ui/organizations/field';
import {
  AgentStatusBadge,
  AssignmentBadge,
  label,
} from '@/app/ui/organizations/status';

export const metadata: Metadata = {
  title: 'Agent',
};

const kindLabel = { TEXT: 'Text', URL: 'URL', FILE: 'File' } as const;

const when = (ms?: number) =>
  ms
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(ms))
    : null;

const seconds = (ms?: number) => (ms == null ? null : `${ms / 1000} s`);
const minutes = (ms?: number) => (ms == null ? null : `${ms / 60_000} min`);

function size(bytes: number | null) {
  if (bytes == null) return null;
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function Page(props: {
  params: Promise<{ id: string }>;
}) {
  const me = await currentUser();
  if (!me) notFound();

  // The id is a Retell agent id, and it goes into a Retell URL path, so only
  // that shape is accepted: anything else could reach a different endpoint.
  const { id } = await props.params;
  if (!/^agent_[A-Za-z0-9]+$/.test(id)) notFound();

  // A superuser may open any agent; an organization admin only the agents
  // assigned to their own organization (their prompt is theirs to see, not
  // another tenant's). notFound() either way, so the two cases look alike.
  const isSuperuser = hasRole(me.role, 'SUPERUSER');
  const assigned = await fetchAssignedAgent(id);
  if (!isSuperuser) {
    const mine = await fetchAgentsOrganizationId(me.id);
    if (!mine || !assigned || assigned.organizationId !== mine) notFound();
  }

  const agent = await fetchRetellAgentFull(id);
  if (!agent) notFound();

  const isLlm = agent.response_engine?.type === 'retell-llm';
  const [llm, assets, voices] = await Promise.all([
    isLlm && agent.response_engine?.llm_id
      ? fetchRetellLlm(agent.response_engine.llm_id)
      : null,
    // What this agent draws on: assets for every agent, and those assigned to it.
    assigned
      ? fetchKnowledge(assigned.organizationId).then((docs) =>
          docs.filter((d) => !d.agentId || d.agentId === assigned.id),
        )
      : [],
    // For the Voice card's picker; without it the card can still keep the
    // agent's current voice.
    fetchRetellVoices().catch(() => []),
  ]);

  const name = agent.agent_name ?? id;
  const language = Array.isArray(agent.language)
    ? agent.language.join(', ')
    : agent.language;

  return (
    <div className="w-full">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Agents', href: '/dashboard/agents' },
          { label: name, href: `/dashboard/agents/${id}`, active: true },
        ]}
      />

      {/* Whose agent this is, before any setting. */}
      <div className="flex flex-col gap-4 rounded-lg bg-gray-50 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 grow">
          <h1 className="truncate text-xl font-medium text-gray-900">{name}</h1>
          <p className="truncate text-sm text-gray-500">
            {assigned ? (
              isSuperuser ? (
                <Link
                  href={`/dashboard/organizations/${assigned.organization?.slug}`}
                  className="rounded transition-colors hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
                >
                  {assigned.organization?.name}
                </Link>
              ) : (
                assigned.organization?.name
              )
            ) : (
              'Not assigned to an organization'
            )}
            {' · '}
            <code className="text-xs">{id}</code>
          </p>
        </div>
        {assigned && <AgentStatusBadge status={assigned.status} />}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section
          title="Voice"
          description="How the agent sounds."
          titleAction={
            <AgentVoiceEdit
              agentId={id}
              agentName={name}
              voices={voices.map((v) => ({
                voice_id: v.voice_id,
                voice_name: v.voice_name,
                provider: v.provider,
                accent: v.accent,
              }))}
              current={{
                voiceId: agent.voice_id ?? '',
                voiceModel: agent.voice_model ?? null,
                speed: agent.voice_speed ?? 1,
                temperature: agent.voice_temperature ?? 1,
                volume: agent.volume ?? 1,
                emotion: agent.voice_emotion ?? null,
                language: Array.isArray(agent.language)
                  ? (agent.language[0] ?? 'en-US')
                  : (agent.language ?? 'en-US'),
              }}
            />
          }
        >
          <Field label="Voice">{agent.voice_id}</Field>
          <Field label="Voice model">{agent.voice_model ?? 'Default'}</Field>
          <Field label="Speed">
            {agent.voice_speed != null && `${agent.voice_speed}×`}
          </Field>
          <Field label="Temperature">{agent.voice_temperature}</Field>
          <Field label="Volume">{agent.volume}</Field>
          <Field label="Emotion">{agent.voice_emotion}</Field>
          <Field label="Language">{language}</Field>
        </Section>

        <Section
          title="Conversation"
          description="How it listens and when it stops."
          titleAction={
            <AgentConversationEdit
              agentId={id}
              agentName={name}
              backchannel={!!agent.enable_backchannel}
              current={{
                responsiveness: agent.responsiveness ?? 1,
                interruption: agent.interruption_sensitivity ?? 1,
                silenceSeconds: Math.round(
                  (agent.end_call_after_silence_ms ?? 600_000) / 1000,
                ),
                maxCallMinutes: Math.round(
                  (agent.max_call_duration_ms ?? 3_600_000) / 60_000,
                ),
                sttMode:
                  agent.stt_mode === 'accurate' || agent.stt_mode === 'custom'
                    ? agent.stt_mode
                    : 'fast',
                keywords: agent.boosted_keywords ?? [],
                ambientSound: agent.ambient_sound ?? null,
                voicemail: !!agent.voicemail_option,
              }}
            />
          }
        >
          <Field label="Responsiveness">{agent.responsiveness}</Field>
          <Field label="Interruption sensitivity">
            {agent.interruption_sensitivity}
          </Field>
          <Field label="Backchannel">
            <Toggle on={!!agent.enable_backchannel} />
          </Field>
          <Field label="Hangs up after silence">
            {seconds(agent.end_call_after_silence_ms)}
          </Field>
          <Field label="Longest call">{minutes(agent.max_call_duration_ms)}</Field>
          <Field label="Voicemail detection">
            <Toggle on={!!agent.voicemail_option} />
          </Field>
          <Field label="Speech recognition">
            <span className="capitalize">{agent.stt_mode}</span>
          </Field>
          <Field label="Boosted keywords">
            {agent.boosted_keywords?.length ? agent.boosted_keywords.join(', ') : null}
          </Field>
          <Field label="Ambient sound">{agent.ambient_sound}</Field>
        </Section>

        <Section title="Data" description="What is kept from each call.">
          <Field label="Storage">
            {agent.data_storage_setting === 'everything'
              ? 'Transcripts, recordings and logs'
              : agent.data_storage_setting === 'basic_attributes_only'
                ? 'Basic attributes only'
                : agent.data_storage_setting}
          </Field>
          <Field label="Retention">
            {agent.data_storage_retention_days != null &&
              `${agent.data_storage_retention_days} days`}
          </Field>
          {isSuperuser && (
            <Field label="Webhook URL">
              {agent.webhook_url && (
                <code className="break-all text-xs">{agent.webhook_url}</code>
              )}
            </Field>
          )}
        </Section>

        <Section title="Agent" description="Where it stands on Retell.">
          <Field label="Engine">
            {agent.response_engine?.type &&
              label(agent.response_engine.type.replace(/-/g, '_'))}
          </Field>
          <Field label="Channel">{agent.channel && label(agent.channel)}</Field>
          <Field label="Version">{agent.version}</Field>
          <Field label="Published">
            <Toggle on={!!agent.is_published} />
          </Field>
          <Field label="Last changed">
            {when(agent.last_modification_timestamp)}
          </Field>
        </Section>
      </div>

      <div className="mt-4 grid gap-4">
        <Section
          title="Prompt"
          description="What the agent is told before every call."
        >
          {llm ? (
            <>
              <Field label="Model">{llm.model}</Field>
              <Field label="Speaks first">
                {llm.start_speaker && label(llm.start_speaker)}
              </Field>
              <Field label="Opening line">{llm.begin_message}</Field>
              <Field label="Tools">
                {llm.general_tools?.length
                  ? llm.general_tools.map((t) => t.name).join(', ')
                  : null}
              </Field>
              <div className="pt-3">
                <p className="mb-1 text-xs text-gray-500">Instructions</p>
                {llm.general_prompt ? (
                  <p className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-white/[0.07] bg-black/20 p-4 text-sm leading-relaxed text-gray-600">
                    {llm.general_prompt}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">No instructions set.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">
              {isLlm
                ? 'The prompt could not be read from Retell.'
                : 'This agent runs on a conversation flow, so it has no single prompt.'}
            </p>
          )}
        </Section>

        <Section
          title="Knowledge base"
          description="The resources this agent can draw on when it answers."
        >
          {!assigned ? (
            <p className="text-sm text-gray-400">
              Assign this agent to an organization to give it knowledge base
              resources.
            </p>
          ) : assets.length === 0 ? (
            <p className="text-sm text-gray-400">
              No resources yet. Add some under Knowledge base and Resources on
              the Agents page.
            </p>
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <table className="min-w-full text-sm text-gray-900">
                <thead className="text-left font-normal">
                  <tr>
                    <th className="px-1 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Applies to</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((d) => (
                    <tr key={d.id} className="border-t border-gray-200">
                      <td className="max-w-[36ch] px-1 py-3">
                        <p className="truncate font-medium">{d.title}</p>
                        {d.sourceUrl && (
                          <p className="truncate text-xs text-gray-500">
                            {d.sourceUrl}
                          </p>
                        )}
                        {size(d.sizeBytes) && (
                          <p className="text-xs text-gray-500">
                            {size(d.sizeBytes)}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {kindLabel[d.sourceType as keyof typeof kindLabel]}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <AssignmentBadge name={d.agentId ? name : null} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {label(d.status)}
                        {d.errorMessage && (
                          <p
                            title={d.errorMessage}
                            className="max-w-[28ch] truncate text-xs text-gray-500"
                          >
                            {d.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {formatDateToLocal(d.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
