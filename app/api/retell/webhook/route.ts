import Retell from 'retell-sdk';
import type { JsonValue } from '@prisma/orm-postgres/target/codec-types';

import { sendFollowUpEmail } from '@/app/lib/follow-up-email';
import { db } from '@/src/prisma/db';

// Retell POSTs here when a call starts, ends and has been analysed. The route
// sits under /api, which proxy.ts leaves alone, so no login is needed — the
// signature is the only credential, and it is checked before anything is read.
//
// Point Retell at https://<host>/api/retell/webhook: the Webhooks tab of the
// Retell dashboard covers every agent; an agent's own `webhook_url` overrides it.

type RetellCall = {
  call_id: string;
  agent_id: string;
  call_type: 'phone_call' | 'web_call';
  direction?: 'inbound' | 'outbound';
  call_status?: 'registered' | 'not_connected' | 'ongoing' | 'ended' | 'error';
  from_number?: string;
  to_number?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  disconnection_reason?: string;
  transfer_destination?: string | null;
  recording_url?: string;
  transcript?: string;
  retell_llm_dynamic_variables?: Record<string, JsonValue>;
  collected_dynamic_variables?: Record<string, JsonValue>;
  call_analysis?: { call_summary?: string; user_sentiment?: string };
  call_cost?: { combined_cost?: number };
};

type CallStatus = 'REGISTERED' | 'ONGOING' | 'ENDED' | 'ANALYZED' | 'FAILED';

// A late or retried event must never move a call backwards, e.g. a repeated
// call_ended arriving after call_analyzed.
const RANK: Record<CallStatus, number> = {
  REGISTERED: 0,
  ONGOING: 1,
  ENDED: 2,
  FAILED: 2,
  ANALYZED: 3,
};

const SENTIMENT = {
  Positive: 'POSITIVE',
  Neutral: 'NEUTRAL',
  Negative: 'NEGATIVE',
} as const;

const iso = (ms?: number) => (ms ? new Date(ms).toISOString() : undefined);

function statusFor(event: string, call: RetellCall): CallStatus {
  if (event === 'call_analyzed') return 'ANALYZED';
  if (event === 'call_ended') {
    return call.call_status === 'error' || call.call_status === 'not_connected'
      ? 'FAILED'
      : 'ENDED';
  }
  return 'ONGOING';
}

export async function POST(request: Request) {
  // The raw text, not parsed JSON: the signature covers the exact bytes.
  const raw = await request.text();
  const signature = request.headers.get('x-retell-signature');
  const apiKey = process.env.RETELL_API_KEY;

  if (
    !apiKey ||
    !signature ||
    !(await Retell.verify(raw, apiKey, signature).catch(() => false))
  ) {
    return new Response('Invalid signature', { status: 401 });
  }

  // The whole payload is stored as Json, so it is typed as one; the fields read
  // below go through RetellCall.
  let body: JsonValue;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const { event, call } = body as { event?: string; call?: RetellCall };
  if (!event || !call?.call_id) return new Response('Bad payload', { status: 400 });

  // Every verified delivery is kept, handled or not, for debugging and replay.
  const log = await db.orm.public.WebhookEvent.create({
    provider: 'RETELL',
    eventType: event,
    signatureValid: true,
    payload: body,
  });

  let error: string | null = null;
  let retry = false;
  try {
    if (['call_started', 'call_ended', 'call_analyzed'].includes(event)) {
      error = await saveCall(event, call, body);
    }
  } catch (e) {
    console.error('Retell webhook failed:', e);
    error = e instanceof Error ? e.message : 'Unknown error';
    retry = true;
  }

  await db.orm.public.WebhookEvent.where({ id: log.id })
    .update({ processedAt: new Date().toISOString(), error })
    .catch((e) => console.error('Could not settle webhook log:', e));

  // 2xx when we deliberately skip a call (no agent assigned): a retry would
  // get the same answer, and the reason is on the log row above. A thrown
  // error (database down) is the case worth a retry, so that returns 500.
  return retry
    ? new Response('Retry', { status: 500 })
    : new Response(null, { status: 200 });
}

/** Creates or updates the Call for this event. Returns a message if it can't. */
async function saveCall(event: string, call: RetellCall, payload: JsonValue) {
  // An agent's calls belong to the organization it is assigned to.
  const agent = await db.orm.public.Agent.where({ retellAgentId: call.agent_id })
    .select('id', 'organizationId')
    .first();
  if (!agent) return `No agent is assigned to Retell agent ${call.agent_id}.`;

  const status = statusFor(event, call);
  const direction =
    call.call_type === 'web_call'
      ? 'WEB'
      : call.direction === 'outbound'
        ? 'OUTBOUND'
        : 'INBOUND';

  // Only what this event actually carried: a later event must not blank out
  // what an earlier one filled in.
  const fields = Object.fromEntries(
    Object.entries({
      fromNumber: call.from_number,
      toNumber: call.to_number,
      callerName: (call.retell_llm_dynamic_variables?.caller_name ??
        call.collected_dynamic_variables?.caller_name) as string | undefined,
      startedAt: iso(call.start_timestamp),
      endedAt: iso(call.end_timestamp),
      durationMs: call.duration_ms,
      disconnectReason: call.disconnection_reason,
      transferredTo: call.transfer_destination ?? undefined,
      recordingUrl: call.recording_url,
      transcript: call.transcript,
      summary: call.call_analysis?.call_summary,
      sentiment: call.call_analysis?.user_sentiment
        ? (SENTIMENT[
            call.call_analysis.user_sentiment as keyof typeof SENTIMENT
          ] ?? 'UNKNOWN')
        : undefined,
      // Retell reports cents, possibly fractional.
      costCents:
        call.call_cost?.combined_cost != null
          ? Math.round(call.call_cost.combined_cost)
          : undefined,
      dynamicVariables: call.retell_llm_dynamic_variables,
      collectedVariables: call.collected_dynamic_variables,
    }).filter(([, v]) => v !== undefined),
  );

  // Once the call is saved, the caller gets the follow-up email. A mailer
  // failure must not fail the webhook — the call is already stored, and Retell
  // would only retry the whole delivery — so it is logged and swallowed.
  const finish = async () => {
    if (event === 'call_analyzed') {
      await sendFollowUpEmail(agent.organizationId, call).catch((e) =>
        console.error('Follow-up email failed:', e),
      );
    }
    return null;
  };

  const update = async () => {
    const existing = await db.orm.public.Call.where({ retellCallId: call.call_id })
      .select('id', 'status', 'rawEvents')
      .first();
    if (!existing) return false;
    await db.orm.public.Call.where({ id: existing.id }).update({
      ...fields,
      status:
        RANK[status] >= RANK[existing.status as CallStatus]
          ? status
          : existing.status,
      rawEvents: [...existing.rawEvents, payload],
    });
    return true;
  };

  if (await update()) return finish();

  const org = await db.orm.public.Organization.where({
    id: agent.organizationId,
  })
    .select('dataRetentionDays')
    .first();

  try {
    await db.orm.public.Call.create({
      ...fields,
      organizationId: agent.organizationId,
      agentId: agent.id,
      retellCallId: call.call_id,
      direction,
      status,
      retentionExpiresAt: org
        ? new Date(Date.now() + org.dataRetentionDays * 86_400_000).toISOString()
        : undefined,
      // No column default exists for a Json list — see Call.rawEvents.
      rawEvents: [payload],
    });
  } catch (e) {
    // call_started and call_ended can land together and both miss the lookup:
    // the unique retellCallId rejects the loser, which then updates instead.
    if (!(await update())) throw e;
  }
  return finish();
}
