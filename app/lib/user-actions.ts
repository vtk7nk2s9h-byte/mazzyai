'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { withRoleAction } from '@/auth';
import {
  USER_ROLES,
  USER_STATUSES,
  type UserRole,
  type UserStatus,
} from '@/app/lib/utils';
import { auth } from '@/lib/auth';
import { db } from '@/src/prisma/db';

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

    // The admin plugin creates the user and its credential account together,
    // hashing with lib/auth.ts's bcrypt settings. It re-checks that the
    // caller's session may create users, on top of withRoleAction above.
    try {
      await auth.api.createUser({
        body: { name, email, password, role },
        headers: await headers(),
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

/**
 * Enables or disables an account. Superusers only, and never your own — the
 * same guard as updateUserRole.
 *
 * lib/auth.ts already refuses new sessions for a DISABLED account; disabling
 * also revokes the ones already open, so it takes effect on the person's next
 * request rather than when their session would have expired.
 */
export const updateUserStatus = withRoleAction(
  'SUPERUSER',
  async (me, userId: string, status: string) => {
    if (!(USER_STATUSES as readonly string[]).includes(status)) {
      return { error: 'Unknown status.' };
    }
    if (userId === me.id) {
      return { error: 'You cannot change your own status.' };
    }
    try {
      await db.orm.public.User.where({ id: userId }).update({
        status: status as UserStatus,
      });
      if (status === 'DISABLED') {
        await auth.api.revokeUserSessions({
          body: { userId },
          headers: await headers(),
        });
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
      return { error: 'Could not update the status. Please try again.' };
    }
    revalidatePath('/dashboard/team');
    return { ok: true as const };
  },
);

/**
 * Ends every session a user has, on every device, without disabling them —
 * for a lost laptop or a leaked password. They can sign straight back in.
 * Your own sessions are left to the sidebar's Sign Out.
 */
export const signOutEverywhere = withRoleAction(
  'SUPERUSER',
  async (me, userId: string) => {
    if (userId === me.id) {
      return { error: 'Use Sign Out to end your own session.' };
    }
    try {
      await auth.api.revokeUserSessions({
        body: { userId },
        headers: await headers(),
      });
    } catch (error) {
      console.error('Failed to revoke sessions:', error);
      return { error: 'Could not sign them out. Please try again.' };
    }
    return { ok: true as const };
  },
);
