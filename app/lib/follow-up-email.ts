import { z } from 'zod';

import {
  escapeHtml,
  mailColors,
  mailFonts,
  renderEmail,
  sendEmail,
} from '@/app/lib/email';
import type { EmailType } from '@/app/lib/utils';
import { db } from '@/src/prisma/db';

// Server-side only: imports the mailer and the Prisma client.

const DAY_MS = 86_400_000;
/**
 * Ceiling on follow-ups sent in any 24-hour window, across every address.
 *
 * The per-address limit below stops one inbox being mailed twice, but on its
 * own it puts no bound on how many *different* inboxes a script can reach:
 * the widget is public, the address is visitor-typed, and each new address is
 * a fresh allowance. This is the bound. It cannot be a per-IP limit — the web
 * call goes from the browser straight to Retell, so by the time this runs, on
 * Retell's webhook, the visitor's IP is not ours to see.
 */
const MAX_PER_DAY = 200;
const SUBJECT = 'Thanks for talking with MazzyAI';
/** Recorded with each send, for the call profile. */
const EMAIL_TYPE: EmailType = 'FOLLOW_UP';

const EmailSchema = z.string().trim().toLowerCase().email().max(254);

// The widget's name field is visitor-typed text going into an email from our
// own domain, so only something that reads as a plain name is used. Anything
// else — a sentence, a link — is dropped and the greeting stays generic.
const PLAIN_NAME = /^[\p{L}][\p{L} .'’-]{0,39}$/u;

/**
 * Emails the caller a short overview of MazzyAI once their call has been
 * analysed. The address is whatever the visitor typed into the widget — it is
 * never verified — so this is deliberately conservative about what it sends
 * and how often:
 *
 *  - nothing from the call itself (summary, transcript) goes in the email, only
 *    general product information from the agent's own prompt;
 *  - one email per call (webhooks are delivered more than once);
 *  - one email per address per day;
 *  - at most MAX_PER_DAY follow-ups in total per day, whatever the address.
 *
 * Every send is logged as an AuditLog row, action "email.sent", which is also
 * what the Live Events "Emails" filter reads. Throws if the mailer does.
 */
export async function sendFollowUpEmail(
  organizationId: string,
  call: {
    call_id: string;
    retell_llm_dynamic_variables?: Record<string, unknown>;
  },
) {
  const vars = call.retell_llm_dynamic_variables;
  const address = EmailSchema.safeParse(vars?.caller_email);
  // "not provided" is the widget's placeholder for a blank field.
  if (!address.success) return;
  const to = address.data;

  const rawName = typeof vars?.caller_name === 'string' ? vars.caller_name.trim() : '';
  const name = PLAIN_NAME.test(rawName) && rawName !== 'there' ? rawName : null;

  const already = await db.orm.public.AuditLog.where({
    action: 'email.sent',
    targetType: 'call',
    targetId: call.call_id,
  })
    .select('id')
    .first();
  if (already) return;

  // Both daily limits come off this one query. It is scoped by time, not by a
  // row count: reading "the last 200 rows" stops covering a whole day as soon
  // as volume climbs, which is exactly when the limits start to matter.
  // targetType narrows it to follow-ups — every mail the system sends writes
  // an "email.sent" row, and unrelated mail must not spend this budget.
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const today = await db.orm.public.AuditLog.where({
    action: 'email.sent',
    targetType: 'call',
  })
    .where((a) => a.createdAt.gte(since))
    .select('diff')
    .all();

  if (today.length >= MAX_PER_DAY) {
    // Silence here would look exactly like "no email was due", so say it: past
    // this point either traffic has outgrown the ceiling or someone is driving
    // it, and both want a human to look.
    console.warn(
      `[follow-up-email] daily cap of ${MAX_PER_DAY} reached; skipping send for call ${call.call_id}`,
    );
    return;
  }

  // Two webhooks arriving together can both read a total under the ceiling and
  // both send. Left as is: these limits exist to bound how far a bot can get,
  // not to be exact to the last message.
  if (today.some((r) => (r.diff as { to?: string } | null)?.to === to)) return;

  const c = mailColors;
  const p = `margin:0 0 14px;font-size:14px;line-height:22px;color:${c.muted};`;
  const h = `margin:22px 0 6px;font-size:14px;line-height:20px;font-weight:700;color:${c.text};`;
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';

  const sections: [string, string][] = [
    [
      'What MazzyAI is',
      "An AI voice agent that answers a business's calls: inbound on its own phone number, outbound, or in a widget on its website like the one you just used.",
    ],
    [
      'Getting set up',
      'Pick your sector and start from its template, such as restaurant, clinic or repair shop. Add what the agent should know as files, links or pasted text, set your opening hours, and publish. An agent stays a draft until you publish it, and you can pause it at any time.',
    ],
    [
      'After every call',
      'A full transcript, a short summary and a sentiment read land in your call log, with a recording if you have recording turned on.',
    ],
    [
      'Staying in control',
      'Choose how long data is kept, set a daily spend cap, invite your team, and get notified about missed calls, transfers and billing issues.',
    ],
  ];

  const body = `
<h1 style="margin:0 0 8px;font-family:${mailFonts.serif};font-size:22px;line-height:30px;font-weight:700;color:${c.text};">Thanks for talking with us</h1>
<p style="${p}">${greeting}</p>
<p style="${p}">Thanks for trying the MazzyAI voice assistant. Here is a short overview of what it can do for your business.</p>
${sections
  .map(
    ([title, text]) =>
      `<p style="${h}">${escapeHtml(title)}</p><p style="${p}">${escapeHtml(text)}</p>`,
  )
  .join('\n')}`;

  const text = [
    name ? `Hi ${name},` : 'Hi,',
    '',
    'Thanks for trying the MazzyAI voice assistant. Here is a short overview of what it can do for your business.',
    '',
    ...sections.flatMap(([title, t]) => [title, t, '']),
  ].join('\n');

  await sendEmail({
    to,
    subject: SUBJECT,
    html: renderEmail({
      preheader: 'A short overview of what MazzyAI can do for your business.',
      footer:
        'You received this because this address was entered in the call widget on the MazzyAI website. If that was not you, you can ignore this email.',
      body,
    }),
    text,
  });

  // After the send, so a failed send leaves no row claiming it happened.
  await db.orm.public.AuditLog.create({
    organizationId,
    actorType: 'SYSTEM',
    action: 'email.sent',
    targetType: 'call',
    targetId: call.call_id,
    diff: { to, subject: SUBJECT, type: EMAIL_TYPE },
  });
}
