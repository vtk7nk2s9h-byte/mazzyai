// Dev seed: one superuser, one organization, one agent, five calls to populate
// the call logs table, and ten more organizations so the superuser
// Organizations table has something to paginate and search. Idempotent —
// re-running reuses the existing user/org/agent, skips calls whose
// retellCallId is already present, and skips orgs whose slug already exists.
//
// Run with: pnpm db:seed
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from './db.ts';

const ORG_SLUG = 'first-org';

const SUPERUSER = {
  email: 'mazen@mazzyai.com',
  password: 'mazzyai',
  name: 'Mazen',
};

// Ten tenants across the sectors the product targets. No logoUrl on any of
// them — OrgAvatar falls back to the initials ring, which is what most real
// rows will look like anyway.
const ORG_FIXTURES = [
  {
    name: 'Bella Napoli',
    slug: 'bella-napoli',
    industry: 'restaurant',
    timezone: 'Europe/Rome',
    status: 'ACTIVE',
    plan: 'STARTER',
    minutesIncluded: 500,
    agents: [
      {
        name: 'Reservations',
        description: 'Takes table bookings and reads back the confirmation.',
        status: 'PUBLISHED',
      },
      {
        name: 'Takeaway line',
        description: 'Handles pickup orders during service.',
        status: 'PAUSED',
      },
    ],
  },
  {
    name: 'Nordlicht Zahnklinik',
    slug: 'nordlicht-zahnklinik',
    industry: 'clinic',
    timezone: 'Europe/Berlin',
    status: 'ACTIVE',
    plan: 'PRO',
    minutesIncluded: 2000,
    agents: [
      {
        name: 'Appointment desk',
        description: 'Books check-ups and reschedules cancellations.',
        status: 'PUBLISHED',
      },
      {
        name: 'Out of hours',
        description: 'Triages after-hours calls to the on-call dentist.',
        status: 'PUBLISHED',
      },
    ],
  },
  {
    name: 'Kowalski Auto Repair',
    slug: 'kowalski-auto-repair',
    industry: 'repair_shop',
    timezone: 'Europe/Warsaw',
    status: 'TRIAL',
    plan: 'FREE',
    minutesIncluded: 100,
    agents: [
      {
        name: 'Service intake',
        description: 'Collects plate, symptom and preferred drop-off slot.',
        status: 'DRAFT',
      },
    ],
  },
  {
    name: 'Harbour Dental Group',
    slug: 'harbour-dental-group',
    industry: 'clinic',
    timezone: 'Europe/Dublin',
    status: 'PAST_DUE',
    plan: 'PRO',
    minutesIncluded: 2000,
    agents: [
      {
        name: 'Front desk',
        description: 'Answers the main line across all three branches.',
        status: 'PUBLISHED',
      },
    ],
  },
  {
    name: 'Sunset Barbers',
    slug: 'sunset-barbers',
    industry: 'salon',
    timezone: 'Europe/Lisbon',
    status: 'ACTIVE',
    plan: 'STARTER',
    minutesIncluded: 500,
    agents: [
      {
        name: 'Chair booking',
        description: 'Books cuts by barber and sends a reminder.',
        status: 'PUBLISHED',
      },
    ],
  },
  {
    name: 'Alpine Ski Rentals',
    slug: 'alpine-ski-rentals',
    industry: 'rental',
    timezone: 'Europe/Zurich',
    status: 'CHURNED',
    plan: 'FREE',
    minutesIncluded: 0,
    agents: [
      {
        name: 'Season line',
        description: 'Quoted rental packages over the winter season.',
        status: 'ARCHIVED',
      },
    ],
  },
  {
    name: 'Meridian Legal',
    slug: 'meridian-legal',
    industry: 'law_firm',
    timezone: 'Europe/London',
    status: 'ACTIVE',
    plan: 'ENTERPRISE',
    minutesIncluded: 10000,
    agents: [
      {
        name: 'New matter intake',
        description: 'Screens enquiries and routes them to a practice group.',
        status: 'PUBLISHED',
      },
      {
        name: 'Billing questions',
        description: 'Answers invoice queries from existing clients.',
        status: 'DRAFT',
      },
    ],
  },
  {
    name: 'Casa Verde Jardineria',
    slug: 'casa-verde-jardineria',
    industry: 'landscaping',
    timezone: 'Europe/Madrid',
    status: 'TRIAL',
    plan: 'FREE',
    minutesIncluded: 100,
    agents: [
      {
        name: 'Quote line',
        description: 'Takes garden size and job type for a call-back quote.',
        status: 'DRAFT',
      },
    ],
  },
  {
    name: 'Brightpath Tutoring',
    slug: 'brightpath-tutoring',
    industry: 'education',
    timezone: 'Europe/Amsterdam',
    status: 'ACTIVE',
    plan: 'STARTER',
    minutesIncluded: 500,
    agents: [
      {
        name: 'Enrolment',
        description: 'Matches a subject and level to an available tutor.',
        status: 'PUBLISHED',
      },
    ],
  },
  {
    name: 'Vantage Property Care',
    slug: 'vantage-property-care',
    industry: 'property_management',
    timezone: 'Europe/Vienna',
    status: 'SUSPENDED',
    plan: 'PRO',
    minutesIncluded: 2000,
    agents: [
      {
        name: 'Maintenance line',
        description: 'Logs tenant repair requests and flags emergencies.',
        status: 'PAUSED',
      },
      {
        name: 'Viewings',
        description: 'Books flat viewings against the agent calendar.',
        status: 'ARCHIVED',
      },
    ],
  },
] as const;

