import { db } from '@/src/prisma/db';

/**
 * Every account in the system, newest first. Unpaginated: this is the internal
 * team list, which stays small, and the page is the place to add paging if it
 * ever stops being.
 */
export async function fetchUsers() {
  try {
    return await db.orm.public.User.select(
      'id',
      'name',
      'email',
      'image',
      'systemRole',
      'status',
      'lastLoginAt',
      'createdAt',
    )
      .orderBy((u) => u.createdAt.desc())
      .all();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch users.');
  }
}

/**
 * One account with the profile fields the list leaves out, for the team
 * member card. Null for an id that matches nobody (or isn't an id at all).
 */
export async function fetchUser(id: string) {
  // The column is a uuid; anything else can only be a hand-typed URL.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    return await db.orm.public.User.where({ id })
      .select(
        'id',
        'name',
        'email',
        'image',
        'phone',
        'timezone',
        'locale',
        'systemRole',
        'status',
        'banned',
        'banReason',
        'banExpires',
        'lastLoginAt',
        'createdAt',
      )
      .first();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the user.');
  }
}

// Imports the Prisma client, so never pull this into a client component.
