import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { currentUser, hasRole } from '@/auth';
import { lusitana } from '@/app/ui/fonts';
import {
  fetchAgentsOrganizationId,
  fetchRetellVoices,
} from '@/app/lib/agent-data';
import CreateAgent from '@/app/ui/agents/create-agent';
import AgentsTable, { RetellAgentsTable } from '@/app/ui/agents/table';
import KnowledgeForm from '@/app/ui/agents/knowledge-form';
import KnowledgeList from '@/app/ui/agents/knowledge-list';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';

export const metadata: Metadata = {
  title: 'Agents',
};

/** Fetches the voice list on its own, so a slow Retell never holds up the page. */
async function CreateAgentButton() {
  const voices = await fetchRetellVoices().catch(() => []);
  return <CreateAgent voices={voices} />;
}

export default async function Page(props: {
  searchParams?: Promise<{ agents?: string; retell?: string }>;
}) {
  const searchParams = await props.searchParams;
  const agentsPage = Number(searchParams?.agents) || 1;
  const retellPage = Number(searchParams?.retell) || 1;

  // The sidebar only shows this link to superusers and organization admins,
  // but the route is the thing that has to be closed — notFound() rather than
  // a redirect, so the URL doesn't confirm to anyone else that the page exists.
  const me = await currentUser();
  if (!me) notFound();

  if (!hasRole(me.role, 'SUPERUSER')) {
    // An organization admin gets the same Retell table, without the assign
    // control.
    const organizationId = await fetchAgentsOrganizationId(me.id);
    if (!organizationId) notFound();
    return (
      <div className="w-full">
        <h1 className={`${lusitana.className} text-2xl`}>Agents</h1>
        <Suspense fallback={<InvoicesTableSkeleton />}>
          <RetellAgentsTable
            page={retellPage}
            hideAssign
            organizationId={organizationId}
          />
        </Suspense>

        <h2 className={`${lusitana.className} mt-10 text-xl`}>
          Knowledge base and Resources
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          What your voice agents can draw on when they answer.{' '}
          <span className="font-semibold text-[#ff6b78]">Tip!</span> It is
          recommended to delete the resources and add a new one to avoid
          confusion.
        </p>
        {/* What is already there first, then the three ways to add more. */}
        <Suspense fallback={<InvoicesTableSkeleton />}>
          <KnowledgeList organizationId={organizationId} />
        </Suspense>
        <KnowledgeForm />
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className={`${lusitana.className} text-2xl`}>Agents</h1>

      <Suspense fallback={<InvoicesTableSkeleton />}>
        <AgentsTable page={agentsPage} />
      </Suspense>

      <div className="mt-10 flex items-center justify-between gap-3">
        <h2 className={`${lusitana.className} text-xl`}>Retell agents</h2>
        <Suspense>
          <CreateAgentButton />
        </Suspense>
      </div>
      <Suspense fallback={<InvoicesTableSkeleton />}>
        <RetellAgentsTable page={retellPage} />
      </Suspense>
    </div>
  );
}
