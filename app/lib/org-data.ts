import { cache } from 'react';

import { PAGE_SIZE } from '@/app/lib/utils';
import { db } from '@/src/prisma/db';
import { or } from '@prisma/orm-postgres/orm-client';

/** Rows per page in the superuser Organizations table. */
export const ORGS_PER_PAGE = PAGE_SIZE;

/** Rows per page in an organization's call log and invoice tabs. */
export const ORG_ROWS_PER_PAGE = PAGE_SIZE;

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

/**
 * The dashboard home's four numbers, for one organization or — with no id, for
 * a superuser — across all of them. "This month" is the calendar month in UTC.
 */
export async function fetchOverviewStats(organizationId?: string) {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const scope = organizationId ? { organizationId } : {};

  try {
    const [calls, agents, contacts, meetings] = await Promise.all([
      db.orm.public.Call.where(scope)
        .where((c) => c.createdAt.gte(monthStart))
        .aggregate((a) => ({ total: a.count() })),
      db.orm.public.Agent.where(scope).aggregate((a) => ({ total: a.count() })),
      db.orm.public.Contact.where(scope).aggregate((a) => ({
        total: a.count(),
      })),
      db.orm.public.Meeting.where({ ...scope, status: 'SCHEDULED' })
        .where((m) => m.startsAt.gte(now.toISOString()))
        .aggregate((a) => ({ total: a.count() })),
    ]);
    return {
      callsThisMonth: calls.total,
      agents: agents.total,
      contacts: contacts.total,
      upcomingMeetings: meetings.total,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the overview.');
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

/** The IANA zone if it is one, else UTC, so a bad value can't break the page. */
function validTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * What an organization has spent today against its daily budget, and whether
 * that has used it up. "Today" is the organization's own calendar day, so the
 * spend resets at its midnight and the pause lifts by itself.
 *
 * "Paused" is worked out here from the calls rather than stored, so it can't go
 * stale: raising the budget or a new day clears it with no job to run. Nothing
 * in this app answers calls (Retell does), so this is the one place that
 * decides whether service is paused. Whatever acts on it should ask here.
 */
export async function fetchBudgetState(
  organizationId: string,
  timeZone: string,
  budgetCents: number | null,
) {
  if (budgetCents === null) {
    return { spentCents: 0, paused: false };
  }
  const zone = validTimeZone(timeZone);
  const dayOf = (iso: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(new Date(iso));
  const today = dayOf(new Date().toISOString());
  // Two days back covers any timezone's "today"; the exact cut is made below.
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  try {
    const calls = await db.orm.public.Call.where({ organizationId })
      .where((c) => c.startedAt.gte(since))
      .select('costCents', 'startedAt')
      .all();
    const spentCents = calls
      .filter((c) => c.startedAt && dayOf(c.startedAt) === today)
      .reduce((sum, c) => sum + (c.costCents ?? 0), 0);
    return { spentCents, paused: spentCents >= budgetCents };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error("Failed to fetch the organization's spend.");
  }
}

/** Minutes every organization gets each month. */
export const MONTHLY_MINUTES = 500;

/**
 * How many organizations a minutes chart covers: one, or all of them when no
 * id is given. The allowance is MONTHLY_MINUTES each.
 */
export async function fetchOrganizationCount(organizationId?: string) {
  try {
    let orgs = db.orm.public.Organization;
    if (organizationId) orgs = orgs.where({ id: organizationId });
    const { total } = await orgs.aggregate((a) => ({ total: a.count() }));
    return total;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to count organizations.');
  }
}
