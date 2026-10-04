import { db } from '@/src/prisma/db';

/** An organization's saved cards, default first. */
export async function fetchPaymentMethods(organizationId: string) {
  try {
    const rows = await db.orm.public.PaymentMethod.where({ organizationId })
      .select(
        'id',
        'brand',
        'last4',
        'expMonth',
        'expYear',
        'holderName',
        'billingAddress',
        'isDefault',
      )
      .orderBy((p) => p.createdAt.asc())
      .all();
    return rows.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch payment methods.');
  }
}

/** An organization's subscription, or null when it has none. */
export async function fetchSubscription(organizationId: string) {
  try {
    return await db.orm.public.Subscription.where({ organizationId })
      .select(
        'plan',
        'status',
        'minutesIncluded',
        'overageRateCentsPerMinute',
        'currentPeriodStart',
        'currentPeriodEnd',
        'cancelAtPeriodEnd',
      )
      .first();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the subscription.');
  }
}

// Imports the Prisma client, so never pull this into a client component.
export type PaymentMethodRow = Awaited<
  ReturnType<typeof fetchPaymentMethods>
>[number];
export type SubscriptionRow = NonNullable<
  Awaited<ReturnType<typeof fetchSubscription>>
>;
