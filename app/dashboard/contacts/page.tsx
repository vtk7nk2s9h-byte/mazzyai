import { Metadata } from 'next';

import { currentUser, hasRole } from '@/auth';
import { deleteContact } from '@/app/lib/contact-actions';
import { fetchContacts } from '@/app/lib/contact-data';
import { fetchMyOrganizationId } from '@/app/lib/meeting-data';
import { formatDateToLocal } from '@/app/lib/utils';
import { lusitana } from '@/app/ui/fonts';

export const metadata: Metadata = {
  title: 'Contacts',
};

const link =
  'rounded transition-colors hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400';

/**
 * The people an organization saved from its calls. Scoped to the signed-in
 * user's own organization; a superuser has none, so they see the explanation
 * instead (they read a tenant's contacts, when that is built, from its profile).
 */
export default async function Page() {
  const me = await currentUser();
  const organizationId =
    me && !hasRole(me.role, 'SUPERUSER')
      ? await fetchMyOrganizationId(me.id)
      : null;
  const contacts = organizationId ? await fetchContacts(organizationId) : [];

  return (
    <div className="w-full">
      <h1 className={`${lusitana.className} text-2xl`}>Contacts</h1>

      {!organizationId ? (
        <p className="mt-6 text-sm text-gray-500">
          Contacts belong to an organization, and your account isn&apos;t part
          of one.
        </p>
      ) : contacts.length === 0 ? (
        <div className="mt-6 rounded-lg bg-gray-50 p-10 text-center text-sm text-gray-500">
          No contacts yet. Open a call in Call logs and choose{' '}
          <span className="text-gray-600">Save contact</span> to keep its
          caller here.
        </div>
      ) : (
        <>
          <div className="shadow-[0_0_24px_-4px_rgba(245,184,46,0.5)] mt-6 overflow-x-auto rounded-lg border border-yellow-300/40 bg-gray-50 p-2">
            <table className="min-w-full text-left text-sm text-gray-900">
              <thead>
                <tr>
                  <th scope="col" className="px-4 py-4 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-4 font-medium">
                    Phone
                  </th>
                  <th scope="col" className="px-3 py-4 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-4 font-medium">
                    Saved
                  </th>
                  <th scope="col" className="px-3 py-4">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-100">
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b last:border-none">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {c.name ?? 'Unnamed'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <a href={`tel:${c.phone}`} className={link}>
                        {c.phone}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className={link}>
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDateToLocal(c.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <form action={deleteContact.bind(null, organizationId, c.id)}>
                        <button
                          className={`text-xs text-gray-500 ${link}`}
                          aria-label={`Remove ${c.name ?? c.phone}`}
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="shadow-[0_0_24px_-4px_rgba(245,184,46,0.5)] mt-6 overflow-x-auto rounded-lg border border-amber-100 bg-gray-50 p-2">
            <table className="min-w-full text-left text-sm text-gray-900">
              <thead>
                <tr>
                  <th scope="col" className="px-4 py-4 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-4 font-medium">
                    Phone
                  </th>
                  <th scope="col" className="px-3 py-4 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-4 font-medium">
                    Saved
                  </th>
                  <th scope="col" className="px-3 py-4">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-100">
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b last:border-none">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {c.name ?? 'Unnamed'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <a href={`tel:${c.phone}`} className={link}>
                        {c.phone}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className={link}>
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDateToLocal(c.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <form action={deleteContact.bind(null, organizationId, c.id)}>
                        <button
                          className={`text-xs text-gray-500 ${link}`}
                          aria-label={`Remove ${c.name ?? c.phone}`}
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
          </div>
          <div className="shadow-[0_0_24px_-4px_rgba(245,184,46,0.5)] mt-6 overflow-x-auto rounded-lg border border-yellow-300/40 bg-gray-50 p-2">
            <table className="min-w-full text-left text-sm text-gray-900">
              <thead>
                <tr>
                  <th scope="col" className="px-4 py-4 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-4 font-medium">
                    Phone
                  </th>
                  <th scope="col" className="px-3 py-4 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-4 font-medium">
                    Saved
                  </th>
                  <th scope="col" className="px-3 py-4">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-100">
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b last:border-none">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {c.name ?? 'Unnamed'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <a href={`tel:${c.phone}`} className={link}>
                        {c.phone}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className={link}>
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDateToLocal(c.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <form action={deleteContact.bind(null, organizationId, c.id)}>
                        <button
                          className={`text-xs text-gray-500 ${link}`}
                          aria-label={`Remove ${c.name ?? c.phone}`}
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
