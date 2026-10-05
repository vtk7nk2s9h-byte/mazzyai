import Link from 'next/link';

import {
  fetchAgents,
  fetchRetellAgentDetail,
  fetchAssignableOrganizations,
  fetchRetellAgents,
  fetchRetellAssignments,
  fetchRetellVoices,
  type RetellAgentDetail,
} from '@/app/lib/agent-data';
import { voiceModelsFor } from '@/app/lib/retell-options';
import Pagination from '@/app/ui/invoices/pagination';
import AgentNameEdit from '@/app/ui/agents/agent-name-edit';
import AssignAgent from '@/app/ui/agents/assign-agent';
import LanguageSelect from '@/app/ui/agents/language-select';
import VoiceModelEdit from '@/app/ui/agents/voice-model-edit';
import VoicemailSwitch from '@/app/ui/agents/voicemail-switch';
import { formatDateToLocal, paginate } from '@/app/lib/utils';
import {
  AgentStatusBadge,
  AgentStatusDot,
  ConnectionBadge,
} from '@/app/ui/organizations/status';

// Same link look as the organizations table, so a name that goes somewhere
// reads the same on every page.
const orgLink =
  'rounded transition-[color,text-shadow] duration-200 hover:text-brand-red-lit hover:[text-shadow:0_0_12px_rgba(255,46,67,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400';

/** The owning organization as a link — or a dash, if the join came back empty. */
function OrgCell({
  organization,
  className,
}: {
  organization: { name: string; slug: string } | null;
  className?: string;
}) {
  if (!organization) return <span className="text-gray-400">—</span>;
  return (
    <Link
      href={`/dashboard/organizations/${organization.slug}`}
      className={`${orgLink} ${className ?? ''}`}
    >
      {organization.name}
    </Link>
  );
}

const dash = <span className="text-gray-400">—</span>;

/** "11:16 PM" — the time of day, for under a date. */
const timeOf = (value: string | number) =>
  new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(new Date(value));

/**
 * Live from the Retell account. A failure (bad key, Retell down) shows inline
 * rather than taking the page down with it.
 */
