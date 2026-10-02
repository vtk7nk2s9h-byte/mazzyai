'use client';

import { updateUserRole } from '@/app/lib/user-actions';
import { USER_ROLES } from '@/app/lib/utils';
import BadgeSelect from '@/app/ui/badge-select';
import { UserRoleBadge } from '@/app/ui/organizations/status';

/** A user's system role as a picker — the same one the org status uses. */
export default function RoleSelect({
  userId,
  role,
}: {
  userId: string;
  role: string;
}) {
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
