import { db } from '@/src/prisma/db';

/**
 * Every meeting on one organization's agenda, soonest first. Unbounded on
 * purpose: the calendar pages through time on the client, so it needs the
 * whole set to move between months — fine at an appointment book's size, and
 * the place to add a date window if one ever grows past that.
 */
export async function fetchMeetings(organizationId: string) {
  try {
    return await db.orm.public.Meeting.where({ organizationId })
      .select(
        'id',
        'title',
        'description',
        'attendeeName',
        'location',
        'startsAt',
        'endsAt',
        'allDay',
        'status',
      )
      .orderBy((m) => m.startsAt.asc())
      .all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch meetings.');
  }
}

/**
 * The organization a signed-in user belongs to — their first active
 * membership. Users here have one; a user in several would need a switcher,
 * which this app doesn't have yet.
 */
export async function fetchMyOrganizationId(userId: string) {
  try {
    const membership = await db.orm.public.Membership.where({
      userId,
      status: 'ACTIVE',
    })
      .select('organizationId')
      .first();
    return membership?.organizationId ?? null;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to find the organization.');
  }
}

// Imports the Prisma client, so never pull this into a client component.
export type MeetingRow = Awaited<ReturnType<typeof fetchMeetings>>[number];
