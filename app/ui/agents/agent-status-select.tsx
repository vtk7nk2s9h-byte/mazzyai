'use client';

import { updateAgentStatus } from '@/app/lib/retell-actions';
import { AGENT_STATUSES } from '@/app/lib/utils';
import BadgeSelect from '@/app/ui/badge-select';
import { AgentStatusBadge } from '@/app/ui/organizations/status';

/** An agent's status as a picker: the one the org status and team role use. */
export default function AgentStatusSelect({
  agentId,
  slug,
  status,
}: {
  agentId: string;
  slug: string;
  status: string;
}) {
  return (
    <BadgeSelect
      value={status}
      options={AGENT_STATUSES}
      noun="Status"
      ariaLabel="Change agent status"
      badge={<AgentStatusBadge status={status} />}
      save={(next) => updateAgentStatus(agentId, slug, next)}
    />
  );
}
