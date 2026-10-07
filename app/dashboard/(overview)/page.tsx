import { Suspense } from 'react';

import { currentUser, hasRole } from '@/auth';
import { fetchMyOrganizationId } from '@/app/lib/meeting-data';
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

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Dashboard
      </h1>
      {isSuperuser || organizationId ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Suspense fallback={<CardsSkeleton />}>
            <CardWrapper organizationId={organizationId ?? undefined} />
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
