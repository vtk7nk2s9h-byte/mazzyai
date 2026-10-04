import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { currentUser, hasRole } from '@/auth';
import { lusitana } from '@/app/ui/fonts';
import {
  bookMeetingAction,
  sendFakeCallAction,
  sendFakeEmailAction,
} from '@/app/lib/test-lab-actions';
import { callSamples, emailSamples, meetingSamples } from '@/app/lib/test-lab-samples';
import RequestCard from '@/app/ui/test-lab/send-form';
import { db } from '@/src/prisma/db';

export const metadata: Metadata = {
  title: 'Test lab',
};

const field =
  'rounded-md border border-white/[0.12] bg-transparent px-2 py-1.5 text-xs [&>option]:bg-gray-100';

/** Dev-only, superuser-only: one-click fake events for one organization. */
export default async function Page(props: {
  searchParams?: Promise<{ org?: string }>;
}) {
  const me = await currentUser();
  if (process.env.NODE_ENV === 'production' || !me || !hasRole(me.role, 'SUPERUSER')) {
    notFound();
  }

  const organizations = await db.orm.public.Organization.select('id', 'name', 'slug')
    .orderBy((o) => o.name.asc())
    .all();
  const { org } = (await props.searchParams) ?? {};
  const selected = organizations.find((o) => o.id === org) ?? organizations[0];

  return (
    <div className="w-full">
      <h1 className={`${lusitana.className} mb-4 text-2xl`}>Test lab</h1>

      <form className="mb-4 flex flex-wrap items-center gap-3">
        <select name="org" defaultValue={selected?.id} aria-label="Organization" className={field}>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:text-brand-red-lit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit">
          Use this organization
        </button>
        {selected && (
          <Link
            href={`/dashboard/organizations/${selected.slug}`}
            target="_blank"
            className="text-xs text-gray-600 underline"
          >
            Open {selected.name} in a new tab to watch it
          </Link>
        )}
      </form>

      {selected && (
        <div className="grid gap-4 lg:grid-cols-3">
          <RequestCard
            title="Call"
            description="A full call: started, ended, then analysed, sent to this server's webhook."
            action={sendFakeCallAction}
            organizationId={selected.id}
            variants={callSamples.map((s) => ({
              heading: `${s.name} · ${s.minutes} min · ${s.sentiment}`,
              lines: [s.summary],
            }))}
          />
          <RequestCard
            title="Meeting"
            description="Books a meeting on this organization's agenda."
            action={bookMeetingAction}
            organizationId={selected.id}
            variants={meetingSamples.map((s) => ({
              heading: s.title,
              lines: [
                `${s.attendee} · ${s.location}`,
                `In ${s.daysAhead} day${s.daysAhead > 1 ? 's' : ''} at ${s.hour}:00, ${s.minutes} min`,
              ],
            }))}
          />
          <RequestCard
            title="Follow-up email"
            description="Sends the follow-up email to a sample caller."
            action={sendFakeEmailAction}
            organizationId={selected.id}
            variants={emailSamples.map((s) => ({ heading: s.name, lines: [s.email] }))}
          />
        </div>
      )}
    </div>
  );
}
