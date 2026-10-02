'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { currentUser, hasRole } from '@/auth';
import { fetchMyOrganizationId } from '@/app/lib/meeting-data';
import { db } from '@/src/prisma/db';

const MeetingSchema = z
  .object({
    title: z.string().trim().min(1, 'Give the meeting a title.').max(120),
    startsAt: z.string().datetime({ message: 'Pick a start time.' }),
    endsAt: z.string().datetime({ message: 'Pick an end time.' }),
    allDay: z.boolean(),
    attendeeName: z.string().trim().max(120),
    location: z.string().trim().max(120),
    description: z.string().trim().max(2000),
  })
  .refine((m) => Date.parse(m.endsAt) > Date.parse(m.startsAt), {
    message: 'The meeting has to end after it starts.',
    path: ['endsAt'],
  });

export type CreateMeetingInput = z.input<typeof MeetingSchema>;

/**
 * Adds a meeting to an organization's agenda. Allowed for a member of that
 * organization, and for a superuser (who reads any tenant's agenda from its
 * profile). Checked here, not just on the page: a server action is a public
 * endpoint, and `organizationId` comes from the client.
 */
export async function createMeeting(
  organizationId: string,
  input: CreateMeetingInput,
): Promise<{ ok: true } | { error: string }> {
  const me = await currentUser();
  if (!me) return { error: 'You must be signed in.' };
  const allowed =
    hasRole(me.role, 'SUPERUSER') ||
    (await fetchMyOrganizationId(me.id)) === organizationId;
  if (!allowed) return { error: 'You do not have permission to do that.' };

  const parsed = MeetingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the fields.' };
  }
  const { attendeeName, location, description, ...rest } = parsed.data;

  try {
    await db.orm.public.Meeting.create({
      ...rest,
      organizationId,
      // Empty fields are stored as NULL, not '', so "no location" is one thing.
      attendeeName: attendeeName || null,
      location: location || null,
      description: description || null,
    });
  } catch (error) {
    console.error('Failed to create meeting:', error);
    return { error: 'Could not create the meeting. Please try again.' };
  }

  revalidatePath('/dashboard/agenda');
  revalidatePath('/dashboard/organizations/[slug]', 'page');
  return { ok: true };
}
