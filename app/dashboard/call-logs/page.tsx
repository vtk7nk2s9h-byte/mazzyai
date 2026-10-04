import { Suspense } from 'react';
import { Metadata } from 'next';

import { currentUser, hasRole } from '@/auth';
import { fetchMyOrganizationId } from '@/app/lib/meeting-data';
import { lusitana } from '@/app/ui/fonts';
import CallLogsTable from '@/app/ui/call-logs/table';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';

export const metadata: Metadata = {
  title: 'Call logs',
};

export default async function Page() {
  // A superuser sees every organization's calls; everyone else only their own.
  // Without this the table read the whole database for any signed-in user.
  const me = await currentUser();
  const isSuperuser = hasRole(me?.role, 'SUPERUSER');
  const organizationId =
    !isSuperuser && me ? await fetchMyOrganizationId(me.id) : null;

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Call logs</h1>
      </div>
      {isSuperuser || organizationId ? (
        <Suspense fallback={<InvoicesTableSkeleton />}>
          <CallLogsTable organizationId={organizationId ?? undefined} />
        </Suspense>
      ) : (
        <p className="mt-6 text-sm text-gray-500">
          Your account isn&apos;t part of an organization yet, so there are no
          calls to show.
        </p>
      )}
    </div>
  );
}
