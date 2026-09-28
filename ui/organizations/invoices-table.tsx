import { fetchOrgInvoicesPage } from '@/app/lib/org-data';
import { formatCurrency, formatDateToLocal } from '@/app/lib/utils';
import { InvoiceStatusBadge } from '@/app/ui/organizations/status';

/** One organization's Stripe invoices, newest billing period first. */
export default async function OrgInvoicesTable({
  organizationId,
  currentPage,
}: {
  organizationId: string;
  currentPage: number;
}) {
  const invoices = await fetchOrgInvoicesPage(organizationId, currentPage);

  if (invoices.length === 0) {
    return (
      <div className="mt-6 rounded-lg bg-gray-50 p-10 text-center text-sm text-gray-500">
        No invoices for this organization yet.
      </div>
    );
  }

  return (
    <div className="mt-6 flow-root overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          {/* Stacked cards below md, as in the other tables. */}
          <div className="md:hidden">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="mb-2 w-full rounded-md bg-gray-100 p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {formatDateToLocal(invoice.periodStart)} –{' '}
                      {formatDateToLocal(invoice.periodEnd)}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {invoice.stripeInvoiceId}
                    </p>
                  </div>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <p className="text-xl font-medium tabular-nums">
                    {formatCurrency(invoice.amountCents)}
                  </p>
                  {invoice.pdfUrl && <InvoicePdfLink href={invoice.pdfUrl} />}
                </div>
              </div>
            ))}
          </div>

          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Period
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Amount
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Paid
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  <span className="sr-only">PDF</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-100">
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <p className="font-medium">
                      {formatDateToLocal(invoice.periodStart)} –{' '}
                      {formatDateToLocal(invoice.periodEnd)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {invoice.stripeInvoiceId}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {formatCurrency(invoice.amountCents)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {invoice.paidAt ? formatDateToLocal(invoice.paidAt) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {invoice.pdfUrl && <InvoicePdfLink href={invoice.pdfUrl} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Stripe hosts the PDF, so this leaves the app. */
function InvoicePdfLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded text-xs text-gray-500 transition-colors hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
    >
      PDF
    </a>
  );
}