// Derived from the slug rather than written out per org: twelve calls of
// hand-written prose would say nothing the shapes below don't, and every id
// stays unique and stable across runs so re-seeding is a no-op.
const CALL_SHAPES = [
  {
    direction: 'INBOUND',
    status: 'ANALYZED',
    sentiment: 'POSITIVE',
    day: '2026-09-25',
    time: '09:12',
    durationMs: 142_000,
    costCents: 38,
    callerName: 'Ana Ruiz',
    summary: 'Asked for the next available slot and took the first offered.',
    disconnectReason: 'user_hangup',
  },
  {
    direction: 'INBOUND',
    status: 'ANALYZED',
    sentiment: 'NEUTRAL',
    day: '2026-09-26',
    time: '14:48',
    durationMs: 61_000,
    costCents: 17,
    callerName: 'Jonas Weber',
    summary: 'Checked opening hours for the weekend.',
    disconnectReason: 'user_hangup',
  },
  {
    direction: 'OUTBOUND',
    status: 'ENDED',
    sentiment: 'NEGATIVE',
    day: '2026-09-27',
    time: '11:05',
    durationMs: 208_000,
    costCents: 55,
    callerName: 'Priya Nair',
    summary: 'Chased an unresolved request; escalated to a human.',
    disconnectReason: 'agent_hangup',
  },
] as const;

function callsFor(slug: string) {
  return CALL_SHAPES.map(({ day, time, ...shape }, i) => {
    const startedAt = `${day}T${time}:00Z`;
    return {
      ...shape,
      retellCallId: `call_${slug.replace(/-/g, '_')}_${i + 1}`,
      fromNumber: `+4915${String(1000000 + i).slice(0, 7)}`,
      toNumber: '+4930123456',
      startedAt,
      endedAt: new Date(
        Date.parse(startedAt) + shape.durationMs,
      ).toISOString(),
    };
  });
}

// Three monthly periods ending with the current one, so the newest-first
// ordering and the status ladder (paid -> paid -> open) are both visible.
const INVOICE_PERIODS = [
  { start: '2026-07-01', end: '2026-07-31', status: 'PAID', paid: '2026-08-02' },
  { start: '2026-08-01', end: '2026-08-31', status: 'PAID', paid: '2026-09-02' },
  { start: '2026-09-01', end: '2026-09-30', status: 'OPEN', paid: null },
] as const;

function invoicesFor(slug: string) {
  return INVOICE_PERIODS.map((period, i) => ({
    stripeInvoiceId: `in_${slug.replace(/-/g, '_')}_${i + 1}`,
    // Cents, never a float — see the money convention in contract.prisma.
    amountCents: 4900 + i * 1100,
    status: period.status,
    periodStart: `${period.start}T00:00:00Z`,
    periodEnd: `${period.end}T23:59:59Z`,
    paidAt: period.paid ? `${period.paid}T09:00:00Z` : null,
    pdfUrl: null,
  }));
}

