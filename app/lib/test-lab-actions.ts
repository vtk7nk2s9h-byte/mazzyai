'use server';

import { headers } from 'next/headers';
import { sign } from 'retell-sdk';

import { withRoleAction } from '@/auth';
import { sendFollowUpEmail } from '@/app/lib/follow-up-email';
import { createMeeting } from '@/app/lib/meeting-actions';
import { callSamples, emailSamples, meetingSamples } from '@/app/lib/test-lab-samples';
import { RETELL_API_KEY } from '@/lib/env';
import { db } from '@/src/prisma/db';

// Each action takes the organization and the index of a sample, never the data
// itself: what gets sent is looked up here, so the browser can't make this a
// way to send arbitrary requests.
export type LabResult = { ok: boolean; message: string };

const fail = (message: string): LabResult => ({ ok: false, message });
const DEV_ONLY = fail('The test lab is for local development only.');

/** This dev server's own address; see localOrigin in tunnel-actions.ts. */
async function localOrigin() {
  const host = (await headers()).get('host') ?? '';
  const port = /^(?:localhost|127\.0\.0\.1):(\d{2,5})$/.exec(host)?.[1] ?? '3000';
  return `http://localhost:${port}`;
}

/**
 * The Retell agent id the webhook will match to this organization. The webhook
 * maps a call to its organization through the agent, so one is needed — but
 * the id is only a lookup key and nothing here calls Retell, so an
 * organization without an agent gets a local "Test agent" with a made-up id.
 */
async function retellAgentOf(organizationId: string) {
  const agents = await db.orm.public.Agent.where({ organizationId })
    .select('retellAgentId')
    .all();
  const existing = agents.find((a) => a.retellAgentId)?.retellAgentId;
  if (existing) return existing;

  const retellAgentId = `test_agent_${organizationId}`;
  await db.orm.public.Agent.create({
    organizationId,
    name: 'Test agent',
    retellAgentId,
  });
  return retellAgentId;
}

/**
 * A whole call, as Retell would report it: started, ended, then analysed, each
 * signed locally with RETELL_API_KEY (which never leaves the server) and POSTed
 * to this app's own webhook.
 */
export const sendFakeCallAction = withRoleAction(
  'SUPERUSER',
  async (_me, organizationId: string, index: number): Promise<LabResult> => {
    if (process.env.NODE_ENV === 'production') return DEV_ONLY;
    const apiKey = RETELL_API_KEY;
    if (!apiKey) return fail('RETELL_API_KEY is not set.');
    const sample = callSamples[index];
    if (!sample) return fail('Unknown variant.');
    const agentId = await retellAgentOf(organizationId);

    const callId = `test_${crypto.randomUUID()}`;
    const end = Date.now();
    const start = end - sample.minutes * 60_000;
    const base = {
      call_id: callId,
      agent_id: agentId,
      call_type: 'phone_call',
      direction: 'inbound',
      from_number: sample.phone,
      start_timestamp: start,
      retell_llm_dynamic_variables: {
        caller_name: sample.name,
        caller_email: sample.email,
      },
    };
    const finished = {
      ...base,
      call_status: 'ended',
      end_timestamp: end,
      duration_ms: end - start,
      transcript: sample.transcript,
    };
    const events = [
      { event: 'call_started', call: { ...base, call_status: 'ongoing' } },
      { event: 'call_ended', call: finished },
      {
        event: 'call_analyzed',
        call: {
          ...finished,
          call_analysis: { call_summary: sample.summary, user_sentiment: sample.sentiment },
        },
      },
    ];

    const url = `${await localOrigin()}/api/retell/webhook`;
    for (const body of events) {
      const raw = JSON.stringify(body);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-retell-signature': await sign(raw, apiKey),
        },
        body: raw,
      });
      if (!res.ok) return fail(`${body.event} was refused: ${res.status}.`);
    }
    return { ok: true, message: `Call from ${sample.name} sent.` };
  },
);

/** Runs the follow-up mailer for a made-up call from the sample's caller. */
export const sendFakeEmailAction = withRoleAction(
  'SUPERUSER',
  async (_me, organizationId: string, index: number): Promise<LabResult> => {
    if (process.env.NODE_ENV === 'production') return DEV_ONLY;
    const sample = emailSamples[index];
    if (!sample) return fail('Unknown variant.');

    const callId = `test_${crypto.randomUUID()}`;
    await sendFollowUpEmail(organizationId, {
      call_id: callId,
      retell_llm_dynamic_variables: { caller_name: sample.name, caller_email: sample.email },
    });
    const sent = await db.orm.public.AuditLog.where({ action: 'email.sent', targetId: callId })
      .select('id')
      .first();
    return sent
      ? { ok: true, message: `Email sent to ${sample.email}.` }
      : fail(`Nothing sent: ${sample.email} already got an email in the last 24 hours.`);
  },
);

/** Books a sample meeting on the organization's agenda, as the agenda form does. */
export const bookMeetingAction = withRoleAction(
  'SUPERUSER',
  async (_me, organizationId: string, index: number): Promise<LabResult> => {
    if (process.env.NODE_ENV === 'production') return DEV_ONLY;
    const sample = meetingSamples[index];
    if (!sample) return fail('Unknown variant.');

    // Local time on the server, which on a dev machine is yours.
    const start = new Date();
    start.setDate(start.getDate() + sample.daysAhead);
    start.setHours(sample.hour, 0, 0, 0);
    const end = new Date(start.getTime() + sample.minutes * 60_000);

    const result = await createMeeting(organizationId, {
      title: sample.title,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      allDay: false,
      attendeeName: sample.attendee,
      location: sample.location,
      description: sample.description,
    });
    return 'error' in result
      ? fail(result.error)
      : { ok: true, message: `Booked "${sample.title}" with ${sample.attendee}.` };
  },
);
