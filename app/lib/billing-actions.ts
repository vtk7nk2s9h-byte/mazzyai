'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { hasRole, withRoleAction, type SessionUser } from '@/auth';
import { fetchAgentsOrganizationId } from '@/app/lib/agent-data';
import { CARD_BRANDS, PLAN_TERMS } from '@/app/lib/billing';
import { ORG_PLANS, type OrgPlan } from '@/app/lib/utils';
import { db } from '@/src/prisma/db';

/**
 * Billing belongs to an organization's owners and admins, and to superusers
 * (who reach it from the organization's profile). Checked here, not just on
 * the page: a server action is a public endpoint and `organizationId` comes
 * from the client.
 */
async function mayManage(me: SessionUser, organizationId: string) {
  return (
    hasRole(me.role, 'SUPERUSER') ||
    (await fetchAgentsOrganizationId(me.id)) === organizationId
  );
}

const denied = { error: 'You do not have permission to do that.' };

function refresh() {
  revalidatePath('/dashboard/invoices');
  revalidatePath('/dashboard/organizations/[slug]', 'page');
}

const CardSchema = z
  .object({
    brand: z.enum(CARD_BRANDS, { message: 'Pick a card brand.' }),
    last4: z.string().regex(/^\d{4}$/, 'Enter the last 4 digits of the card.'),
    expMonth: z.coerce
      .number()
      .int()
      .min(1, 'Month is 1-12.')
      .max(12, 'Month is 1-12.'),
    expYear: z.coerce.number().int().min(2000).max(2100),
    holderName: z.string().trim().min(1, 'Enter the cardholder name.').max(120),
    billingAddress: z.string().trim().max(240),
    isDefault: z.boolean(),
  })
  .refine(
    (c) => {
      const now = new Date();
      return (
        c.expYear > now.getFullYear() ||
        (c.expYear === now.getFullYear() && c.expMonth >= now.getMonth() + 1)
      );
    },
    { message: 'That card has expired.', path: ['expYear'] },
  );

export type CardInput = z.input<typeof CardSchema>;

/** Adds a card, or edits one when `id` is given. Only the summary is stored. */
export const savePaymentMethod = withRoleAction(
  'USER',
  async (me, organizationId: string, id: string | null, input: CardInput) => {
    if (!(await mayManage(me, organizationId))) return denied;
    const parsed = CardSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Check the fields.' };
    }
    const { billingAddress, isDefault, ...card } = parsed.data;

    try {
      const cards = db.orm.public.PaymentMethod;
      const existing = await cards
        .where({ organizationId })
        .select('id', 'isDefault')
        .all();
      if (id && !existing.some((c) => c.id === id)) {
        return { error: 'That card no longer exists.' };
      }
      // The first card is the default; otherwise the box decides, and editing
      // the default card can't leave the organization with none.
      const makeDefault =
        isDefault ||
        existing.length === 0 ||
        existing.find((c) => c.id === id)?.isDefault === true;
      if (makeDefault) {
        for (const other of existing.filter((c) => c.id !== id && c.isDefault)) {
          await cards.where({ id: other.id }).update({ isDefault: false });
        }
      }
      const data = {
        ...card,
        billingAddress: billingAddress || null,
        isDefault: makeDefault,
      };
      if (id) await cards.where({ id, organizationId }).update(data);
      else await cards.create({ ...data, organizationId });
    } catch (error) {
      console.error('Failed to save payment method:', error);
      return { error: 'Could not save the card. Please try again.' };
    }
    refresh();
    return { ok: true as const };
  },
);

/** Deletes a card; if it was the default, the oldest remaining one takes over. */
export const deletePaymentMethod = withRoleAction(
  'USER',
  async (me, organizationId: string, id: string) => {
    if (!(await mayManage(me, organizationId))) return denied;
    try {
      const cards = db.orm.public.PaymentMethod;
      const rows = await cards
        .where({ organizationId })
        .select('id', 'isDefault')
        .orderBy((p) => p.createdAt.asc())
        .all();
      const gone = rows.find((c) => c.id === id);
      if (!gone) return { error: 'That card no longer exists.' };
      await cards.where({ id, organizationId }).delete();
      const next = rows.find((c) => c.id !== id);
      if (gone.isDefault && next) {
        await cards.where({ id: next.id }).update({ isDefault: true });
      }
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      return { error: 'Could not delete the card. Please try again.' };
    }
    refresh();
    return { ok: true as const };
  },
);

/**
 * Moves the subscription to another plan. Included minutes and the overage
 * rate follow the plan, and the organization's own plan field is kept in step.
 * Status and billing dates are not editable here.
 */
export const changePlan = withRoleAction(
  'USER',
  async (me, organizationId: string, plan: string) => {
    if (!(await mayManage(me, organizationId))) return denied;
    if (!(ORG_PLANS as readonly string[]).includes(plan)) {
      return { error: 'Unknown plan.' };
    }
    const terms = PLAN_TERMS[plan as OrgPlan];
    try {
      await db.orm.public.Subscription.where({ organizationId }).update({
        plan: plan as OrgPlan,
        stripePriceId: `price_${plan.toLowerCase()}`,
        minutesIncluded: terms.minutes,
        overageRateCentsPerMinute: terms.overageCents,
      });
      await db.orm.public.Organization.where({ id: organizationId }).update({
        plan: plan as OrgPlan,
      });
    } catch (error) {
      console.error('Failed to change plan:', error);
      return { error: 'Could not change the plan. Please try again.' };
    }
    refresh();
    return { ok: true as const };
  },
);

/** Cancels at the end of the current period, or takes the cancellation back. */
export const setCancelAtPeriodEnd = withRoleAction(
  'USER',
  async (me, organizationId: string, cancel: boolean) => {
    if (!(await mayManage(me, organizationId))) return denied;
    try {
      await db.orm.public.Subscription.where({ organizationId }).update({
        cancelAtPeriodEnd: cancel,
        canceledAt: cancel ? new Date().toISOString() : null,
      });
    } catch (error) {
      console.error('Failed to update cancellation:', error);
      return { error: 'Could not update the subscription. Please try again.' };
    }
    refresh();
    return { ok: true as const };
  },
);
