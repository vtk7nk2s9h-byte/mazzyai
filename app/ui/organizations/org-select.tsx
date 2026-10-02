'use client';

import { updateOrgField } from '@/app/lib/org-actions';
import { ORG_PLANS, ORG_STATUSES } from '@/app/lib/utils';
import BadgeSelect from '@/app/ui/badge-select';
import { OrgStatusBadge, PlanBadge } from '@/app/ui/organizations/status';

const FIELDS = {
  status: { options: ORG_STATUSES, noun: 'Status' },
  plan: { options: ORG_PLANS, noun: 'Plan' },
} as const;

/**
 * An organization's status or plan as a picker instead of a read-only badge.
 * The behaviour is BadgeSelect's; `field` is the one prop that tells the two
 * apart.
 */
export default function OrgSelect({
  orgId,
  slug,
  field,
  value,
}: {
  orgId: string;
  slug: string;
  field: 'status' | 'plan';
  value: string;
}) {
  const { options, noun } = FIELDS[field];

  return (
    <BadgeSelect
      value={value}
      options={options}
      noun={noun}
      ariaLabel={`Change organization ${field}`}
      badge={
        field === 'status' ? (
          <OrgStatusBadge status={value} />
        ) : (
          <PlanBadge plan={value} />
        )
      }
      save={(next) => updateOrgField(orgId, slug, field, next)}
    />
  );
}
