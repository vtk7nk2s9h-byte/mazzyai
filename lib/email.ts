import { Resend } from 'resend';

// Reads RESEND_API_KEY from the environment. Never import this from a
// 'use client' file — like call-data.ts, it must stay server-side, or the
// API key ships to the browser.
//
// Constructed lazily inside sendEmail(), not at module scope: the Resend
// constructor throws on a missing key, and this module is pulled in by
// auth.ts, so an eager instance would crash every page in dev before anyone
// has set RESEND_API_KEY.
let resend: Resend | undefined;
function getResend(): Resend {
  return (resend ??= new Resend(process.env.RESEND_API_KEY));
}

const DEFAULT_FROM = 'Voxpoint <onboarding@resend.dev>';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * The one place the app calls out to Resend. Auth (sign-in codes, magic
 * links) is the first caller, but nothing here is auth-specific — reuse it
 * for invites, notifications, receipts, etc.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const { error } = await getResend().emails.send({
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }
}
