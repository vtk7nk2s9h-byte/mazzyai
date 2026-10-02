import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';

import { auth, hasRole, type Role } from '@/auth';
import NavLinks, { SettingsLink } from '@/app/ui/dashboard/nav-links';
import LogoutButton from '@/app/ui/log-out-button';
import { signOutAction } from '@/app/lib/actions';
import { fetchAgentsOrganizationId } from '@/app/lib/agent-data';
import { switchAccountAction } from '@/app/lib/auth-actions';
import { initialsOf } from '@/app/lib/utils';

export default async function SideNav() {
  const session = await auth();
  const user = session?.user;
  const displayName = user?.name || user?.email || 'Account';
  const isSuperuser = hasRole(
    (user as { role?: Role } | undefined)?.role,
    'SUPERUSER',
  );
  const impersonating = !!(user as { impersonatorId?: string } | undefined)
    ?.impersonatorId;
  const canSwitch = isSuperuser || impersonating;

  // Shared by the plain plate and the switch button, so the two look the same.
  const accountPlate =
    'flex h-[3.25rem] items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.05] px-2.5 backdrop-blur-xl';
  const accountBody = (
    <>
      {user?.image ? (
        <Image
          src={user.image}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-full border border-brand-red-lit/70 object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          // Outline only — no fill, so the ring is the single red mark and
          // the initials read as type rather than as a badge.
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-red-lit/70 text-[11px] font-semibold text-gray-900"
        >
          {initialsOf(displayName)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-900">
          {displayName}
        </p>
        {user?.email && user.name && (
          <p className="truncate text-[10px] text-gray-500">{user.email}</p>
        )}
      </div>
    </>
  );

  // Membership role isn't on the session, so an org admin's link costs one
  // query. Superusers already get the link, so they skip it.
  const isOrgAdmin =
    !isSuperuser && !!user?.id && !!(await fetchAgentsOrganizationId(user.id));

  return (
    // Translucent rather than a solid panel, so the animated field behind the
    // page shows through and the sidebar reads as a pane over the app.
    <div className="flex h-full flex-col border-white/[0.07] bg-white/[0.03] px-2 py-4 backdrop-blur-2xl md:border-r">
      {/* Same plate as the account block and the sign-out button, so the
          sidebar opens and closes on the same shape. */}
      <Link
        href="/"
        // Same glass as the account block and the sign-out button.
        className="mb-5 flex h-16 items-center justify-center overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.05] px-3 backdrop-blur-xl transition-colors hover:bg-white/[0.08]"
      >
        <Image
          // Served from /public, so the URL is root-relative and has no
          // "public" segment — and no backslashes.
          src="/mazzyai-phone-logo.svg"
          alt="MazzyAI"
          width={794}
          height={584}
          // The sidebar is always on screen, so this is never below the fold —
          // without priority, next/image lazy-loads it and the plate sits
          // empty until the browser gets round to fetching it.
          priority
          unoptimized
          // No filter: the mark renders in its own colours.
          className="h-12 w-auto object-contain"
        />
      </Link>

      <div className="flex grow flex-row justify-between gap-1.5 md:flex-col md:justify-start">
        {/* The role rides on the session cookie, so this costs no query. It
            only hides the link — app/dashboard/organizations re-checks. */}
        <NavLinks isSuperuser={isSuperuser} isOrgAdmin={isOrgAdmin} />

        {/* Pushes the account block to the bottom on desktop; collapses to
            nothing in the mobile row. */}
        <div className="hidden grow md:block" />

        {/* Above the account block it belongs with. In the mobile row it just
            follows the other icons. */}
        <SettingsLink />

        {/* Same radius and fill as the sign-out button below, so the two read
            as one stacked pair. A little taller than the button (3.25rem
            against its 2.75rem): the name and email are two lines, and at the
            old height they sat tight against the edges. */}
        {/* A superuser, or an account a superuser stepped into, gets the
            banner as a one-click switch between the two; switchAccountAction
            decides what the click may do. Everyone else gets a plain plate. */}
        {canSwitch ? (
          <form action={switchAccountAction} className="mb-2 hidden md:block">
            <button
              type="submit"
              title={impersonating ? 'Switch back to superuser' : 'Switch to admin'}
              className={`${accountPlate} w-full text-left transition-colors hover:bg-white/[0.08]`}
            >
              {accountBody}
              <ArrowsRightLeftIcon
                aria-hidden="true"
                className="ml-auto w-4 shrink-0 text-gray-500"
              />
            </button>
          </form>
        ) : (
          <div className={`${accountPlate} mb-2 hidden md:flex`}>
            {accountBody}
          </div>
        )}

        <LogoutButton
          label="Sign Out"
          variant="glass"
          onLogout={signOutAction}
          resetAfter={0}
          className="h-11 w-full grow rounded-lg md:flex-none md:grow-0"
        />
      </div>
    </div>
  );
}
