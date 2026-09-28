'use client';
import {
  UserGroupIcon,
  HomeIcon,
  BuildingOffice2Icon,
  DocumentDuplicateIcon,
  PhoneArrowDownLeftIcon,
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
  { name: 'Customers', href: '/dashboard/customers', icon: UserGroupIcon },
  {
    name: 'Call logs',
    href: '/dashboard/call-logs',
    icon: PhoneArrowDownLeftIcon,
  },
];

// Appended only for superusers. The link is a convenience, not the guard — the
// page itself re-checks the role, since anyone can type the URL.
const superuserLinks = [
  {
    name: 'Organizations',
    href: '/dashboard/organizations',
    icon: BuildingOffice2Icon,
  },
];

// A superuser reads call logs and invoices per tenant, from inside an
// organization's page, so the two global views drop out of their sidebar.
// Everyone else keeps them. The routes still exist either way — this hides the
// links, it doesn't close the pages.
const superuserHides = ['/dashboard/invoices', '/dashboard/call-logs'];

export default function NavLinks({
  isSuperuser = false,
}: {
  isSuperuser?: boolean;
}) {
  const pathname = usePathname();
  return (
    <>
      {(isSuperuser
        ? [
            ...links.filter((l) => !superuserHides.includes(l.href)),
            ...superuserLinks,
          ]
        : links
      ).map((link) => {
        const LinkIcon = link.icon;
        // Home would otherwise light up on every nested dashboard route.
        const active =
          link.href === '/dashboard'
            ? pathname === link.href
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.name}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              // No hover fill: the label lights up instead, so the sidebar
              // stays flat and only type and icon carry state.
              'group flex h-9 grow items-center justify-center gap-2.5 rounded-lg px-2 text-xs font-medium transition-colors md:grow-0 md:justify-start',
              active ? 'text-gray-900' : 'text-gray-500',
            )}
          >
            <LinkIcon
              className={clsx(
                'w-[17px] shrink-0 transition-colors',
                active
                  ? 'text-brand-red-lit'
                  : 'group-hover:text-brand-red-lit',
              )}
            />
            <p className="hidden transition-[color,text-shadow] duration-200 group-hover:text-brand-red-lit group-hover:[text-shadow:0_0_12px_rgba(255,46,67,0.55)] md:block">
              {link.name}
            </p>
          </Link>
        );
      })}
    </>
  );
}
