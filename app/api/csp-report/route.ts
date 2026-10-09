import type { NextRequest } from 'next/server';

/**
 * Where the browser posts Content-Security-Policy violations (see proxy.ts).
 *
 * This endpoint cannot be authenticated: the browser sends these reports by
 * itself, with no session and no CSRF token, and drops any response body. So
 * everything here exists to keep a public write endpoint from being worth
 * attacking — it reads a bounded amount, writes nothing to the database, and
 * caps how much it will log per process. Anyone can forge a report; treat what
 * comes out of it as a hint about the policy, never as a trustworthy record.
 */

/** Longer than any genuine report; anything bigger is not read at all. */
const MAX_BODY_BYTES = 64 * 1024;
const WINDOW_MS = 10 * 60 * 1000;
/**
 * Ceiling on log lines per window. A single misconfigured directive on a busy
 * page produces a report per pageview, and filling the log drain is its own
 * small outage — one that would also bury the violation worth reading.
 */
const MAX_LOGGED_PER_WINDOW = 50;

let windowStart = Date.now();
let logged = 0;
/** Distinct violations already logged this window, so each is reported once. */
let seen = new Set<string>();

/** True when this violation should be written out, rolling the window first. */
function shouldLog(key: string): boolean {
  const now = Date.now();
  if (now - windowStart >= WINDOW_MS) {
    windowStart = now;
    logged = 0;
    seen = new Set();
  }
  if (seen.has(key)) return false;
  if (logged >= MAX_LOGGED_PER_WINDOW) return false;
  seen.add(key);
  logged += 1;
  return true;
}

/** Attacker-controlled strings reach the log, so keep them short and on one line. */
function clean(value: unknown): string {
  if (typeof value !== 'string' || value === '') return '-';
  return value.replace(/\s+/g, ' ').slice(0, 200);
}

type Violation = { directive: string; blocked: string; document: string };

/**
 * Normalises the two wire formats into one shape: the Reporting API posts an
 * array of `{ type, body }` as application/reports+json, while report-uri
 * posts a single `{ "csp-report": {...} }` as application/csp-report. Both are
 * sent (proxy.ts sets both headers) because no one format covers every browser.
 */
function parse(payload: unknown): Violation[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((r) => r?.type === 'csp-violation' && r?.body)
      .map((r) => ({
        directive: clean(r.body.effectiveDirective ?? r.body.violatedDirective),
        blocked: clean(r.body.blockedURL),
        document: clean(r.body.documentURL),
      }));
  }
  const report = (payload as { 'csp-report'?: Record<string, unknown> })?.['csp-report'];
  if (!report) return [];
  return [
    {
      directive: clean(report['effective-directive'] ?? report['violated-directive']),
      blocked: clean(report['blocked-uri']),
      document: clean(report['document-uri']),
    },
  ];
}

export async function POST(request: NextRequest) {
  // 204 whatever happens: the browser discards the response, and a status that
  // varied by outcome would only tell a prober what it managed to send.
  const noContent = new Response(null, { status: 204 });

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return noContent;

  try {
    const body = await request.text();
    if (body.length > MAX_BODY_BYTES) return noContent;

    for (const v of parse(JSON.parse(body))) {
      // The pair is what identifies a distinct policy problem; the document it
      // happened on is detail that rides along with the first sighting.
      if (!shouldLog(`${v.directive}|${v.blocked}`)) continue;
      console.warn(
        `[csp] ${v.directive} blocked ${v.blocked} on ${v.document}`,
      );
    }
  } catch {
    // Unparseable or truncated bodies are not worth a log line of their own —
    // that would hand anyone a way to write to the log at will.
  }

  return noContent;
}
