'use server';

import { revalidatePath } from 'next/cache';

import { currentUser, hasRole } from '@/auth';
import { fetchMyOrganizationId } from '@/app/lib/meeting-data';
import { db } from '@/src/prisma/db';

type ContactResult = { ok: true } | { error: string };
const REFUSED = { error: 'You do not have permission to do that.' };

/**
 * Whether the signed-in user may manage this organization's contacts. Checked in
 * each action: a server action is a public endpoint, and the ids it receives
 * come from the client.
 */
async function allowedOrganization(organizationId: string) {
  const me = await currentUser();
  if (!me) return false;
  return (
    hasRole(me.role, 'SUPERUSER') ||
    (await fetchMyOrganizationId(me.id)) === organizationId
  );
}

/**
 * Saves the caller of a call as a contact of the call's organization.
 *
 * Everything is read from the stored call, not sent by the form, so the only
 * thing the client chooses is which call. One contact per phone number: saving
 * a caller already kept fills in what the contact was missing (a name, an
 * email) and overwrites nothing.
 */
export async function saveContactFromCall(callId: string): Promise<ContactResult> {
  const call = await db.orm.public.Call.where({ id: callId })
    .select('organizationId', 'fromNumber', 'callerName', 'dynamicVariables')
    .first();
  if (!call || !call.fromNumber) return { error: 'This call has no number to save.' };
  if (!(await allowedOrganization(call.organizationId))) return REFUSED;

  // What the caller typed into the widget; "not provided" is its placeholder.
  const typed = (call.dynamicVariables as Record<string, unknown> | null)
    ?.caller_email;
  const email =
    typeof typed === 'string' && typed.includes('@') ? typed.trim() : null;
  const name = call.callerName?.trim() || null;

  try {
    const where = {
      organizationId: call.organizationId,
      phone: call.fromNumber,
    };
    const existing = await db.orm.public.Contact.where(where)
      .select('id', 'name', 'email')
      .first();

    if (!existing) {
      await db.orm.public.Contact.create({
        ...where,
        name,
        email,
        sourceCallId: callId,
      });
    } else if ((!existing.name && name) || (!existing.email && email)) {
      await db.orm.public.Contact.where({ id: existing.id }).update({
        name: existing.name ?? name,
        email: existing.email ?? email,
      });
    }
  } catch (error) {
    console.error('Failed to save contact:', error);
    return { error: 'Could not save the contact. Please try again.' };
  }

  revalidatePath(`/dashboard/call-logs/${callId}`);
  revalidatePath('/dashboard/contacts');
  return { ok: true };
}

/**
 * Removes the contact saved under a call's caller number: the other half of
 * the call page's save/remove toggle. Past calls from that number are
 * untouched.
 */
export async function removeContactFromCall(callId: string): Promise<ContactResult> {
  const call = await db.orm.public.Call.where({ id: callId })
    .select('organizationId', 'fromNumber')
    .first();
  if (!call || !call.fromNumber) return { error: 'This call has no number.' };
  if (!(await allowedOrganization(call.organizationId))) return REFUSED;

  try {
    await db.orm.public.Contact.where({
      organizationId: call.organizationId,
      phone: call.fromNumber,
    }).delete();
  } catch (error) {
    console.error('Failed to remove contact:', error);
    return { error: 'Could not remove the contact. Please try again.' };
  }

  revalidatePath(`/dashboard/call-logs/${callId}`);
  revalidatePath('/dashboard/contacts');
  return { ok: true };
}

/** Removes a contact. Past calls from that number are untouched. */
export async function deleteContact(
  organizationId: string,
  contactId: string,
): Promise<void> {
  if (!(await allowedOrganization(organizationId))) return;
  try {
    // Scoped by organization too, so an id from another tenant matches nothing.
    await db.orm.public.Contact.where({
      id: contactId,
      organizationId,
    }).delete();
  } catch (error) {
    console.error('Failed to delete contact:', error);
    return;
  }
  revalidatePath('/dashboard/contacts');
}
