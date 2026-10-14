import { fetchPaymentMethods, fetchSubscription } from '@/app/lib/billing-data';
import { lusitana } from '@/app/ui/fonts';
import PaymentMethods from '@/app/ui/billing/payment-methods';
import Subscription from '@/app/ui/billing/subscription';

/**
 * One organization's payment information and subscription, side by side with
 * its invoices. Server side, so the queries run here and only plain rows cross
 * into the client sections. Shared by the Invoices page (the signed-in admin's
 * own organization) and the organization profile (any org, for a superuser).
 */
export default async function Billing({
  organizationId,
}: {
  organizationId: string;
}) {
  const [methods, subscription] = await Promise.all([
    fetchPaymentMethods(organizationId),
    fetchSubscription(organizationId),
  ]);

  return (
    <>
      <div className="mt-10">
        <PaymentMethods
          organizationId={organizationId}
          methods={methods}
          heading={
            <h2 className={`${lusitana.className} page-heading text-2xl`}>Payment information</h2>
          }
        />
      </div>

      <h2 className={`${lusitana.className} page-heading mt-10 text-2xl`}>Subscription</h2>
      <div className="mt-4">
        {subscription ? (
          <Subscription organizationId={organizationId} subscription={subscription} />
        ) : (
          <p className="text-sm text-gray-500">This organization has no subscription yet.</p>
        )}
      </div>
    </>
  );
}
