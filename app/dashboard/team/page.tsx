import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { currentUser, hasRole } from '@/auth';
import { lusitana } from '@/app/ui/fonts';
import CreateUser from '@/app/ui/team/create-user';
import TeamTable from '@/app/ui/team/table';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';

export const metadata: Metadata = {
  title: 'Team',
};

export default async function Page(props: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;

  // The sidebar only shows this link to superusers, but the route is the thing
  // that has to be closed — notFound() rather than a redirect, so the URL
  // doesn't confirm to anyone else that the page exists.
  const me = await currentUser();
  if (!hasRole(me?.role, 'SUPERUSER')) notFound();

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between gap-3">
        <h1 className={`${lusitana.className} text-2xl`}>Team</h1>
        <CreateUser />
      </div>

      <Suspense fallback={<InvoicesTableSkeleton />}>
        <TeamTable page={page} />
      </Suspense>
    </div>
  );
}
