import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { currentUser, hasRole } from '@/auth';
import { fetchCall, fetchCallEmails } from '@/app/lib/call-data';
import { fetchMyOrganizationId } from '@/app/lib/meeting-data';
import {
  callerLabel,
  EMAIL_TYPE_LABELS,
  formatCurrency,
  formatDuration,
} from '@/app/lib/utils';
import {
  CallDirectionBadge,
  CallStatusBadge,
  SentimentDot,
} from '@/app/ui/call-logs/status';
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import { Field, Section, Toggle } from '@/app/ui/organizations/field';
import { EmailSentBadge, label } from '@/app/ui/organizations/status';

export const metadata: Metadata = {
  title: 'Call',
};

/** "Oct 2, 2026, 10:00 AM" — a call needs the time, not just the day. */
const when = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : null;

/** A Json column as label/value rows, when it is an object with anything in it. */
function entriesOf(value: unknown): [string, string][] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).map(([k, v]) => [
    k,
    typeof v === 'string' ? v : JSON.stringify(v),
  ]);
}

export default async function Page(props: {
  params: Promise<{ id: string }>;
}) {
  const me = await currentUser();
  if (!me) notFound();

  const { id } = await props.params;
  const call = await fetchCall(id);
  if (!call) notFound();

  // A superuser may open any call; everyone else only their own organization's.
  // notFound() either way, so a call in someone else's organization looks the
  // same as one that doesn't exist.
  const isSuperuser = hasRole(me.role, 'SUPERUSER');
  if (!isSuperuser) {
    const mine = await fetchMyOrganizationId(me.id);
    if (!mine || mine !== call.organizationId) notFound();
  }

  const caller = callerLabel(call);
  const variables = entriesOf(call.dynamicVariables);
  const collected = entriesOf(call.collectedVariables);
  const emails = await fetchCallEmails(call.retellCallId);
  // What the caller typed into the widget; "not provided" is its placeholder.
  const typed = (call.dynamicVariables as Record<string, unknown> | null)
    ?.caller_email;
  const callerEmail =
    typeof typed === 'string' && typed.includes('@') ? typed : null;

  return (
    <div className="w-full">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Call logs', href: '/dashboard/call-logs' },
          {
            label: caller,
            href: `/dashboard/call-logs/${call.id}`,
            active: true,
          },
        ]}
      />

      {/* Who and how it went, before any detail. */}
      <div className="flex flex-col gap-4 rounded-lg bg-gray-50 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 grow">
          <h1 className="truncate text-xl font-medium text-gray-900">
            {caller}
          </h1>
          <p className="truncate text-sm text-gray-500">
            {call.agent?.name ?? 'Unknown agent'}
            {call.startedAt && ` · ${when(call.startedAt)}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <CallDirectionBadge direction={call.direction} />
          <CallStatusBadge status={call.status} />
          <SentimentDot sentiment={call.sentiment} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Call" description="What happened and how long it took.">
          <Field label="Direction">{label(call.direction)}</Field>
          <Field label="Status">{label(call.status)}</Field>
          <Field label="Agent">{call.agent?.name}</Field>
          <Field label="Organization">
            {isSuperuser && call.organization ? (
              <Link
                href={`/dashboard/organizations/${call.organization.slug}`}
                className="rounded transition-colors hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
              >
                {call.organization.name}
              </Link>
            ) : (
              call.organization?.name
            )}
          </Field>
          <Field label="Started">{when(call.startedAt)}</Field>
          <Field label="Ended">{when(call.endedAt)}</Field>
          <Field label="Duration">
            {call.durationMs != null && (
              <span className="tabular-nums">
                {formatDuration(call.durationMs)}
              </span>
            )}
          </Field>
          <Field label="Cost">
            {call.costCents != null && (
              <span className="tabular-nums">
                {formatCurrency(call.costCents)}
              </span>
            )}
          </Field>
          <Field label="Ended because">
            {call.disconnectReason && label(call.disconnectReason)}
          </Field>
        </Section>

        <Section title="Caller" description="Who was on the line.">
          <Field label="Name">{call.callerName}</Field>
          <Field label="From">{call.fromNumber}</Field>
          <Field label="To">{call.toNumber}</Field>
          <Field label="Transferred to">{call.transferredTo}</Field>
          <Field label="Transferred at">{when(call.transferredAt)}</Field>
          <Field label="Consent to record">
            <Toggle on={call.consentToRecord} />
          </Field>
          <Field label="Recording">
            {call.recordingUrl && (
              <a
                href={call.recordingUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded transition-colors hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
              >
                Open recording
              </a>
            )}
          </Field>
          <Field label="Retell call">
            <code className="text-xs">{call.retellCallId}</code>
          </Field>
        </Section>
      </div>

      <div className="mt-4 grid gap-4">
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

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {variables.length > 0 && (
              <Section
                title="Sent to the agent"
                description="Variables passed in when the call started."
              >
                {variables.map(([k, v]) => (
                  <Field key={k} label={k}>
                    {v}
                  </Field>
                ))}
              </Section>
            )}
            {collected.length > 0 && (
              <Section
                title="Collected during the call"
                description="Values the agent picked up."
              >
                {collected.map(([k, v]) => (
                  <Field key={k} label={k}>
                    {v}
                  </Field>
                ))}
              </Section>
            )}
          <Section
            title="Email"
            description="Track emailing"
          >
            <Field label="Email">{callerEmail ?? 'None provided'}</Field>
            <Field label="Sent email">
              <span className="inline-flex flex-wrap items-center justify-end gap-2">
                {emails.length > 1 && (
                  <span className="text-xs text-gray-500">
                    {emails.length} emails
                  </span>
                )}
                <EmailSentBadge sent={emails.length > 0} />
              </span>
            </Field>
            {emails.map((e) => (
              <div
                key={e.id}
                className="mt-2 rounded-md border border-white/[0.07] bg-black/20 p-3 text-sm"
              >
                <p className="font-medium text-gray-900">
                  {e.subject ?? 'No subject'}
                </p>
                <p className="text-xs text-gray-500">
                  To {e.to ?? 'unknown'} · {when(e.sentAt)}
                </p>
                <p className="mt-1 text-xs text-gray-500">Type: {EMAIL_TYPE_LABELS[e.type]}</p>
              </div>
            ))}
            {emails.length === 0 && callerEmail && (
              <p className="mt-2 text-xs text-gray-500">
                A follow-up goes out once the call is analysed, at most one per
                call and one per address per day.
              </p>
            )}
          </Section>
        </div>

        {/* The raw webhook payloads are for debugging, so for superusers only. */}
        {isSuperuser && call.rawEvents.length > 0 && (
          <Section
            title="Raw events"
            description={`${call.rawEvents.length} webhook payload${call.rawEvents.length === 1 ? '' : 's'} received from Retell.`}
          >
            <details className="group">
              <summary className="cursor-pointer list-none text-xs text-gray-500 transition-colors hover:text-brand-red-lit [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Show payloads</span>
                <span className="hidden group-open:inline">Hide payloads</span>
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-white/[0.07] bg-black/20 p-4 text-xs text-gray-600">
                {JSON.stringify(call.rawEvents, null, 2)}
              </pre>
            </details>
          </Section>
        )}
      </div>
    </div>
  );
}
