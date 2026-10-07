'use client';
import {
  UserGroupIcon,
  UsersIcon,
  HomeIcon,
  BuildingOffice2Icon,
  DocumentDuplicateIcon,
  PhoneArrowDownLeftIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  SignalIcon,
  ChartBarIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  {
    name: 'Invoices',
    href: '/dashboard/invoices',
    icon: DocumentDuplicateIcon,
  },
  {
    name: 'Call logs',
    href: '/dashboard/call-logs',
    icon: PhoneArrowDownLeftIcon,
  },
  { name: 'Agenda', href: '/dashboard/agenda', icon: CalendarDaysIcon },
  { name: 'Contacts', href: '/dashboard/contacts', icon: UsersIcon },
];

// Superusers see every agent; an organization admin sees their own. The page
// decides which, so the link is the same for both.
const agentsLink = {
  name: 'Agents',
  href: '/dashboard/agents',
  icon: CpuChipIcon,
};

// The feed of calls and meetings as they happen. Same audience as Agents: a
// superuser sees every organization's events, an organization admin their own.
const liveEventsLink = {
  name: 'Live Events',
  href: '/dashboard/live-events',
  icon: SignalIcon,
};

// Call totals and trends. Same audience as Agents: a superuser reads every
// organization, an organization admin their own.
const analyticsLink = {
  name: 'Analytics',
  href: '/dashboard/analytics',
  icon: ChartBarIcon,
};

// Appended only for superusers. The link is a convenience, not the guard — the
// page itself re-checks the role, since anyone can type the URL.
const superuserLinks = [
  {
    name: 'Organizations',
    href: '/dashboard/organizations',
    icon: BuildingOffice2Icon,
  },
  { name: 'Team', href: '/dashboard/team', icon: UserGroupIcon },
  agentsLink,
  liveEventsLink,
  analyticsLink,
  // Dev only; the page itself 404s in production.
  ...(process.env.NODE_ENV === 'production'
    ? []
    : [{ name: 'Test lab', href: '/dashboard/test-lab', icon: BeakerIcon }]),
];

// A superuser reads call logs, invoices and the agenda per tenant, from inside
// an organization's page, so the global views drop out of their sidebar (the
// agenda is the signed-in user's own organization, which a superuser has none
// of).
// Everyone else keeps them. The routes still exist either way — this hides the
// links, it doesn't close the pages.
const superuserHides = [
  '/dashboard/invoices',
  '/dashboard/call-logs',
  '/dashboard/agenda',
  '/dashboard/contacts',
];

type NavLink = { name: string; href: string; icon: typeof HomeIcon };

/** One sidebar link: icon always, label from md up, lit when it's the page. */
function NavItem({ link, pathname }: { link: NavLink; pathname: string }) {
  const LinkIcon = link.icon;
  // Home would otherwise light up on every nested dashboard route.
  const active =
    link.href === '/dashboard'
      ? pathname === link.href
      : pathname.startsWith(link.href);

  return (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      // The label is hidden when the sidebar is collapsed.
      title={link.name}
      className={clsx(
        // No hover fill: the label lights up instead, so the sidebar
        // stays flat and only type and icon carry state.
        'group flex h-9 grow items-center justify-center gap-2.5 rounded-lg px-2 text-xs font-medium transition-colors md:grow-0 md:justify-start md:group-data-[sidebar=collapsed]/sb:justify-center',
        active ? 'text-gray-900' : 'text-gray-500',
      )}
    >
      <LinkIcon
        className={clsx(
          'w-[17px] shrink-0 transition-colors',
          active ? 'text-brand-red-lit' : 'group-hover:text-brand-red-lit',
        )}
      />
      <p className="hidden transition-[color,text-shadow] duration-200 group-hover:text-brand-red-lit group-hover:[text-shadow:0_0_12px_rgba(255,46,67,0.55)] md:block md:group-data-[sidebar=collapsed]/sb:hidden">
        {link.name}
      </p>
    </Link>
  );
}

export default function NavLinks({
  isSuperuser = false,
  isOrgAdmin = false,
}: {
  isSuperuser?: boolean;
  /** An organization admin's Agents and Live Events links; superusers always get them. */
  isOrgAdmin?: boolean;
}) {
  const pathname = usePathname();
  return (
    <>
      {(isSuperuser
        ? [
            ...links.filter((l) => !superuserHides.includes(l.href)),
            ...superuserLinks,
          ]
        : isOrgAdmin
          ? [...links, agentsLink, liveEventsLink, analyticsLink]
          : links
      ).map((link) => (
        <NavItem key={link.name} link={link} pathname={pathname} />
      ))}
    </>
  );
}

/**
 * Settings sits apart from the rest: the sidebar renders it down by the
 * account block it belongs with, not up among the page links.
 */
export function SettingsLink() {
  return (
    <NavItem
      link={{
        name: 'Settings',
        href: '/dashboard/settings',
        icon: Cog6ToothIcon,
      }}
      pathname={usePathname()}
    />
  );
}
