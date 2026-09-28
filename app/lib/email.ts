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

const DEFAULT_FROM = 'MazzyAI <onboarding@resend.dev>';

/**
 * The site's palette, re-declared as literals. Mail clients strip <style>
 * blocks and know nothing about Tailwind, so every colour has to be inlined
 * at the element. Values track tailwind.config.ts — ink-900 ground, gray-100
 * card, gray-200 border, maroon-600 band, brand-red-lit accent.
 */
export const mailColors = {
  ground: '#0b0406',
  band: '#5e1622',
  card: '#140a0d',
  well: '#1a1012',
  border: '#291619',
  text: '#f7f2f3',
  muted: '#a08f93',
  dim: '#7d666b',
  accent: '#ff2e43',
  brand: '#7b1e2c',
} as const;

/** Email-safe stand-ins for Inter and Lusitana. */
export const mailFonts = {
  sans: "Helvetica,Arial,'Segoe UI',sans-serif",
  serif: "Georgia,'Times New Roman',serif",
  mono: "'SFMono-Regular',Consolas,'Liberation Mono',monospace",
} as const;

/** Only safe for text going into markup — not for attribute-quoted values. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type RenderEmailInput = {
  /** Shown after the subject in the inbox list; never drawn in the body. */
  preheader: string;
  /** Inline HTML for the card's interior. */
  body: string;
  /** Optional grey line under the card. Plain text, already escaped. */
  footer?: string;
};

/**
 * Wraps `body` in the app's chrome: the maroon logo band over a bordered dark
 * panel, same two-piece shape as the login card. Tables and inline styles
 * throughout — Outlook ignores flexbox, and Gmail drops <style> entirely.
 */
export function renderEmail({ preheader, body, footer }: RenderEmailInput): string {
  const c = mailColors;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>MazzyAI</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${c.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.ground};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;">
<tr><td style="background-color:${c.band};border-radius:12px 12px 0 0;padding:22px 24px;">
<span style="font-family:${mailFonts.sans};font-size:20px;font-weight:700;letter-spacing:1px;color:${c.text};"><span style="color:${c.accent};">M</span>azzyAI</span>
</td></tr>
<tr><td style="background-color:${c.card};border:1px solid ${c.border};border-top:0;border-radius:0 0 12px 12px;padding:28px 24px;font-family:${mailFonts.sans};color:${c.text};">
${body}
</td></tr>
${
  footer
    ? `<tr><td style="padding:16px 4px 0;font-family:${mailFonts.sans};font-size:12px;line-height:18px;color:${c.dim};">${escapeHtml(footer)}</td></tr>`
    : ''
}
</table>
</td></tr>
</table>
</body>
</html>`;
}

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
