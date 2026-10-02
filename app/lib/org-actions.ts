'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { withRoleAction } from '@/auth';
import {
  ORG_PLANS,
  ORG_STATUSES,
  type OrgPlan,
  type OrgStatus,
} from '@/app/lib/utils';
import { syncOrgToRetell } from '@/app/lib/retell-api';
import { db } from '@/src/prisma/db';

/**
 * Sets an organization's lifecycle status or billing plan. Superusers only —
 * the profile page is already gated the same way, but a server action is a
 * public endpoint, so it checks again rather than trusting the page that
 * renders the picker.
 */
export const updateOrgField = withRoleAction(
  'SUPERUSER',
  async (
    _me,
    orgId: string,
    slug: string,
    field: 'status' | 'plan',
    value: string,
  ) => {
    const known: readonly string[] =
      field === 'status' ? ORG_STATUSES : ORG_PLANS;
    if (!known.includes(value)) {
      return { error: `Unknown ${field}.` };
    }
    try {
      const org = db.orm.public.Organization.where({ id: orgId });
      if (field === 'status') await org.update({ status: value as OrgStatus });
      else await org.update({ plan: value as OrgPlan });
    } catch (error) {
      console.error(`Failed to update organization ${field}:`, error);
      return { error: `Could not update the ${field}. Please try again.` };
    }
    revalidatePath(`/dashboard/organizations/${slug}`);
    revalidatePath('/dashboard/organizations');
    return { ok: true as const };
  },
);

// An optional text field arrives as '' when left empty, so each rule has to
// accept that as well as a valid value.
const optional = <T extends z.ZodTypeAny>(rule: T) =>
  z.union([z.literal(''), rule]);

const emailRule = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address.');

const CreateOrgSchema = z.object({
  name: z.string().trim().min(2, 'Please enter a name.').max(120),
  email: optional(emailRule),
  phone: optional(
    z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()\-.]{6,25}$/, 'Please enter a valid phone number.'),
  ),
  // https:// is assumed when none is typed, so "acme.com" is accepted.
  website: optional(
    z
      .string()
      .trim()
      .max(200)
      .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
      .pipe(z.string().url('Please enter a valid website address.')),
  ),
  industry: z.string().trim().max(80),
  billingEmail: optional(emailRule),
  postalCode: z.string().trim().max(20),
});

export type CreateOrgInput = z.input<typeof CreateOrgSchema>;

/** "Acme Café & Co." -> "acme-cafe-co" */
function slugify(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * The form has no slug field, so one is made from the name — and, because it
 * is the unique URL key, made distinct: a second "Acme" becomes `acme-2`.
 */
async function uniqueSlug(name: string) {
  const base = slugify(name) || 'organization';
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const taken = await db.orm.public.Organization.where({ slug })
      .select('id')
      .first();
    if (!taken) return slug;
  }
}

/**
 * Creates an organization — Trial status, the Free plan, everything else on its
 * column defaults. Superusers only, checked here as well as on the page.
 */
export const createOrganization = withRoleAction(
  'SUPERUSER',
  async (_me, input: CreateOrgInput) => {
    const parsed = CreateOrgSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Check the fields.' };
    }
    const { name, email, phone, website, industry, billingEmail, postalCode } =
      parsed.data;

    try {
      await db.orm.public.Organization.create({
        name,
        slug: await uniqueSlug(name),
        // Empty fields are stored as NULL, so "not given" is one thing.
        email: email || null,
        phone: phone || null,
        website: website || null,
        industry: industry || null,
        billingEmail: billingEmail || null,
        postalCode: postalCode || null,
      });
    } catch (error) {
      // Backstop for two creates racing past the slug check.
      console.error('Failed to create organization:', error);
      return { error: 'Could not create the organization. Please try again.' };
    }

    revalidatePath('/dashboard/organizations');
    return { ok: true as const };
  },
);

const OrgSettingsSchema = z.object({
  recordCalls: z.boolean(),
  // Retell accepts 1 to 730 days.
  dataRetentionDays: z
    .number()
    .int('Retention must be a whole number of days.')
    .min(1, 'Retention must be at least 1 day.')
    .max(730, 'Retention can be at most 730 days.'),
  // null = uncapped.
  dailyBudgetCents: z
    .number()
    .int()
    .min(1, 'The daily budget must be at least $0.01, or empty for no limit.')
    .nullable(),
});

export type OrgSettingsInput = z.input<typeof OrgSettingsSchema>;

/**
 * Saves an organization's call-handling settings. Recording and retention are
 * also pushed to the organization's Retell agents, but only when one of them
 * changed, so a budget-only edit never touches Retell. The database is saved
 * first and is the source of truth: if Retell refuses, the values still stand
 * and the result says how many agents did not take them. The budget is only
 * ever kept here. Superusers only.
 */
export const updateOrgSettings = withRoleAction(
  'SUPERUSER',
  async (_me, orgId: string, slug: string, input: OrgSettingsInput) => {
    const parsed = OrgSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Check the fields.' };
    }
    const next = parsed.data;

    let retellChanged = false;
    try {
      const org = db.orm.public.Organization.where({ id: orgId });
      const before = await org
        .select('recordCalls', 'dataRetentionDays')
        .first();
      if (!before) return { error: 'That organization no longer exists.' };
      retellChanged =
        before.recordCalls !== next.recordCalls ||
        before.dataRetentionDays !== next.dataRetentionDays;
      await org.update(next);
    } catch (error) {
      console.error('Failed to update organization settings:', error);
      return { error: 'Could not save the settings. Please try again.' };
    }

    revalidatePath(`/dashboard/organizations/${slug}`);
    revalidatePath('/dashboard/organizations');

    // null means Retell could not be reached at all; the form says so.
    const sync = retellChanged
      ? await syncOrgToRetell(orgId, next).catch((error) => {
          console.error('Failed to sync organization settings:', error);
          return null;
        })
      : { total: 0, failed: 0 };
    return { ok: true as const, sync };
  },
);
