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

// A superuser reads invoices and the agenda per tenant, from inside an
// organization's page, so those global views drop out of their sidebar (the
// agenda is the signed-in user's own organization, which a superuser has none
// of). Call logs stay: MazzyAI takes calls of its own, and the global table
// is the only place every organization's calls appear together.
// Everyone else keeps them all. The routes still exist either way — this hides
// the links, it doesn't close the pages.
const superuserHides = [
  '/dashboard/invoices',
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
        // No hover fill: the label lights up instead. Only the active link
        // gets a background, so the sidebar stays flat otherwise.
        'group relative isolate flex h-10 grow items-center justify-center gap-2.5 rounded-lg px-2 text-[13px] font-medium transition-colors md:grow-0 md:justify-start md:pl-4 md:group-data-[sidebar=collapsed]/sb:justify-center md:group-data-[sidebar=collapsed]/sb:px-2',
        // A small red light on the left edge (::before) and a wash of it
        // spilling across the link (::after) — the only things that tint the
        // background. Both are always rendered and fade/grow in or out, so
        // moving between links hands the light over instead of snapping it.
        // The wash is a layer because a gradient can't be transitioned itself.
        'before:absolute before:left-0 before:top-1/2 before:hidden before:h-[18px] before:w-[3px] before:-translate-y-1/2 before:scale-y-0 before:rounded-full before:bg-brand-red-lit before:opacity-0 before:shadow-[0_0_8px_2px_rgba(255,46,67,0.75),0_0_18px_4px_rgba(255,46,67,0.35)] before:transition-[transform,opacity] before:duration-300 before:ease-out md:before:block',
        'after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-[inherit] after:bg-[linear-gradient(90deg,rgba(255,46,67,0.18),rgba(255,46,67,0.04)_70%,transparent)] after:opacity-0 after:transition-opacity after:duration-300 after:ease-out',
        'motion-reduce:before:transition-none motion-reduce:after:transition-none',
        active
          ? 'text-gray-900 before:scale-y-100 before:opacity-100 after:opacity-100'
          : // The same light at half height and opacity, and the same wash
            // at 40% — a preview of the active link. The bar scales with its
            // glow included.
            'text-gray-500 hover:before:scale-y-50 hover:before:opacity-60 hover:after:opacity-40',
      )}
    >
      <LinkIcon
        className={clsx(
          'w-[19px] shrink-0 transition-colors',
          active ? 'text-brand-red-lit' : 'group-hover:text-brand-red-lit',
        )}
      />
      <p
        className={clsx(
          // The label leans away from the light bar on hover, and stays
          // there while the link is the page. Same offset for both, so
          // hovering the active link doesn't pull it back.
          'hidden transition-[color,text-shadow,transform] duration-300 ease-out group-hover:translate-x-1 group-hover:text-brand-red-lit group-hover:[text-shadow:0_0_12px_rgba(255,46,67,0.55)] motion-reduce:transition-none md:block md:group-data-[sidebar=collapsed]/sb:hidden',
          active && 'translate-x-1',
        )}
      >
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