async function main() {
  // auth.ts looks the account up by lowercased email and compares against
  // passwordHash, so the seed writes exactly what Credentials sign-in reads.
  const passwordHash = await bcrypt.hash(SUPERUSER.password, 10);
  const existingUser = await db.orm.public.User.where({
    email: SUPERUSER.email,
  })
    .select('id')
    .first();

  if (existingUser) {
    // Re-running resets the password and re-asserts the role, so a demoted or
    // locked-out dev account comes back without a manual SQL fix.
    await db.orm.public.User.where({ id: existingUser.id }).update({
      passwordHash,
      systemRole: 'SUPERUSER',
      status: 'ACTIVE',
    });
    console.log('updated superuser:', SUPERUSER.email);
  } else {
    await db.orm.public.User.create({
      email: SUPERUSER.email,
      name: SUPERUSER.name,
      passwordHash,
      systemRole: 'SUPERUSER',
      status: 'ACTIVE',
    });
    console.log('created superuser:', SUPERUSER.email);
  }

  let org = await db.orm.public.Organization.where({ slug: ORG_SLUG })
    .select('id', 'name')
    .first();

  if (!org) {
    await db.orm.public.Organization.create({
      name: 'First Org',
      slug: ORG_SLUG,
      industry: 'restaurant',
      timezone: 'Europe/Berlin',
      billingEmail: 'billing@first-org.test',
      notificationEmail: 'ops@first-org.test',
      minutesIncluded: 500,
    });
    org = await db.orm.public.Organization.where({ slug: ORG_SLUG })
      .select('id', 'name')
      .first();
    console.log('created organization:', org!.name);
  } else {
    console.log('reusing organization:', org.name);
  }

  let agent = await db.orm.public.Agent.where({ organizationId: org!.id })
    .select('id', 'name')
    .first();

  if (!agent) {
    await db.orm.public.Agent.create({
      organizationId: org!.id,
      name: 'Front desk',
      description: 'Answers the main line and takes bookings.',
      status: 'PUBLISHED',
    });
    agent = await db.orm.public.Agent.where({ organizationId: org!.id })
      .select('id', 'name')
      .first();
    console.log('created agent:', agent!.name);
  } else {
    console.log('reusing agent:', agent.name);
  }

  // Spread across a few days so the "most recent first" ordering is visible.
  const calls = [
    {
      retellCallId: 'call_seed_001',
      direction: 'INBOUND',
      status: 'ANALYZED',
      sentiment: 'POSITIVE',
      fromNumber: '+4915112345678',
      toNumber: '+4930123456',
      callerName: 'Lena Fischer',
      startedAt: '2026-09-22T09:14:02Z',
      endedAt: '2026-09-22T09:16:41Z',
      durationMs: 159_000,
      costCents: 42,
      summary: 'Booked a table for four on Friday at 19:30.',
      disconnectReason: 'user_hangup',
    },
    {
      retellCallId: 'call_seed_002',
      direction: 'INBOUND',
      status: 'ANALYZED',
      sentiment: 'NEUTRAL',
      fromNumber: '+4917655544433',
      toNumber: '+4930123456',
      callerName: 'Tomasz Nowak',
      startedAt: '2026-09-22T13:02:55Z',
      endedAt: '2026-09-22T13:03:48Z',
      durationMs: 53_000,
      costCents: 15,
      summary: 'Asked about opening hours on public holidays.',
      disconnectReason: 'user_hangup',
    },
    {
      retellCallId: 'call_seed_003',
      direction: 'OUTBOUND',
      status: 'ENDED',
      sentiment: 'POSITIVE',
      fromNumber: '+4930123456',
      toNumber: '+4916099887766',
      callerName: 'Sofia Marino',
      startedAt: '2026-09-23T10:40:11Z',
      endedAt: '2026-09-23T10:44:02Z',
      durationMs: 231_000,
      costCents: 61,
      summary: 'Confirmed a rescheduled reservation for Sunday lunch.',
      disconnectReason: 'agent_hangup',
    },
    {
      retellCallId: 'call_seed_004',
      direction: 'WEB',
      status: 'ANALYZED',
      sentiment: 'NEGATIVE',
      callerName: 'Web visitor',
      startedAt: '2026-09-23T17:21:30Z',
      endedAt: '2026-09-23T17:22:06Z',
      durationMs: 36_000,
      costCents: 9,
      summary: 'Complaint about a late delivery; transferred to a human.',
      transferredTo: '+4930123499',
      transferredAt: '2026-09-23T17:22:01Z',
      disconnectReason: 'transferred',
    },
    {
      retellCallId: 'call_seed_005',
      direction: 'INBOUND',
      status: 'FAILED',
      sentiment: 'UNKNOWN',
      fromNumber: '+4915209876543',
      toNumber: '+4930123456',
      startedAt: '2026-09-24T08:05:12Z',
      durationMs: 4_000,
      costCents: 0,
      disconnectReason: 'dial_no_answer',
    },
  ] as const;

  let created = 0;
  for (const call of calls) {
    const exists = await db.orm.public.Call.where({
      retellCallId: call.retellCallId,
    })
      .select('id')
      .first();
    if (exists) continue;

    await db.orm.public.Call.create({
      ...call,
      organizationId: org!.id,
      agentId: agent!.id,
      // No column default exists for a Json list, so every create must pass it.
      rawEvents: [],
    });
    created += 1;
  }

  console.log(`calls created: ${created} (${calls.length - created} already present)`);

  // Eleven orgs in total, so the Organizations table (10 per page) spans two
  // pages. Statuses and plans are spread across the enums so every badge
  // variant is visible without editing rows by hand, and each org carries one
  // or two agents.
  let orgsCreated = 0;
  for (const { agents, ...fixture } of ORG_FIXTURES) {
    const exists = await db.orm.public.Organization.where({
      slug: fixture.slug,
    })
      .select('id')
      .first();
    if (exists) continue;

    await db.orm.public.Organization.create({
      ...fixture,
      billingEmail: `billing@${fixture.slug}.test`,
      notificationEmail: `ops@${fixture.slug}.test`,
    });

    const { id } = (await db.orm.public.Organization.where({
      slug: fixture.slug,
    })
      .select('id')
      .first())!;

    for (const a of agents) {
      await db.orm.public.Agent.create({ ...a, organizationId: id });
    }
    orgsCreated += 1;
  }

  console.log(
    `organizations created: ${orgsCreated} (${ORG_FIXTURES.length - orgsCreated} already present)`,
  );

  // Calls and invoices for every fixture org, so the two tables on an
  // organization's page have something to show. A separate pass rather than
  // part of the block above: orgs seeded by an earlier run are skipped there,
  // and they need this data too. Both are keyed by their unique provider id,
  // so re-running adds nothing.
  let callsCreated = 0;
  let invoicesCreated = 0;

  for (const fixture of ORG_FIXTURES) {
    const seeded = await db.orm.public.Organization.where({
      slug: fixture.slug,
    })
      .select('id')
      .include('agents', (a) => a.select('id').limit(1))
      .first();
    if (!seeded) continue;

    const agentId = seeded.agents[0]?.id;
    if (agentId) {
      for (const call of callsFor(fixture.slug)) {
        const present = await db.orm.public.Call.where({
          retellCallId: call.retellCallId,
        })
          .select('id')
          .first();
        if (present) continue;

        await db.orm.public.Call.create({
          ...call,
          organizationId: seeded.id,
          agentId,
          // No column default exists for a Json list — see Call.rawEvents.
          rawEvents: [],
        });
        callsCreated += 1;
      }
    }

    for (const invoice of invoicesFor(fixture.slug)) {
      const present = await db.orm.public.Invoice.where({
        stripeInvoiceId: invoice.stripeInvoiceId,
      })
        .select('id')
        .first();
      if (present) continue;

      await db.orm.public.Invoice.create({
        ...invoice,
        organizationId: seeded.id,
      });
      invoicesCreated += 1;
    }
  }

  console.log(`tenant calls created: ${callsCreated}`);
  console.log(`invoices created: ${invoicesCreated}`);
}

await main();
await db.close();
