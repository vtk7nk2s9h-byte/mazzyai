import { Suspense } from 'react';
import { Metadata } from 'next';

import { currentUser } from '@/auth';
import { fetchAgentsOrganizationId } from '@/app/lib/agent-data';
import { fetchMyOrganizationId } from '@/app/lib/meeting-data';
import { fetchOrgInvoicesPages } from '@/app/lib/org-data';
import Billing from '@/app/ui/billing/billing';
import { lusitana } from '@/app/ui/fonts';
import OrgInvoicesTable from '@/app/ui/organizations/invoices-table';
import Pagination from '@/app/ui/pagination';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';

export const metadata: Metadata = {
  title: 'Invoices',
};

export default async function Page(props: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;

  // Every member sees their organization's invoices; payment information and
  // the subscription are for its owners and admins only.
  const me = await currentUser();
  const [organizationId, billingOrganizationId] = me
    ? await Promise.all([
        fetchMyOrganizationId(me.id),
        fetchAgentsOrganizationId(me.id),
      ])
    : [null, null];

  return (
    <div className="w-full">
      <h1 className={`${lusitana.className} text-2xl`}>Invoices</h1>
      {organizationId ? (
        <Suspense key={currentPage} fallback={<InvoicesTableSkeleton />}>
          <InvoiceList
            organizationId={organizationId}
            currentPage={currentPage}
          />
        </Suspense>
      ) : (
        <p className="mt-6 text-sm text-gray-500">
          Your account isn&apos;t part of an organization yet, so there are no
          invoices to show. Each organization&apos;s invoices are on its page
          under Organizations.
        </p>
      )}
      {billingOrganizationId && (
        <Suspense fallback={<InvoicesTableSkeleton />}>
          <Billing organizationId={billingOrganizationId} />
        </Suspense>
      )}
    </div>
  );
}

async function InvoiceList({
  organizationId,
  currentPage,
}: {
  organizationId: string;
  currentPage: number;
}) {
  const totalPages = await fetchOrgInvoicesPages(organizationId);
  return (
    <>
      <OrgInvoicesTable
        organizationId={organizationId}
        currentPage={currentPage}
      />
      {totalPages > 1 && (
        <div className="mt-5 flex w-full justify-center">
          <Pagination totalPages={totalPages} />
        </div>
      )}
    </>
  );
}
