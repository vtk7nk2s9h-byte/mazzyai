import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { currentUser, hasRole } from '@/auth';
import { fetchCall } from '@/app/lib/call-data';
import { fetchMyOrganizationId } from '@/app/lib/meeting-data';
import { callerLabel } from '@/app/lib/utils';
import Breadcrumbs from '@/app/ui/breadcrumbs';
import { Field, Section } from '@/app/ui/organizations/field';

export const metadata: Metadata = {
  title: 'Caller',
};

const reachLink =
  'rounded transition-colors hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400';

/**
 * The person behind a call: who they are, how to reach them, and what was said.
 * Lives under the call it belongs to, so the summary and transcript are read
 * with the caller rather than among the call's own figures.
 */
export default async function Page(props: {
  params: Promise<{ id: string }>;
}) {
  const me = await currentUser();
  if (!me) notFound();

  const { id } = await props.params;
  const call = await fetchCall(id);
  if (!call) notFound();

  // Same rule as the call page: a superuser may open any call, everyone else
  // only their own organization's, and anything else looks like it isn't there.
  if (!hasRole(me.role, 'SUPERUSER')) {
    const mine = await fetchMyOrganizationId(me.id);
    if (!mine || mine !== call.organizationId) notFound();
  }

  const caller = callerLabel(call);
  // What the caller typed into the widget; "not provided" is its placeholder.
  const typed = (call.dynamicVariables as Record<string, unknown> | null)
    ?.caller_email;
  const email =
    typeof typed === 'string' && typed.includes('@') ? typed : null;

  return (
    <div className="w-full">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Call logs', href: '/dashboard/call-logs' },
          {
            label: `${caller} call`,
            href: `/dashboard/call-logs/${call.id}`,
          },
          {
            label: caller,
            href: `/dashboard/call-logs/${call.id}/caller`,
            active: true,
          },
        ]}
      />

      <div className="grid gap-4">
        <Section title="Caller" description="Who was on the line.">
          <Field label="Name">{call.callerName}</Field>
          <Field label="Phone">
            {call.fromNumber && (
              <a href={`tel:${call.fromNumber}`} className={reachLink}>
                {call.fromNumber}
              </a>
            )}
          </Field>
          <Field label="Email">
            {email && (
              <a href={`mailto:${email}`} className={reachLink}>
                {email}
              </a>
            )}
          </Field>
        </Section>

        <Section title="Summary" description="Written by Retell after the call.">
          {call.summary ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
              {call.summary}
            </p>
          ) : (
            <p className="text-sm text-gray-400">No summary yet.</p>
          )}
        </Section>

        <Section title="Transcript" description="Everything said on the call.">
          {call.transcript ? (
            <p className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-white/[0.07] bg-black/20 p-4 text-sm leading-relaxed text-gray-600">
              {call.transcript}
            </p>
          ) : (
            <p className="text-sm text-gray-400">No transcript.</p>
          )}
        </Section>
      </div>
    </div>
  );
}
