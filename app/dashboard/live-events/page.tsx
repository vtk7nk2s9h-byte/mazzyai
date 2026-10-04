import { Suspense } from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { currentUser, hasRole } from '@/auth';
import { fetchAgentsOrganizationId } from '@/app/lib/agent-data';
import { lusitana } from '@/app/ui/fonts';
import AutoRefresh from '@/app/ui/live-events/auto-refresh';
import ConnectionStatus from '@/app/ui/live-events/connection-status';
import LiveEventsFeed from '@/app/ui/live-events/feed';
import NetworkHeader from '@/app/ui/live-events/network-header';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';

export const metadata: Metadata = {
  title: 'Live Events',
};

const filters = [
  { label: 'All', type: undefined },
  { label: 'Calls', type: 'call' },
  { label: 'Meetings', type: 'meeting' },
  { label: 'Emails', type: 'email' },
] as const;

export default async function Page(props: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const { type } = (await props.searchParams) ?? {};
  const kind =
    type === 'call' || type === 'meeting' || type === 'email'
      ? type
      : undefined;

  // Closed at the route, not only in the sidebar: notFound() rather than a
  // redirect, so the URL doesn't confirm the page exists to anyone else.
  const me = await currentUser();
  if (!me) notFound();

  // A superuser sees every organization's events; an organization admin only
  // their own.
  const isSuperuser = hasRole(me.role, 'SUPERUSER');
  let organizationId: string | undefined;
  if (!isSuperuser) {
    organizationId = (await fetchAgentsOrganizationId(me.id)) ?? undefined;
    if (!organizationId) notFound();
  }

  return (
    <div className="w-full">
      <h1 className={`${lusitana.className} mb-2 text-2xl`}>Live Events</h1>
      {/* Its own boundary: the Retell check can take a few seconds when Retell
          is slow, and must not hold the feed back. */}
      <Suspense
        fallback={
          <p className="mb-4 text-xs text-gray-500">
            Checking connection…
          </p>
        }
      >
        <ConnectionStatus showTunnel={isSuperuser} />
      </Suspense>
      <NetworkHeader />
      <AutoRefresh />
      {/* The task filter: each is a link, so the choice lives in the URL and
          survives the auto-refresh. */}
      <nav aria-label="Filter events" className="mt-6 flex gap-2">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.type ? `?type=${f.type}` : '?'}
            aria-current={f.type === kind ? 'page' : undefined}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit ${
              f.type === kind
                ? 'border-brand-red-lit/50 bg-maroon-500/30 text-white'
                : 'border-white/[0.12] text-gray-500 hover:border-brand-red-lit/50 hover:text-brand-red-lit'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <Suspense fallback={<InvoicesTableSkeleton />}>
        <LiveEventsFeed organizationId={organizationId} kind={kind} />
      </Suspense>
    </div>
  );
}
