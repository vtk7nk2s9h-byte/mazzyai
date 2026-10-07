import type { Pool } from 'pg';

type Rule = { by: 'ip' | 'email'; max: number; windowSeconds: number };

const sendsEmail: Rule[] = [
  { by: 'email', max: 3, windowSeconds: 10 * 60 },
  { by: 'ip', max: 10, windowSeconds: 10 * 60 },
];
const checksCode: Rule[] = [{ by: 'ip', max: 20, windowSeconds: 10 * 60 }];

/**
 * Limits per Better Auth endpoint. Keyed by endpoint path, so they apply the
 * same whether a server action calls auth.api.* or a request hits
 * /api/auth/* directly — lib/auth.ts runs checkRateLimit() from a `before`
 * hook, which sees both.
 *
 * Email rules stop one account being hammered from many IPs; IP rules stop one
 * client spraying many accounts. Codes already allow only 3 tries each (email
 * OTP plugin), so the code-checking rules are a backstop.
 */
const RULES: Record<string, Rule[]> = {
  '/sign-in/email': [
    { by: 'email', max: 10, windowSeconds: 15 * 60 },
    { by: 'ip', max: 30, windowSeconds: 15 * 60 },
  ],
  '/sign-up/email': [{ by: 'ip', max: 5, windowSeconds: 60 * 60 }],
  // Every endpoint that sends an email: each one costs Resend quota and lands
  // in someone's inbox.
  '/email-otp/send-verification-otp': sendsEmail,
  '/email-otp/request-password-reset': sendsEmail,
  '/forget-password/email-otp': sendsEmail,
  '/email-otp/request-email-change': sendsEmail,
  '/sign-in/email-otp': checksCode,
  '/email-otp/check-verification-otp': checksCode,
  '/email-otp/verify-email': checksCode,
  '/email-otp/reset-password': checksCode,
};

// First hop of x-forwarded-for is the client as the nearest proxy saw it; Next
// sets it for server actions too. Behind a proxy that passes a client's own
// value through, rotating fake values would dodge the IP rules — the email
// rules still hold then.
function clientIp(headers: Headers | undefined): string {
  return (
    headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers?.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Counts this request against every rule for `path`. Returns the seconds until
 * the caller may retry when any rule is over its limit, otherwise null.
 */
export async function checkRateLimit(
  pool: Pool,
  path: string,
  headers: Headers | undefined,
  email: unknown,
): Promise<number | null> {
  const rules = RULES[path];
  if (!rules) return null;

  let retryAfter: number | null = null;
  for (const rule of rules) {
    const subject =
      rule.by === 'ip'
        ? clientIp(headers)
        : typeof email === 'string'
          ? email.trim().toLowerCase()
          : null;
    if (!subject) continue;

    // One statement, so concurrent requests can't both read a count under the
    // limit: the row lock ON CONFLICT takes serialises them.
    const { rows } = await pool.query<{ count: number; retry: number }>(
      `insert into "rateLimit" (key, count, "windowStart") values ($1, 1, now())
       on conflict (key) do update set
         count = case when "rateLimit"."windowStart" <= now() - make_interval(secs => $2)
                      then 1 else "rateLimit".count + 1 end,
         "windowStart" = case when "rateLimit"."windowStart" <= now() - make_interval(secs => $2)
                              then now() else "rateLimit"."windowStart" end
       returning count,
         ceil(extract(epoch from "windowStart" + make_interval(secs => $2) - now()))::int as retry`,
      [`${path}:${rule.by}:${subject}`, rule.windowSeconds],
    );
    const { count, retry } = rows[0];
    if (count > rule.max) retryAfter = Math.max(retryAfter ?? 0, retry);
  }

  // Expired rows are dead weight; sweeping on ~1% of calls keeps the table
  // small without a cron job.
  if (Math.random() < 0.01) {
    await pool.query(
      `delete from "rateLimit" where "windowStart" < now() - interval '1 day'`,
    );
  }
  return retryAfter;
}
