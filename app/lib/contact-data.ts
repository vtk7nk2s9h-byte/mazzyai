import { db } from '@/src/prisma/db';

/** An organization's saved contacts, newest first. */
export async function fetchContacts(organizationId: string) {
  try {
    return await db.orm.public.Contact.where({ organizationId })
      .select('id', 'name', 'phone', 'email', 'notes', 'createdAt')
      .orderBy((c) => c.createdAt.desc())
      .all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch contacts.');
  }
}

/**
 * The contact saved under this phone number, if any. Numbers are matched as
 * stored (E.164, as Retell reports them), one contact per number per
 * organization.
 */
export async function fetchContactByPhone(
  organizationId: string,
  phone: string,
) {
  try {
    return await db.orm.public.Contact.where({ organizationId, phone })
      .select('id', 'name', 'phone', 'email')
      .first();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to look up the contact.');
  }
}

// Imports the Prisma client, so never pull this into a client component.
export type ContactRow = Awaited<ReturnType<typeof fetchContacts>>[number];
