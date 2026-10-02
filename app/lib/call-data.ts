import { PAGE_SIZE } from '@/app/lib/utils';
import { db } from '@/src/prisma/db';

/** Rows per page when the call log is paginated (the organization tables). */
export const CALLS_PER_PAGE = PAGE_SIZE;

/**
 * Calls, newest first, with the agent that handled each one.
 *
 * Unfiltered and unpaginated by default — that is what the global call logs
 * view shows. Pass `organizationId` to scope the list to one tenant and
 * `currentPage` to page through it, which is how the organization page reads
 * its own calls.
 */
export async function fetchCalls({
  organizationId,
  currentPage,
}: {
  organizationId?: string;
  currentPage?: number;
} = {}) {
  try {
    let calls = db.orm.public.Call.include('agent', (agent) =>
      agent.select('name'),
    ).orderBy((f) => f.startedAt.desc());

    if (organizationId) {
      calls = calls.where({ organizationId });
    }
    if (currentPage) {
      calls = calls
        .limit(CALLS_PER_PAGE)
        .offset((currentPage - 1) * CALLS_PER_PAGE);
    }

    return await calls.all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch calls.');
  }
}

/** How many pages one organization's call log spans. */
export async function fetchCallPages(organizationId: string) {
  try {
    const { total } = await db.orm.public.Call.where({
      organizationId,
    }).aggregate((aggregate) => ({ total: aggregate.count() }));
    return Math.ceil(total / CALLS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to count calls.');
  }
}

// This module imports the Prisma client, so it must never be pulled into a
// client component. The presentational helpers live in @/app/lib/utils.
export type CallRow = Awaited<ReturnType<typeof fetchCalls>>[number];