export async function RetellAgentsTable({
  page = 1,
  hideAssign = false,
  organizationId,
}: {
  page?: number;
  /** Drops the assign control, for viewers who may edit agents but not move them. */
  hideAssign?: boolean;
  /** The viewer's own organization: they may open only its agents' pages. */
  organizationId?: string;
}) {
  let agents;
  try {
    agents = await fetchRetellAgents();
  } catch (error) {
    return (
      <div className="mt-6 rounded-lg bg-gray-50 p-6 text-sm text-red-600">
        {error instanceof Error ? error.message : 'Could not reach Retell.'}
      </div>
    );
  }

  // Page before the per-agent lookups, so only this page's rows are fetched.
  const paged = paginate(agents, page);
  agents = paged.rows;
  const totalPages = paged.totalPages;

  // The list endpoint only returns names; the settings come from one get-agent
  // each. A row whose lookup fails shows dashes instead of failing the table.
  const [details, voices, assignments, organizations] = await Promise.all([
    Promise.all(
      agents.map((a) => fetchRetellAgentDetail(a.agent_id).catch(() => null)),
    ),
    // Only used to offer the models that fit each agent's voice provider.
    fetchRetellVoices().catch(() => []),
    // Without the database the table still lists agents, just unassigned.
    fetchRetellAssignments().catch(() => new Map()),
    fetchAssignableOrganizations().catch(() => []),
  ]);
  const providerOf = new Map(voices.map((v) => [v.voice_id, v.provider]));

  if (agents.length === 0) {
    return (
      <div className="mt-6 rounded-lg bg-gray-50 p-10 text-center text-sm text-gray-500">
        No agents on this Retell account.
      </div>
    );
  }

  return (
    <>
    <div className="mt-6 flow-root overflow-x-auto pb-16">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 border border-white/[0.12] shadow-sm">
          <table className="min-w-full text-sm text-gray-900 ">
            <thead className="text-left font-normal">
              <tr>
                <th className="px-4 py-4 font-medium">Name</th>
                <th className="px-3 py-4 font-medium">Voice model</th>
                <th className="px-3 py-4 font-medium">Voicemail</th>
                <th className="px-3 py-4 font-medium">Last updated</th>
                <th className="px-3 py-4 font-medium">Created</th>
                <th className="px-3 py-4 font-medium">Language</th>
              </tr>
            </thead>
            <tbody className="bg-gray-100">
              {agents.map((a, i) => {
                const d = details[i];
                // The same viewers who get the link get the pencil.
                const canOpen =
                  !hideAssign ||
                  (!!organizationId &&
                    assignments.get(a.agent_id)?.id === organizationId);
                return (
                <tr
                  key={a.agent_id}
                  className="border-b last-of-type:border-none"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {assignments.get(a.agent_id) && (
                        <AgentStatusDot
                          status={assignments.get(a.agent_id)!.status}
                        />
                      )}
                      {canOpen ? (
                        <Link
                          href={`/dashboard/agents/${a.agent_id}`}
                          className={orgLink}
                        >
                          {a.agent_name ?? a.agent_id}
                        </Link>
                      ) : (
                        (a.agent_name ?? '—')
                      )}
                      {canOpen && (
                        <AgentNameEdit
                          agentId={a.agent_id}
                          name={a.agent_name ?? a.agent_id}
                        />
                      )}
                    </span>
                    {!hideAssign && (
                      <AssignAgent
                        retellAgentId={a.agent_id}
                        agentName={a.agent_name ?? a.agent_id}
                        assignedOrgId={assignments.get(a.agent_id)?.id ?? null}
                        organizations={organizations}
                      />
                    )}
                    {assignments.get(a.agent_id) && (
                      <p className="text-xs font-normal text-gray-500">
                        {assignments.get(a.agent_id)?.name}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {d ? (
                      <>
                        {d.voice_model ?? 'Default'}
                        <VoiceModelEdit
                          agentId={a.agent_id}
                          agentName={a.agent_name ?? a.agent_id}
                          current={d.voice_model ?? null}
                          options={voiceModelsFor(providerOf.get(d.voice_id))}
                        />
                      </>
                    ) : (
                      dash
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {d ? (
                      <VoicemailSwitch
                        agentId={a.agent_id}
                        enabled={!!d.voicemail_option}
                      />
                    ) : (
                      dash
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {d?.last_modification_timestamp ? (
                      <div>
                        {formatDateToLocal(
                          new Date(d.last_modification_timestamp).toISOString(),
                        )}
                        <p className="text-xs text-gray-500">
                          {timeOf(d.last_modification_timestamp)}
                        </p>
                      </div>
                    ) : (
                      dash
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {assignments.get(a.agent_id)?.createdAt ? (
                      <div title="When it was added to MazzyAI">
                        {formatDateToLocal(assignments.get(a.agent_id)!.createdAt)}
                        <p className="text-xs text-gray-500">
                          {timeOf(assignments.get(a.agent_id)!.createdAt)}
                        </p>
                      </div>
                    ) : (
                      dash
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {d ? (
                      <LanguageSelect
                        agentId={a.agent_id}
                        language={d.language ?? 'en-US'}
                      />
                    ) : (
                      dash
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
      {totalPages > 1 && (
        <div className="mt-5 flex w-full justify-center">
          <Pagination totalPages={totalPages} param="retell" />
        </div>
      )}
    </>
  );
}

/**
 * Every agent in the system: which organization owns it, whether it is
 * published, whether it is linked to its Retell voice agent, and how much it is
 * used. Server-rendered end to end, laid out like the Team table — stacked
 * cards below md, a table from md up.
 */
export default async function AgentsTable({
  page = 1,
  organizationId,
}: {
  page?: number;
  /** Limits the table to one organization and drops the Organization column. */
  organizationId?: string;
}) {
  const showOrg = !organizationId;
  const { rows: agents, totalPages } = paginate(
    await fetchAgents(organizationId),
    page,
  );

  if (agents.length === 0) {
    return (
      <div className="mt-6 rounded-lg bg-gray-50 p-10 text-center text-sm text-gray-500">
        No agents yet. Run <code className="text-gray-600">pnpm db:seed</code>{' '}
        to add sample data.
      </div>
    );
  }

  return (
    <>
    <div className="mt-6 flow-root overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="mb-2 w-full rounded-md bg-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-3 border-b pb-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{agent.name}</p>
                    {showOrg && (
                      <OrgCell
                        organization={agent.organization}
                        className="block truncate text-sm text-gray-500"
                      />
                    )}
                  </div>
                  <AgentStatusBadge status={agent.status} />
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <p className="text-sm text-gray-500">
                    {agent.phoneNumbers}{' '}
                    {agent.phoneNumbers === 1 ? 'number' : 'numbers'} ·{' '}
                    {agent.calls} {agent.calls === 1 ? 'call' : 'calls'}
                  </p>
                  <ConnectionBadge connected={!!agent.retellAgentId} />
                </div>
              </div>
            ))}
          </div>

          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Agent
                </th>
                {showOrg && (
                  <th scope="col" className="px-3 py-5 font-medium">
                    Organization
                  </th>
                )}
                <th scope="col" className="px-3 py-5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Retell
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Numbers
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Calls
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-100">
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <p className="inline-flex items-center gap-2 font-medium">
                      <AgentStatusDot status={agent.status} />
                      {agent.retellAgentId ? (
                        <Link
                          href={`/dashboard/agents/${agent.retellAgentId}`}
                          className={orgLink}
                        >
                          {agent.name}
                        </Link>
                      ) : (
                        agent.name
                      )}
                    </p>
                    {agent.description && (
                      <p className="max-w-[32ch] truncate text-xs text-gray-500">
                        {agent.description}
                      </p>
                    )}
                  </td>
                  {showOrg && (
                    <td className="whitespace-nowrap px-3 py-3">
                      <OrgCell organization={agent.organization} />
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-3">
                    <AgentStatusBadge status={agent.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <ConnectionBadge connected={!!agent.retellAgentId} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {agent.phoneNumbers}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {agent.calls}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDateToLocal(agent.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
      {totalPages > 1 && (
        <div className="mt-5 flex w-full justify-center">
          <Pagination totalPages={totalPages} param="agents" />
        </div>
      )}
    </>
  );
}
