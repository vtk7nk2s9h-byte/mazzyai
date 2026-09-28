import Link from 'next/link';

import { formatDateToLocal } from '@/app/lib/utils';
import { fetchOrganizationsPage } from '@/app/lib/org-data';
import OrgAvatar from '@/app/ui/organizations/avatar';
import { OrgStatusBadge, PlanBadge } from '@/app/ui/organizations/status';

/**
 * The org name, linking to its page. Plain markup rather than a component:
 * the row is server-rendered end to end now, so the table ships no client JS.
 */
const nameLink =
  'rounded font-medium transition-[color,text-shadow] duration-200 hover:text-brand-red-lit hover:[text-shadow:0_0_12px_rgba(255,46,67,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400';

export default async function OrganizationsTable({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) {
  const organizations = await fetchOrganizationsPage(query, currentPage);

  if (organizations.length === 0) {
    return (
      <div className="mt-6 rounded-lg bg-gray-50 p-10 text-center text-sm text-gray-500">
        {query ? (
          <>
            No organizations match{' '}
            <span className="text-gray-600">“{query}”</span>.
          </>
        ) : (
          <>
            No organizations yet. Run{' '}
            <code className="text-gray-600">pnpm db:seed</code> to add sample
            data.
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 flow-root overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          {/* Stacked cards below md — same rows re-laid-out rather than
              scrolled sideways, as in the call logs table. */}
          <div className="md:hidden">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="mb-2 w-full rounded-md bg-gray-100 p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <OrgAvatar name={org.name} logoUrl={org.logoUrl} />
                      <Link
                        href={`/dashboard/organizations/${org.slug}`}
                        className={nameLink}
                      >
                        {org.name}
                      </Link>
                    </div>
                    <p className="truncate text-sm text-gray-500">
                      {org.industry ?? org.slug}
                    </p>
                  </div>
                  <OrgStatusBadge status={org.status} />
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <div>
                    <p className="text-xl font-medium tabular-nums">
                      {org.agents}
                    </p>
                    <p className="text-sm text-gray-500">
                      {org.agents === 1 ? 'agent' : 'agents'} · {org.memberships}{' '}
                      {org.memberships === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  <PlanBadge plan={org.plan} />
                </div>
              </div>
            ))}
          </div>

          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Organization
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Plan
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Agents
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Members
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Created
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-100">
              {organizations.map((org) => (
                <tr
                  key={org.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      <OrgAvatar name={org.name} logoUrl={org.logoUrl} />
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/organizations/${org.slug}`}
                          className={nameLink}
                        >
                          {org.name}
                        </Link>
                        <p className="max-w-[26ch] truncate text-xs text-gray-500">
                          {org.industry ?? org.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <PlanBadge plan={org.plan} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {org.agents}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {org.memberships}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDateToLocal(org.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <OrgStatusBadge status={org.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
