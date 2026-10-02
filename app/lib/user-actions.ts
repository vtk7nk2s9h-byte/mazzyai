'use server';

import bcrypt from 'bcrypt';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { withRoleAction } from '@/auth';
import { USER_ROLES, type UserRole } from '@/app/lib/utils';
import { db } from '@/src/prisma/db';

// Same work factor as sign-up (auth-actions.ts).
const BCRYPT_ROUNDS = 12;

const CreateUserSchema = z.object({
  name: z.string().trim().min(2, 'Please enter a name.').max(120),
  // Lower-cased because the unique index is case-sensitive.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Passwords must be at least 8 characters.')
    .max(200),
  role: z.enum(USER_ROLES),
});

export type CreateUserInput = z.input<typeof CreateUserSchema>;

/**
 * Creates an account with a chosen role. Superusers only — it can mint other
 * superusers, so it is checked here and not left to the page that shows the
 * button. The new person signs in with the password given here.
 */
export const createUser = withRoleAction(
  'SUPERUSER',
  async (_me, input: CreateUserInput) => {
    const parsed = CreateUserSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Check the fields.' };
    }
    const { name, email, password, role } = parsed.data;

    const existing = await db.orm.public.User.where({ email })
      .select('id')
      .first();
    if (existing) return { error: 'That email is already registered.' };

    try {
      await db.orm.public.User.create({
        name,
        email,
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        systemRole: role,
        status: 'ACTIVE',
      });
    } catch (error) {
      // Backstop for two creates racing past the check above.
      console.error('Failed to create user:', error);
      return { error: 'Could not create the user. Please try again.' };
    }

    revalidatePath('/dashboard/team');
    return { ok: true as const };
  },
);

/**
 * Changes a user's system role. Superusers only: it can promote anyone to
 * superuser, so it is checked here and not left to the page that shows the
 * picker. Same shape as updateOrgField (org-actions.ts).
 *
 * You cannot change your own role: a superuser demoting themselves could leave
 * the system with nobody able to promote anyone back.
 */
export const updateUserRole = withRoleAction(
  'SUPERUSER',
  async (me, userId: string, role: string) => {
    if (!(USER_ROLES as readonly string[]).includes(role)) {
      return { error: 'Unknown role.' };
    }
    if (userId === me.id) {
      return { error: 'You cannot change your own role.' };
    }
    try {
      await db.orm.public.User.where({ id: userId }).update({
        systemRole: role as UserRole,
      });
    } catch (error) {
      console.error('Failed to update user role:', error);
      return { error: 'Could not update the role. Please try again.' };
    }
    revalidatePath('/dashboard/team');
    return { ok: true as const };
  },
);
