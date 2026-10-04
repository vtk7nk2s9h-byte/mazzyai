'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { currentUser, hasRole } from '@/auth';
import { fetchMyOrganizationId } from '@/app/lib/meeting-data';
import { db } from '@/src/prisma/db';

const MeetingFields = z.object({
  title: z.string().trim().min(1, 'Give the meeting a title.').max(120),
  startsAt: z.string().datetime({ message: 'Pick a start time.' }),
  endsAt: z.string().datetime({ message: 'Pick an end time.' }),
  allDay: z.boolean(),
  attendeeName: z.string().trim().max(120),
  location: z.string().trim().max(120),
  description: z.string().trim().max(2000),
});

const endsAfterStart = (m: { startsAt: string; endsAt: string }) =>
  Date.parse(m.endsAt) > Date.parse(m.startsAt);
const endsAfterStartIssue = {
  message: 'The meeting has to end after it starts.',
  path: ['endsAt'],
};

const MeetingSchema = MeetingFields.refine(endsAfterStart, endsAfterStartIssue);
// Editing can also mark a meeting done or cancelled.
const UpdateMeetingSchema = MeetingFields.extend({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']),
}).refine(endsAfterStart, endsAfterStartIssue);

export type CreateMeetingInput = z.input<typeof MeetingSchema>;
export type UpdateMeetingInput = z.input<typeof UpdateMeetingSchema>;

/**
 * Allowed for a member of the organization, and for a superuser (who reads any
 * tenant's agenda from its profile). Checked in each action, not just on the
 * page: a server action is a public endpoint, and `organizationId` comes from
 * the client. Returns the refusal, or null when allowed.
 */
async function refuseUnlessAllowed(organizationId: string) {
  const me = await currentUser();
  if (!me) return { error: 'You must be signed in.' };
  const allowed =
    hasRole(me.role, 'SUPERUSER') ||
    (await fetchMyOrganizationId(me.id)) === organizationId;
  return allowed ? null : { error: 'You do not have permission to do that.' };
}

const RescheduleSchema = z
  .object({
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    allDay: z.boolean(),
  })
  .refine((m) => Date.parse(m.endsAt) > Date.parse(m.startsAt), {
    message: 'The meeting has to end after it starts.',
  });

/**
 * Moves or resizes a meeting on the agenda: sets its start, end and all-day
 * flag, nothing else. Called when the user lets go of a drag.
 */
export async function rescheduleMeeting(
  organizationId: string,
  meetingId: string,
  input: z.input<typeof RescheduleSchema>,
): Promise<{ ok: true } | { error: string }> {
  const refused = await refuseUnlessAllowed(organizationId);
  if (refused) return refused;

  const parsed = RescheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the times.' };
  }

  try {
    // Scoped by organization too, so an id from another tenant matches nothing.
    const where = { id: meetingId, organizationId };
    const existing = await db.orm.public.Meeting.where(where).select('id').first();
    if (!existing) return { error: 'That meeting no longer exists.' };
    await db.orm.public.Meeting.where(where).update(parsed.data);
  } catch (error) {
    console.error('Failed to reschedule meeting:', error);
    return { error: 'Could not move the meeting. Please try again.' };
  }

  revalidatePath('/dashboard/agenda');
  revalidatePath('/dashboard/organizations/[slug]', 'page');
  return { ok: true };
}

/** Saves an edited meeting: every field the form shows, plus its status. */
export async function updateMeeting(
  organizationId: string,
  meetingId: string,
  input: UpdateMeetingInput,
): Promise<{ ok: true } | { error: string }> {
  const refused = await refuseUnlessAllowed(organizationId);
  if (refused) return refused;

  const parsed = UpdateMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the fields.' };
  }
  const { attendeeName, location, description, ...rest } = parsed.data;

  try {
    // Scoped by organization too, so an id from another tenant matches nothing.
    const where = { id: meetingId, organizationId };
    const existing = await db.orm.public.Meeting.where(where).select('id').first();
    if (!existing) return { error: 'That meeting no longer exists.' };
    await db.orm.public.Meeting.where(where).update({
      ...rest,
      // Empty fields are stored as NULL, as on create.
      attendeeName: attendeeName || null,
      location: location || null,
      description: description || null,
    });
  } catch (error) {
    console.error('Failed to update meeting:', error);
    return { error: 'Could not save the meeting. Please try again.' };
  }

  revalidatePath('/dashboard/agenda');
  revalidatePath('/dashboard/organizations/[slug]', 'page');
  return { ok: true };
}

/** Adds a meeting to an organization's agenda. */
export async function createMeeting(
  organizationId: string,
  input: CreateMeetingInput,
): Promise<{ ok: true } | { error: string }> {
  const refused = await refuseUnlessAllowed(organizationId);
  if (refused) return refused;

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
