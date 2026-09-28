import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { currentUser, hasRole } from '@/auth';
import { fetchCallPages } from '@/app/lib/call-data';
import {
  fetchOrganizationBySlug,
  fetchOrgInvoicesPages,
} from '@/app/lib/org-data';
import { formatCurrency, formatDateToLocal } from '@/app/lib/utils';
import { lusitana } from '@/app/ui/fonts';
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import Pagination from '@/app/ui/invoices/pagination';
import CallLogsTable from '@/app/ui/call-logs/table';
import OrgAvatar from '@/app/ui/organizations/avatar';
import OrgInvoicesTable from '@/app/ui/organizations/invoices-table';
import { Field, Section, Toggle } from '@/app/ui/organizations/field';
import {
  AgentStatusBadge,
  OrgStatusBadge,
  PlanBadge,
} from '@/app/ui/organizations/status';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const org = await fetchOrganizationBySlug(slug);
  return { title: org ? org.name : 'Organization' };
}

export default async function Page(props: {
  params: Promise<{ slug: string }>;
  // Each table owns its own param, so paging the calls doesn't reset the
  // invoices and vice versa.
  searchParams?: Promise<{ calls?: string; invoices?: string }>;
}) {
  // Checked here rather than in a layout: layouts don't re-render on client
  // navigations and don't control whether the segment renders, so a layout
  // guard would leave this page reachable on its own.
  const me = await currentUser();
  if (!hasRole(me?.role, 'SUPERUSER')) notFound();

  const { slug } = await props.params;
  const org = await fetchOrganizationBySlug(slug);
  if (!org) notFound();

  const searchParams = await props.searchParams;
  const callsPage = Number(searchParams?.calls) || 1;
  const invoicesPage = Number(searchParams?.invoices) || 1;

  return (
    <div className="w-full">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Organizations', href: '/dashboard/organizations' },
          {
            label: org.name,
            href: `/dashboard/organizations/${org.slug}`,
            active: true,
          },
        ]}
      />

      {/* Profile header — who this tenant is, before any setting. */}
      <div className="flex flex-col gap-4 rounded-lg bg-gray-50 p-5 sm:flex-row sm:items-center">
        <OrgAvatar name={org.name} logoUrl={org.logoUrl} size="lg" />
        <div className="min-w-0 grow">
          <h1 className="truncate text-xl font-medium text-gray-900">
            {org.name}
          </h1>
          <p className="truncate text-sm text-gray-500">
            {org.slug}
            {org.industry && ` · ${org.industry}`}
          </p>
          {org.description && (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
              {org.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PlanBadge plan={org.plan} />
          <OrgStatusBadge status={org.status} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Profile" description="How the tenant identifies itself.">
          <Field label="Name">{org.name}</Field>
          <Field label="Slug">{org.slug}</Field>
          <Field label="Industry">{org.industry}</Field>
          <Field label="Website">
            {org.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noreferrer"
                className="rounded transition-colors hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
              >
                {org.website}
              </a>
            )}
          </Field>
          <Field label="Timezone">{org.timezone}</Field>
          <Field label="Language">{org.language}</Field>
          <Field label="Created">{formatDateToLocal(org.createdAt)}</Field>
          <Field label="Last updated">{formatDateToLocal(org.updatedAt)}</Field>
        </Section>

        <Section
          title="Call handling"
          description="Applies to every agent in this organization."
        >
          <Field label="Record calls">
            <Toggle on={org.recordCalls} />
          </Field>
          <Field label="Transfer to a human">
            <Toggle on={org.allowHumanTransfer} />
          </Field>
          <Field label="Data retention">{org.dataRetentionDays} days</Field>
          <Field label="Daily budget">
            {org.dailyBudgetCents === null
              ? 'Uncapped'
              : formatCurrency(org.dailyBudgetCents)}
          </Field>
          <Field label="Notification email">{org.notificationEmail}</Field>
        </Section>

        <Section
          title="Billing"
          description="Shortcuts kept on the org; Stripe remains the source of truth."
        >
          <Field label="Plan">
            <PlanBadge plan={org.plan} />
          </Field>
          <Field label="Status">
            <OrgStatusBadge status={org.status} />
          </Field>
          <Field label="Trial ends">
            {org.trialEndsAt && formatDateToLocal(org.trialEndsAt)}
          </Field>
          <Field label="Billing email">{org.billingEmail}</Field>
          <Field label="Stripe customer">
            {org.stripeCustomerId && (
              <code className="text-xs">{org.stripeCustomerId}</code>
            )}
          </Field>
          <Field label="Minutes used">
            <span className="tabular-nums">
              {org.minutesUsedRecord} / {org.minutesIncluded}
            </span>
          </Field>
          <Field label="Members">
            <span className="tabular-nums">{org.memberships}</span>
          </Field>
        </Section>

        <Section
          title="Agents"
          description={`${org.agents.length === 1 ? '1 agent' : `${org.agents.length} agents`} assigned to this organization.`}
        >
          {org.agents.length === 0 ? (
            <p className="py-2.5 text-sm text-gray-500">
              No agents assigned yet.
            </p>
          ) : (
            org.agents.map((agent) => (
              <Field key={agent.id} label={agent.name}>
                <div className="flex flex-col items-end gap-1">
                  <AgentStatusBadge status={agent.status} />
                  {agent.description && (
                    <span className="max-w-prose text-xs leading-relaxed text-gray-500">
                      {agent.description}
                    </span>
                  )}
                </div>
              </Field>
            ))
          )}
        </Section>
      </div>

      {/* Call logs and invoices, scoped to this tenant. A superuser reads them
          here rather than from the sidebar — see app/ui/dashboard/nav-links.
          Each table streams behind its own boundary, so a slow one doesn't
          hold up the other or the settings above. */}
      <h2 className={`${lusitana.className} mt-10 text-xl`}>Call logs</h2>
      <Suspense key={`calls-${callsPage}`} fallback={<InvoicesTableSkeleton />}>
        <CallLogsSection organizationId={org.id} currentPage={callsPage} />
      </Suspense>

      <h2 className={`${lusitana.className} mt-10 text-xl`}>Invoices</h2>
      <Suspense
        key={`invoices-${invoicesPage}`}
        fallback={<InvoicesTableSkeleton />}
      >
        <InvoicesSection organizationId={org.id} currentPage={invoicesPage} />
      </Suspense>
    </div>
  );
}

/**
 * Each section owns its table *and* its page count, so both queries sit behind
 * the same boundary. Counting in the page body instead would hold the settings
 * above behind a query they don't need.
 */
async function CallLogsSection({
  organizationId,
  currentPage,
}: {
  organizationId: string;
  currentPage: number;
}) {
  const totalPages = await fetchCallPages(organizationId);
  return (
    <>
      <CallLogsTable organizationId={organizationId} currentPage={currentPage} />
      {totalPages > 1 && (
        <div className="mt-5 flex w-full justify-center">
          <Pagination totalPages={totalPages} param="calls" />
        </div>
      )}
    </>
  );
}

async function InvoicesSection({
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
          <Pagination totalPages={totalPages} param="invoices" />
        </div>
      )}
    </>
  );
}
