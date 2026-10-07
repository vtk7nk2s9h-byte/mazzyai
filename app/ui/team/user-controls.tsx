'use client';

import { useTransition } from 'react';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';

import {
  signOutEverywhere,
  updateUserRole,
  updateUserStatus,
} from '@/app/lib/user-actions';
import { USER_ROLES, USER_STATUSES } from '@/app/lib/utils';
import BadgeSelect from '@/app/ui/badge-select';
import { UserRoleBadge, UserStatusBadge } from '@/app/ui/organizations/status';
import { toastError, toastSuccess } from '@/hooks/use-toast';

// The Team table's per-user controls. Client components only because the
// pickers take a save function; the table itself stays server-rendered.

/** A user's system role as a picker — the same one the org status uses. */
export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  return (
    <BadgeSelect
      value={role}
      options={USER_ROLES}
      noun="Role"
      ariaLabel="Change user role"
      badge={<UserRoleBadge role={role} />}
      save={(next) => updateUserRole(userId, next)}
    />
  );
}

/** Active / disabled as a picker. Disabling also signs them out everywhere. */
export function StatusSelect({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  return (
    <BadgeSelect
      value={status}
      options={USER_STATUSES}
      noun="Status"
      ariaLabel="Change user status"
      badge={<UserStatusBadge status={status} />}
      save={(next) => updateUserStatus(userId, next)}
    />
  );
}

/** Ends all of a user's sessions without disabling the account. */
export function SignOutEverywhereButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await signOutEverywhere(userId);
      if ('error' in result) {
        toastError('Not signed out', result.error);
      } else {
        toastSuccess('Signed out everywhere', `${name} must sign in again.`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      title="Sign out of every device"
      aria-label={`Sign ${name} out of every device`}
      className="rounded-md p-1 text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-50"
    >
      <ArrowRightStartOnRectangleIcon aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}
