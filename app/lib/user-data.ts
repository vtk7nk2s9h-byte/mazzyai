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

// Imports the Prisma client, so never pull this into a client component.
