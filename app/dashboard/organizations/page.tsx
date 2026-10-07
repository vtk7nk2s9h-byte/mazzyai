import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { currentUser, hasRole } from '@/auth';
import { lusitana } from '@/app/ui/fonts';
import { fetchOrganizationsPages } from '@/app/lib/org-data';
import CreateOrganization from '@/app/ui/organizations/create-org';
import OrganizationsTable from '@/app/ui/organizations/table';
import Pagination from '@/app/ui/pagination';
import Search from '@/app/ui/search';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';

export const metadata: Metadata = {
  title: 'Organizations',
};

export default async function Page(props: {
  searchParams?: Promise<{ query?: string; page?: string }>;
}) {
  // The sidebar hides this link for everyone else, but the route is the thing
  // that has to be closed — notFound() rather than a redirect, so the URL
  // doesn't confirm to a non-superuser that the page exists.
  const me = await currentUser();
  if (!hasRole(me?.role, 'SUPERUSER')) notFound();

  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const totalPages = await fetchOrganizationsPages(query);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between gap-3">
        <h1 className={`${lusitana.className} text-2xl`}>Organizations</h1>
        <CreateOrganization />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search placeholder="Search organizations..." />
      </div>

      <Suspense key={query + currentPage} fallback={<InvoicesTableSkeleton />}>
        <OrganizationsTable query={query} currentPage={currentPage} />
      </Suspense>

      <div className="mt-5 flex w-full justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
