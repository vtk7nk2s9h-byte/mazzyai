import Image from 'next/image';

import { initialsOf } from '@/app/lib/utils';

/**
 * The org's mark next to its name, as the customer photo sits in the invoices
 * table. Orgs rarely have a logo uploaded, so the initials ring — the same one
 * the sidebar's account block falls back to — carries most rows.
 */
/** 28px in the table row, 56px in the detail page's header. */
const SIZES = {
  sm: { px: 28, ring: 'h-7 w-7', type: 'text-[11px]' },
  lg: { px: 56, ring: 'h-14 w-14', type: 'text-base' },
} as const;

export default function OrgAvatar({
  name,
  logoUrl,
  size = 'sm',
}: {
  name: string;
  logoUrl: string | null;
  size?: keyof typeof SIZES;
}) {
  const { px, ring, type } = SIZES[size];

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        width={px}
        height={px}
        // No remotePatterns in next.config.ts: the optimizer would reject an
        // arbitrary tenant-supplied host, so the URL is served as given.
        unoptimized
        className={`${ring} shrink-0 rounded-full border border-brand-red-lit/70 object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      // Outline only, no fill — the ring is the single red mark and the
      // initials read as type rather than as a badge.
      className={`${ring} ${type} flex shrink-0 items-center justify-center rounded-full border border-brand-red-lit/70 font-semibold text-gray-900`}
    >
      {initialsOf(name)}
    </span>
  );
}
