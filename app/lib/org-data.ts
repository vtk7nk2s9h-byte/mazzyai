import { cache } from 'react';

import { db } from '@/src/prisma/db';
import { or } from '@prisma/orm-postgres/orm-client';

/** Rows per page in the superuser Organizations table. */
export const ORGS_PER_PAGE = 10;

/** Rows per page in an organization's call log and invoice tabs. */
export const ORG_ROWS_PER_PAGE = 10;

/**
 * One page of organizations, newest first. Agents and members are reduced to
 * counts — the row only shows the number, and the detail page loads the agents
 * themselves.
 */
export async function fetchOrganizationsPage(
  query: string,
  currentPage: number,
) {
  const term = `%${query}%`;
  try {
    return await db.orm.public.Organization.select(
      'id',
      'name',
      'slug',
      'industry',
      'logoUrl',
      'status',
      'plan',
      'createdAt',
    )
      // Soft-deleted orgs stay in the table for billing and audit history, so
      // they have to be excluded explicitly — Prisma 8 has no soft delete. The
      // count below repeats both clauses, or the two would disagree.
      .where((o) => o.deletedAt.isNull())
      // Matches the three fields the row actually shows, so a hit is always
      // something the reader can see. An empty query makes this '%%', which
      // matches every non-null value — hence the plan/status fallthrough.
      .where((o) =>
        or(o.name.ilike(term), o.slug.ilike(term), o.industry.ilike(term)),
      )
      .include('agents', (a) => a.count())
      .include('memberships', (m) => m.count())
      .orderBy((o) => o.createdAt.desc())
      .limit(ORGS_PER_PAGE)
      .offset((currentPage - 1) * ORGS_PER_PAGE)
      .all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch organizations.');
  }
}

/** How many pages the filtered table spans. */
export async function fetchOrganizationsPages(query: string) {
  const term = `%${query}%`;
  try {
    const { total } = await db.orm.public.Organization.where((o) =>
      o.deletedAt.isNull(),
    )
      .where((o) =>
        or(o.name.ilike(term), o.slug.ilike(term), o.industry.ilike(term)),
      )
      .aggregate((aggregate) => ({ total: aggregate.count() }));
    return Math.ceil(total / ORGS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to count organizations.');
  }
}

/**
 * One organization by slug, with everything its page shows: the profile, the
 * operational and billing settings, and the agents assigned to it. Returns
 * null when the slug matches nothing live, so the page can answer notFound().
 *
 * The slug is the URL key rather than the uuid because this is an admin view
 * and the address should say which tenant it is. It is `@unique` in the
 * contract, so it identifies a row as precisely as the id does.
 *
 * cache()d because the page and its metadata both need the org: React keeps
 * one call per request, so the second reader pays nothing.
 */
export const fetchOrganizationBySlug = cache(async (slug: string) => {
  try {
    return await db.orm.public.Organization.where({ slug })
      .where((o) => o.deletedAt.isNull())
      .include('agents', (agent) =>
        agent
          .select('id', 'name', 'status', 'description', 'updatedAt')
          .orderBy((a) => a.name.asc()),
      )
      .include('memberships', (m) => m.count())
      .first();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch organization.');
  }
});

/**
 * One page of an organization's invoices, newest period first.
 *
 * These are the contract's `Invoice` rows — Stripe-backed and org-scoped — not
 * the Next.js Learn `invoices` table behind /dashboard/invoices, which has a
 * different schema and no tenant at all.
 */
export async function fetchOrgInvoicesPage(
  organizationId: string,
  currentPage: number,
) {
  try {
    return await db.orm.public.Invoice.where({ organizationId })
      .orderBy((i) => i.periodEnd.desc())
      .limit(ORG_ROWS_PER_PAGE)
      .offset((currentPage - 1) * ORG_ROWS_PER_PAGE)
      .all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

/** How many pages one organization's invoice list spans. */
export async function fetchOrgInvoicesPages(organizationId: string) {
  try {
    const { total } = await db.orm.public.Invoice.where({
      organizationId,
    }).aggregate((aggregate) => ({ total: aggregate.count() }));
    return Math.ceil(total / ORG_ROWS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to count invoices.');
  }
}

// Imports the Prisma client, so — like call-data.ts — this module must never be
// pulled into a 'use client' file.
export type OrganizationRow = Awaited<
  ReturnType<typeof fetchOrganizationsPage>
>[number];

export type OrganizationDetail = NonNullable<
  Awaited<ReturnType<typeof fetchOrganizationBySlug>>
>;
