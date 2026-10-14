import { clsx } from 'clsx';
import Link from 'next/link';
import { lusitana } from '@/app/ui/fonts';
import ArrowIcon from '@/components/ui/arrow-icon';

interface Breadcrumb {
  label: string;
  href: string;
  active?: boolean;
}

export default function Breadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: Breadcrumb[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 block">
      {/* On a detail page this trail is the page's heading, so it takes the
          same treatment as the other pages' (see .page-heading in global.css).
          The crumbs are inline, not flex items, so ::first-letter can find the
          first letter and the rule is the width of the words. */}
      <ol className={clsx(lusitana.className, 'page-heading')}>
        {breadcrumbs.map((breadcrumb, index) => (
          <li
            key={breadcrumb.href}
            aria-current={breadcrumb.active}
            className={clsx(
              'inline',
              breadcrumb.active ? 'text-gray-900' : 'text-gray-500',
            )}
          >
            <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
            {index < breadcrumbs.length - 1 ? (
              // The app's own arrow between the crumbs, muted like the
              // crumbs that lead up to the page. Lifted a touch: align-middle
              // centres it on the x-height's midline plus the shaft's own
              // weight, which sits it low against the lowercase letters.
              <ArrowIcon
                size={30}
                className="mx-4 inline-block -translate-y-1.5 align-middle text-gray-500"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
