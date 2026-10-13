import { fetchUser } from '@/app/lib/user-data';
import { formatDateToLocal } from '@/app/lib/utils';
import SidePanel from '@/components/ui/side-panel';
import OrgAvatar from '@/app/ui/organizations/avatar';

const dash = <span className="text-gray-400">—</span>;

/**
 * The team member card: read-only, since the role and status controls stay in
 * the table row where they are one click away. Renders nothing for an id that
 * matches no one, so a stale link just shows the table.
 */
export default async function MemberPanel({
  id,
  closeHref,
}: {
  id: string;
  closeHref: string;
}) {
  const user = await fetchUser(id);
  if (!user) return null;

  const name = user.name ?? user.email;
  const rows: [string, React.ReactNode][] = [
    ['Phone', user.phone ?? dash],
    ['Timezone', user.timezone],
    ['Language', user.locale],
    ['Joined', formatDateToLocal(user.createdAt)],
    [
      'Last sign-in',
      user.lastLoginAt ? formatDateToLocal(user.lastLoginAt) : 'Never',
    ],
  ];

  return (
    <SidePanel
      title={name}
      description={user.email}
      closeHref={closeHref}
      media={
        <OrgAvatar
          name={name}
          logoUrl={user.image}
          size="lg"
          className="size-12 shrink-0"
        />
      }
    >
      <dl className="divide-y divide-white/[0.10] text-sm">
        {rows.map(([term, value]) => (
          <div key={term} className="flex justify-between gap-4 py-3">
            <dt className="text-gray-500">{term}</dt>
            <dd className="min-w-0 truncate text-right">{value}</dd>
          </div>
        ))}
      </dl>

      {user.banned && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
          <p className="font-medium text-red-600">Banned</p>
          {user.banReason && (
            <p className="mt-1 text-gray-500">{user.banReason}</p>
          )}
          {user.banExpires && (
            <p className="mt-1 text-gray-500">
              Until {formatDateToLocal(user.banExpires)}
            </p>
          )}
        </div>
      )}
    </SidePanel>
  );
}
