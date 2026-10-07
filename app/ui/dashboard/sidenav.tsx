import { ArrowsRightLeftIcon, BellIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';

import { currentUser, hasRole } from '@/auth';
import NavLinks, { SettingsLink } from '@/app/ui/dashboard/nav-links';
import LogoutButton from '@/app/ui/log-out-button';
// The notifications button borrows the sign-out button's glass plate, so the
// two can't drift apart.
import logoutStyles from '@/app/ui/logoutButton.module.css';
import { fetchAgentsOrganizationId } from '@/app/lib/agent-data';
import { signOutAction, switchAccountAction } from '@/app/lib/auth-actions';
import { fetchRecentNotifications } from '@/app/lib/notification-data';
import { formatDateToLocal } from '@/app/lib/utils';
import OrgAvatar from '@/app/ui/organizations/avatar';

export default async function SideNav() {
  const user = await currentUser();
  const displayName = user?.name || user?.email || 'Account';
  const isSuperuser = hasRole(user?.role, 'SUPERUSER');
  const impersonating = !!user?.impersonatorId;
  const canSwitch = isSuperuser || impersonating;

  // Shared by the plain plate and the switch button, so the two look the same.
  const accountPlate =
    'flex h-[3.25rem] items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.05] px-2.5 backdrop-blur-xl md:group-data-[sidebar=collapsed]/sb:justify-center md:group-data-[sidebar=collapsed]/sb:px-0';
  const accountBody = (
    <>
      <OrgAvatar name={displayName} logoUrl={user?.image ?? null} />
      <div className="min-w-0 md:group-data-[sidebar=collapsed]/sb:hidden">
        <p className="truncate text-xs font-medium text-gray-900">
          {displayName}
        </p>
        {user?.email && user.name && (
          <p className="truncate text-[10px] text-gray-500">{user.email}</p>
        )}
        {/* The only cue that this isn't your own login: the plate otherwise
            looks the same as when the admin signs in themselves. */}
        {impersonating && (
          <p className="truncate text-[10px] font-medium text-maroon-400">
            Switched in · click to return
          </p>
        )}
      </div>
    </>
  );

  // Membership role isn't on the session, so an org admin's link costs one
  // query. Superusers already get the link, so they skip it.
  // Fetched alongside it, so the bell's list doesn't add a round trip.
  const [orgId, notifications] = await Promise.all([
    !isSuperuser && user?.id ? fetchAgentsOrganizationId(user.id) : null,
    user?.id ? fetchRecentNotifications(user.id) : [],
  ]);
  const isOrgAdmin = !!orgId;
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    // Translucent rather than a solid panel, so the animated field behind the
    // page shows through and the sidebar reads as a pane over the app.
    <div className="flex h-full flex-col border-white/[0.07] bg-white/[0.03] px-2 py-4 backdrop-blur-2xl md:border-r">
      {/* Same plate as the account block and the sign-out button, so the
          sidebar opens and closes on the same shape. */}
      <Link
        href="/"
        // Same glass as the account block and the sign-out button.
        className="mb-5 flex h-16 items-center justify-center overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.05] px-3 backdrop-blur-xl transition-colors hover:bg-white/[0.08] md:group-data-[sidebar=collapsed]/sb:px-1"
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
          className="h-12 w-auto object-contain md:group-data-[sidebar=collapsed]/sb:h-7"
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
              className={`${accountPlate} w-full text-left transition-colors hover:bg-white/[0.08] ${impersonating ? 'ring-1 ring-maroon-400/50' : ''}`}
            >
              {accountBody}
              <ArrowsRightLeftIcon
                aria-hidden="true"
                className="ml-auto w-4 shrink-0 text-gray-500 md:group-data-[sidebar=collapsed]/sb:hidden"
              />
            </button>
          </form>
        ) : (
          <div title={displayName} className={`${accountPlate} mb-2 hidden md:flex`}>
            {accountBody}
          </div>
        )}

        {/* Two icon-only plates side by side under the banner. Each is only as
            wide as its mark, so the row hugs the left edge (`md:self-start`
            stops the column from stretching it) and lines up with the avatar
            above. `contents` on mobile drops the wrapper so both stay direct
            children of the icon row. */}
        <div className="contents md:flex md:gap-1.5 md:self-start md:group-data-[sidebar=collapsed]/sb:flex-col-reverse md:group-data-[sidebar=collapsed]/sb:items-center md:group-data-[sidebar=collapsed]/sb:self-center">
          <LogoutButton
            label="Sign Out"
            iconOnly
            variant="glass"
            onLogout={signOutAction}
            resetAfter={0}
            className="h-11 shrink-0 rounded-lg"
          />

          {/* Same plate as the sign-out button: the glass and iconOnly classes
              give it the hairline, blur and padding, and its hover turns
              --text red, which the bell's stroke follows through
              currentColor. The bell is sized to fill the 44px plate the way
              the figure and door do. `popovertarget` opens the panel below
              with no script — and click-outside and Esc close it. */}
          <button
            type="button"
            aria-label={
              unread ? `Notifications, ${unread} unread` : 'Notifications'
            }
            title="Notifications"
            popoverTarget="notifications-panel"
            className={`${logoutStyles.button} ${logoutStyles.glass} ${logoutStyles.iconOnly} relative h-11 shrink-0 rounded-lg`}
          >
            <BellIcon aria-hidden="true" className="h-7 w-7" />
            {unread > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-red-lit"
              />
            )}
          </button>
        </div>

        {/* A popover, so it renders in the top layer and the sidebar's
            overflow and blur can't clip it. UA styles centre it with auto
            margins; `inset-auto` + `m-0` hand placement back to us. It opens
            upward from the button row: on desktop `bottom-[4.25rem]` is the
            sidebar's 1rem padding + the 2.75rem plate + a 0.5rem gap, and on
            a phone it is a sheet along the bottom of the screen. Collapsed, the
            two buttons stack, so the offset grows to 7.375rem. No `display`
            class on purpose — it would override the UA's display:none while
            closed. */}
        <div
          id="notifications-panel"
          popover="auto"
          className="fixed inset-auto inset-x-2 bottom-4 m-0 w-auto overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.035] p-0 text-gray-900 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl md:inset-x-auto md:bottom-[4.25rem] md:group-data-[sidebar=collapsed]/sb:bottom-[7.375rem] md:left-2 md:w-72"
        >
          <div className="flex items-baseline justify-between border-b border-white/[0.07] px-3.5 py-2.5">
            <h2 className="text-sm font-medium">Notifications</h2>
            {unread > 0 && (
              <span className="text-xs text-brand-red-lit">{unread} unread</span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <BellIcon aria-hidden="true" className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">You&apos;re all caught up.</p>
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-white/[0.07] overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="flex gap-2.5 px-3.5 py-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.isRead ? 'bg-transparent' : 'bg-brand-red-lit'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">
                      {formatDateToLocal(n.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
