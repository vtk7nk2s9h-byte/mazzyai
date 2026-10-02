import { Suspense } from 'react';
import { Metadata } from 'next';

import { currentUser } from '@/auth';
import { fetchMyOrganizationId } from '@/app/lib/meeting-data';
import { lusitana } from '@/app/ui/fonts';
import Agenda from '@/app/ui/agenda/agenda';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';

export const metadata: Metadata = {
  title: 'Agenda',
};

export default async function Page() {
  const me = await currentUser();
  // The proxy already keeps signed-out visitors off /dashboard, so a missing
  // user here is an edge case, not a flow — it just has no organization.
  const organizationId = me ? await fetchMyOrganizationId(me.id) : null;

  return (
    <div className="w-full">
      <h1 className={`${lusitana.className} mb-4 text-2xl`}>Agenda</h1>
      {organizationId ? (
        <Suspense fallback={<InvoicesTableSkeleton />}>
          <Agenda organizationId={organizationId} />
        </Suspense>
      ) : (
        <p className="text-sm text-gray-500">
          Your account isn&apos;t part of an organization yet, so there is no
          agenda to show.
        </p>
      )}
    </div>
  );
}
