import { Suspense } from 'react';

import { currentUser, hasRole } from '@/auth';
import { fetchAgentsOrganizationId } from '@/app/lib/agent-data';
import { fetchMyOrganizationId } from '@/app/lib/meeting-data';
import { fetchOrganizationName } from '@/app/lib/org-data';
import CardWrapper from '@/app/ui/dashboard/cards';
import { lusitana } from '@/app/ui/fonts';
import { CardsSkeleton } from '@/app/ui/skeletons';

export default async function Page() {
  // Same scoping as the call logs: a superuser sees every organization's
  // numbers, everyone else only their own.
  const me = await currentUser();
  const isSuperuser = hasRole(me?.role, 'SUPERUSER');
  const organizationId =
    !isSuperuser && me ? await fetchMyOrganizationId(me.id) : null;
  // The Agents page is closed to plain members (it would 404), so the card
  // only links there for a superuser or an organization's owner/admin.
  const canOpenAgents =
    isSuperuser ||
    (me ? (await fetchAgentsOrganizationId(me.id)) !== null : false);

  // Who the page greets: the member's own organization. A superuser has none —
  // they run every organization from here — so they are greeted as the
  // platform itself.
  const greetee =
    (organizationId ? await fetchOrganizationName(organizationId) : null) ??
    'MazzyAI';

  return (
    <main>
      <h1 className={`${lusitana.className} page-heading mb-6`}>
        Greetings {greetee}
      </h1>
      {isSuperuser || organizationId ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Suspense fallback={<CardsSkeleton />}>
            <CardWrapper
              organizationId={organizationId ?? undefined}
              canOpenAgents={canOpenAgents}
            />
          </Suspense>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Your account isn&apos;t part of an organization yet, so there&apos;s
          nothing to show here.
        </p>
      )}
    </main>
  );
}
