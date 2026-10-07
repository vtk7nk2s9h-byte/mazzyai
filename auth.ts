import { headers } from 'next/headers';
import { cache } from 'react';
import { auth, ADMIN_ACCOUNT_EMAIL } from '@/lib/auth';

export { ADMIN_ACCOUNT_EMAIL };

/** Mirrors the SystemRole enum in src/prisma/contract.prisma. */
export type Role = 'USER' | 'ADMIN' | 'SUPERUSER';

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  /** Set while a superuser is signed in as someone else: who to return to. */
  impersonatorId?: string;
};

// Ranked rather than matched by name: one numeric comparison expresses
// "SUPERUSER may do anything ADMIN may", so there are no per-role permission
// lists to keep in sync as the app grows.
const RANK: Record<Role, number> = { USER: 0, ADMIN: 1, SUPERUSER: 2 };

/** True when `role` sits at or above `min` in the hierarchy. */
export function hasRole(role: Role | null | undefined, min: Role): boolean {
  return !!role && RANK[role] >= RANK[min];
}

// One session lookup per request however many layouts, pages and actions ask:
// the layout, the sidenav and the page all call currentUser().
const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/**
 * The signed-in user, or null when signed out.
 *
 * Read from the session row in the database, so a role change, a disabled
 * account or a revoked session applies on the very next request.
 *
 *   const me = await currentUser();
 *   {hasRole(me?.role, 'ADMIN') && <AdminPanel />}
 */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  const { user } = session;
  return {
    id: user.id,
    name: user.name || null,
    email: user.email,
    image: user.image ?? null,
    role: (user.role as Role | null | undefined) ?? 'USER',
    impersonatorId: session.session.impersonatedBy ?? undefined,
  };
}

/**
 * Wraps a server action so it only runs for `minRole` and above, handing the
 * action the caller it already resolved.
 *
 *   export const deleteOrg = withRoleAction('SUPERUSER', async (me, id: string) => {
 *     await db.orm.public.Organization.where({ id }).delete();
 *   });
 *
 * Refusals come back as `{ error }` rather than thrown, so a form can render
 * them through useActionState like any other validation failure.
 */
export function withRoleAction<A extends unknown[], R>(
  minRole: Role,
  action: (user: SessionUser, ...args: A) => Promise<R>,
) {
  return async (...args: A): Promise<R | { error: string }> => {
    const user = await currentUser();
    if (!user) return { error: 'You must be signed in.' };
    if (!hasRole(user.role, minRole)) {
      return { error: 'You do not have permission to do that.' };
    }
    return action(user, ...args);
  };
}
