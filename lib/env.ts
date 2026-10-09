// Every environment variable this app's own code reads, under the names they
// already carry in .env. Not the whole environment: Better Auth reads
// BETTER_AUTH_URL and its own key names straight from process.env, and
// docker-compose.yml sets DOCKER_DEV for next.config.ts. .env.example is the
// full annotated list.
//
// One module rather than process.env scattered across the tree, so a key is
// spelled once: a typo in one of nine copies of 'RETELL_API_KEY' reads as
// undefined and only surfaces as a 401 from the service. Keys that nothing
// works without are checked when this module first loads, and all of the
// missing ones are reported together, so a fresh clone gets one actionable
// error instead of `connectionString: undefined` several layers down.
//
// Never import this from a 'use client' file. Like app/lib/call-data.ts it is
// server-only, and these values include API keys that must not reach the
// browser bundle. NEXT_PUBLIC_* keys are deliberately not here: Next inlines
// those at build time only where `process.env.NEXT_PUBLIC_X` appears
// literally, so they stay written out at their call sites
// (components/ui/voice-agent-widget.tsx, app/lib/retell-api.ts). NODE_ENV is
// likewise left alone — Next defines and inlines it everywhere.

// dotenv rather than relying on the caller: inside Next the .env files are
// already loaded and dotenv leaves existing values alone, while the scripts
// run by plain `node` need it — and loading it here means no script can
// validate before its environment exists, whatever order its imports are in.
import 'dotenv/config';

const missing: string[] = [];

/** A key the app cannot run without; absence is collected, then thrown below. */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    missing.push(name);
    return '';
  }
  return value;
}

/** A key whose feature degrades gracefully when it is unset. */
function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}


export const DATABASE_URL = required('DATABASE_URL');

export const AUTH_SECRET = required('AUTH_SECRET');


export const RETELL_API_KEY = optional('RETELL_API_KEY');

export const RETELL_WEBHOOK_URL = optional('RETELL_WEBHOOK_URL');
/** Retell voice library id. Only scripts/create-retell-agent.ts needs it. */
export const RETELL_VOICE_ID = optional('RETELL_VOICE_ID');

export const RESEND_API_KEY = optional('RESEND_API_KEY');
/** Falls back to the Resend sandbox sender in app/lib/email.ts. */
export const EMAIL_FROM = optional('EMAIL_FROM');

if (missing.length > 0) {
  throw new Error(
    `Missing environment ${missing.length === 1 ? 'variable' : 'variables'}: ` +
      `${missing.join(', ')}. Copy .env.example to .env and fill them in; ` +
      `see .env.example for the full list.`,
  );
}
