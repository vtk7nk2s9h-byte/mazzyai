import { currentUser } from '@/auth';
import { fetchUsers } from '@/app/lib/user-data';
import { formatDateToLocal, paginate } from '@/app/lib/utils';
import Pagination from '@/app/ui/pagination';
import OrgAvatar from '@/app/ui/organizations/avatar';
import { UserRoleBadge, UserStatusBadge } from '@/app/ui/organizations/status';
import {
  RoleSelect,
  SignOutEverywhereButton,
  StatusSelect,
} from '@/app/ui/team/user-controls';

/**
 * Every system user with their role. Server-rendered end to end, laid out like
 * the organizations table: stacked cards below md, a table from md up. The
 * org avatar is reused — it falls back to initials, which is all a user has.
 */
export default async function TeamTable({ page = 1 }: { page?: number }) {
  const { rows: users, totalPages } = paginate(await fetchUsers(), page);
  const me = await currentUser();

  // Your own row stays plain badges: the actions refuse a self-change, so
  // offering the controls would only lead to an error.
  const roleCell = (user: (typeof users)[number]) =>
    user.id === me?.id ? (
      <UserRoleBadge role={user.systemRole} />
    ) : (
      <RoleSelect userId={user.id} role={user.systemRole} />
    );
  const statusCell = (user: (typeof users)[number]) =>
    user.id === me?.id ? (
      <UserStatusBadge status={user.status} />
    ) : (
      <div className="flex items-center gap-1">
        <StatusSelect userId={user.id} status={user.status} />
        <SignOutEverywhereButton
          userId={user.id}
          name={user.name ?? user.email}
        />
      </div>
    );

  if (users.length === 0) {
    return (
      <div className="mt-6 rounded-lg bg-gray-50 p-10 text-center text-sm text-gray-500">
        No users yet.
      </div>
    );
  }

  return (
    <>
    <div className="mt-6 flow-root overflow-x-auto pb-14">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            {users.map((user) => (
              <div
                key={user.id}
                className="mb-2 w-full rounded-md bg-gray-100 p-4"
              >
                <div className="flex items-center justify-between gap-3 border-b pb-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <OrgAvatar
                      name={user.name ?? user.email}
                      logoUrl={user.image}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {user.name ?? user.email}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {roleCell(user)}
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <p className="text-sm text-gray-500">
                    Joined {formatDateToLocal(user.createdAt)}
                  </p>
                  {statusCell(user)}
                </div>
              </div>
            ))}
          </div>

          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  User
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Role
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Joined
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Last sign-in
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-100">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      <OrgAvatar
                        name={user.name ?? user.email}
                        logoUrl={user.image}
                      />
                      <div className="min-w-0">
                        <p className="max-w-[26ch] truncate font-medium">
                          {user.name ?? user.email}
                        </p>
                        <p className="max-w-[26ch] truncate text-xs text-gray-500">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {roleCell(user)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDateToLocal(user.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-500">
                    {user.lastLoginAt
                      ? formatDateToLocal(user.lastLoginAt)
                      : 'Never'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {statusCell(user)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
      {totalPages > 1 && (
        <div className="mt-5 flex w-full justify-center">
          <Pagination totalPages={totalPages} />
        </div>
      )}
    </>
  );
}
