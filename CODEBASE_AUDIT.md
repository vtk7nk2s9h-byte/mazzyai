# Codebase Security & Production Readiness Audit

_Audit date: 2026-10-05 · Scope: the whole repository at the working tree on `master` (commit `8cdcc25` plus uncommitted changes) · Method: manual code review with data flows traced across files, `tsc --noEmit`, and `pnpm audit --prod`. No application code was changed._

---

## Executive Summary

**What the application is.** MazzyAI is a multi-tenant SaaS dashboard for AI voice agents. Businesses (organizations) get Retell AI voice agents that answer their calls. The app holds call logs, transcripts, contacts, an agenda of booked meetings, a knowledge base pushed to Retell, and simulated billing. A public landing page has a voice widget that anyone can use to talk to a demo agent. Internal staff (`SUPERUSER`) run every tenant from an admin console.

**Stack.** Next.js 16.3 (App Router, Server Actions, `proxy.ts`), React 19, Auth.js / next-auth 5.0.0-beta.32 (JWT sessions; credentials, email-OTP and an internal account-switch provider), Prisma 8 RC (contract-first) on PostgreSQL 17 (Docker in dev), Retell AI (REST + signed webhooks), Resend for email, Tailwind 3. A second, legacy database (Neon, `POSTGRES_URL`, via `postgres.js`) still backs the Next.js Learn tutorial pages (overview dashboard, `/dashboard/invoices`, `/seed`, `/query`).

**Overall quality.** The newer MazzyAI code is careful and readable. It has thoughtful comments, Zod validation on most inputs, parameterized queries everywhere, a well-built webhook signature check, and tenant checks on most pages and actions. The weak points are at the edges: the authentication flow, a group of Retell agent actions that were never given an ownership check, the Learn tutorial leftovers that still ship as live, unauthenticated endpoints, and missing operational basics (rate limiting, headers, tests, CI, a production build).

**Security posture: poor today.**
- **Any account can be taken over, including the superuser's,** by brute-forcing the 6-digit email sign-in code. Nothing limits attempts, and earlier codes stay valid.
- **Anyone can register.** Any signed-in user can then reconfigure any Retell agent whose id they know. The public demo agent's id ships in the browser bundle.
- **Several Learn tutorial endpoints accept requests with no login at all.** They create, edit and delete invoices, run DDL and inserts on the legacy database, and dump data.

**Production readiness: NOT READY.**

**Most important risks:**
1. OTP brute force leads to full account takeover (CRITICAL).
2. The Retell agent-editing server actions have no authorization (HIGH).
3. Unauthenticated legacy endpoints: invoice actions, `/seed`, `/query` (HIGH).
4. Sessions are never re-validated, so demoted or disabled users keep their privileges (HIGH).
5. Nothing is rate-limited anywhere, which also makes the app an open email cannon (HIGH).

---

## Production Readiness Rating

```text
Overall: 3/10
Security: 2/10
Reliability: 4/10
Performance: 5/10
Maintainability: 5/10
Testing: 0/10
Deployment readiness: 2/10
```

```text
Production status: NOT READY
```

**Why:**
- One CRITICAL and six HIGH security issues are open, and each can be exploited by an anonymous or self-registered attacker.
- There are no automated tests and no CI.
- There is no production build or deploy definition. The only Dockerfile runs `next dev`.
- The schema has no reviewable migration history.
- Two databases are still wired into user-facing pages.

The tenant-isolation work on reads is a solid base. The problems are concentrated and fixable.

---

## Finding Counts

Each finding ID appears in exactly one table below, so the counts are not double-counted.

| Severity | Count |
| -------- | ----- |
| CRITICAL | 1 |
| HIGH | 6 |
| MEDIUM | 15 |
| LOW | 16 |
| INFO | 7 |

---

# Security Findings

| ID | Severity | File | Line | Issue | Impact | Recommended Fix |
| -- | -------- | ---- | ---- | ----- | ------ | --------------- |
| SEC-01 | HIGH | `src/prisma/seed.ts` | 14-27, 294-299, 354-375 | Plaintext passwords for the real-domain superuser (`mazen@…`) and the org-admin account are committed. The seed has no production guard, and re-running it resets the superuser password and re-asserts `SUPERUSER`. | Anyone with repo access, now or from history, knows the superuser password wherever it was reused or seeded. One `pnpm db:seed` against prod gives a known-password superuser. | Read seed passwords from env (or generate and print them). Refuse to run when `NODE_ENV=production` or when `DATABASE_URL` is not local. Rotate these passwords anywhere they were used. |
| SEC-02 | HIGH | `app/lib/auth-actions.ts` / `auth.ts` | 53-115, 143-171 / 268-297 | No rate limiting on sign-up, credentials login, or `requestEmailCode`. Each `requestEmailCode` call sends a real email to any address. | Password brute force. Email bombing of arbitrary victims from your domain, which burns the Resend quota and damages sender reputation. Enables AUTH-01. | Per-IP and per-identifier limits (e.g. Upstash/Redis or a Postgres counter table) on all three. A CAPTCHA on code requests. Account lockout with backoff. |
| SEC-03 | MEDIUM | `next.config.ts` | 3-26 | No security headers: no CSP, no `frame-ancestors`/`X-Frame-Options`, no HSTS, no `Referrer-Policy`, no `Permissions-Policy`. | The dashboard can be framed (clickjacking of role, plan and settings buttons). No defence in depth against XSS. The OTP code in the URL (AUTH-05) can leak via Referer. | Add `headers()` in `next.config.ts`: `frame-ancestors 'none'`, HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` allowing only `microphone=(self)` (the widget needs it), and a CSP starting in report-only mode. Retell's web-call SDK and reCAPTCHA domains need allow-listing. |
| SEC-04 | MEDIUM | `app/lib/follow-up-email.ts`, `components/ui/voice-agent-widget.tsx` | 41-76; 213-215, 263-266 | The public landing-page widget takes a visitor-typed email. After the call, the server emails that unverified address from your domain. Throttling is one email per address per day, with no limit on how many addresses. | A bot can drive branded email to arbitrary inboxes (spam/abuse complaints, Resend suspension). Each call also costs Retell minutes. | Verify the address first (double opt-in), or only email signed-in users. Rate-limit web calls per IP. Keep reCAPTCHA required on the Retell public key. |
| SEC-05 | LOW | `app/lib/retell-api.ts`, `app/lib/agent-data.ts` | 33-40; 177 | Retell's raw error bodies are logged in full, and Retell's `message` is returned to the browser. | Minor information disclosure; logs can contain prompt text and PII. | Map provider errors to fixed messages. Log status plus a truncated body. |
| SEC-06 | INFO | `app/layout.tsx` | 41 | `dangerouslySetInnerHTML` is used for the theme script. | None: the content is a static constant (`app/ui/theme-script.ts`). | Keep it static. Give it a CSP nonce or hash once a CSP exists. |
| SEC-07 | INFO | `app/ui/login-form.tsx` | 33, 109, 264 | `callbackUrl` comes from the query string. | Not an open redirect: Auth.js's default `redirect` callback limits targets to the same origin. | Do not override `callbacks.redirect` without keeping that check. |
| SEC-08 | INFO | `app/lib/email.ts` | 45-51 | `escapeHtml` does not escape `'`. | Safe today because every attribute it feeds is double-quoted. | Escape `'` too (`&#39;`) so a future single-quoted attribute can't break. |
| SEC-09 | INFO | `app/lib/knowledge-actions.ts` | 22-36, 88-102 | Knowledge URLs are fetched by Retell, not this server. Uploaded files are checked only for size, not type. | No SSRF against this server. Retell rejects unsupported files. | Optionally allow-list extensions and MIME types for a clearer UX. |

---

# Race Conditions & Concurrency

| ID | Severity | File | Line | Issue | Impact | Recommended Fix |
| -- | -------- | ---- | ---- | ----- | ------ | --------------- |
| RACE-01 | MEDIUM | `app/api/retell/webhook/route.ts` | 181-195 | `update()` reads `status` and `rawEvents`, then writes `[...existing.rawEvents, payload]` and a rank-checked status. Two deliveries for the same call (Retell sends `call_ended` and `call_analyzed` close together, and retries) interleave. | **Lost events:** one payload disappears from `rawEvents`. **Status regression:** both read `ONGOING`, `ANALYZED` is written, then `ENDED` overwrites it. | Do it in one atomic statement: `UPDATE "Call" SET "rawEvents" = array_append("rawEvents", $1), status = CASE WHEN rank($2) >= rank(status) THEN $2 ELSE status END …`. If the ORM can't express that, use `db.transaction` with `SELECT … FOR UPDATE`. |
| RACE-02 | MEDIUM | `app/lib/follow-up-email.ts` | 57-76, 121-141 | Check-then-send: a lookup for an existing `email.sent` row, then the send, then the insert. Two concurrent `call_analyzed` deliveries both pass the check. The "one per address per day" check only scans the newest 200 `email.sent` rows across all tenants. | Duplicate follow-up emails. Once there are more than 200 emails a day, the per-address throttle silently stops working. | Claim before sending: insert a row with a unique key (e.g. a new `EmailSend(callId UNIQUE)` table, or a unique index on `(action, targetType, targetId)` in AuditLog) and only send if the insert succeeded. Query the daily throttle by recipient with an index instead of scanning in app code. |
| RACE-03 | LOW | `app/lib/knowledge-actions.ts` | 299-313 | `syncAgentKnowledge` reads the LLM's `knowledge_base_ids` from Retell, computes the new list, and PATCHes it back. Two concurrent add or delete calls for the same org interleave. | One knowledge base can silently drop off an agent. | Serialize per organization with a Postgres advisory lock (`pg_advisory_xact_lock(hashtext(orgId))`). Also re-run the sync on page load as reconciliation. |
| RACE-04 | LOW | `app/lib/billing-actions.ts` | 81-96, 120-124 | Clearing the old default card and setting the new one are separate writes with no transaction. Nothing in the schema enforces a single default. | Concurrent saves can leave two default cards or none. | Wrap in `db.transaction`. Add a partial unique index `UNIQUE (organizationId) WHERE isDefault`. |

Concurrency patterns that **are** handled correctly: sign-up and user creation (`auth-actions.ts:83-95`, `user-actions.ts:50-62`) and org slugs (`org-actions.ts:126-142`) rely on unique constraints as the backstop. The first webhook insert falls back to an update on a unique violation (`route.ts:219-223`). `useVerificationToken` deletes inside a transaction (`auth.ts:165-179`). Contact save is protected by `@@unique([organizationId, phone])`.

---

# Authentication & Authorization Findings

| ID | Severity | File | Line | Issue | Impact | Recommended Fix |
| -- | -------- | ---- | ---- | ----- | ------ | --------------- |
| AUTH-01 | **CRITICAL** | `auth.ts`, `app/lib/auth-actions.ts` | 217-223, 326-332, 154-161; 143-171 | The email sign-in code is 6 digits (10⁶ space), valid for 10 minutes, with **no attempt limit**. Requesting a new code does not invalidate earlier ones, and `/api/auth/callback/email-otp` can be called directly. | Takeover of **any** account, including the superuser, whose email is in the repo (`ADMIN_ACCOUNT_EMAIL`, seed). | Count failed attempts per identifier and burn all its codes after ~5. Delete earlier codes when issuing a new one. Rate-limit the callback. Or drop the custom generator and use Auth.js's default 32-byte link token. See detail below. |
| AUTH-02 | HIGH | `auth.ts` | 236-264, 375-378 | `role`, `id` and `impersonatorId` are written into the JWT once, at sign-in, and never re-checked. There is no session revocation. | Demoting a superuser (`updateUserRole`) or disabling a user takes effect only when the cookie expires. Auth.js defaults are a 30-day max age, refreshed on activity, so an active session can last indefinitely. A stolen session cannot be killed. | In the `jwt` callback, reload `systemRole` and `status` (every request, or every N minutes via a `checkedAt` claim). Return `null` to end the session when disabled. Add a `sessionVersion` column bumped on role change, password change and "sign out everywhere". |
| AUTHZ-01 | HIGH | `app/lib/retell-actions.ts` | 94-104, 107-120, 135-154, 165-182, 185-197, 299-326, 350-378, 386-414 | Eight agent-mutation actions use `withRoleAction('USER', …)` and never check that the caller owns the agent. Five of them (lines 97, 113, 143, 173, 190) don't validate the id shape either, so it is spliced raw into the Retell URL path. | Anyone can sign up (`signUp`, or email-OTP auto-creates users) and then rename the agent, or change its voice, language, voicemail, silence timeout or max call length (up to 120 min, which costs money), on any Retell agent on the account. The public demo agent's id ships to every visitor (`voice-agent-widget.tsx:20`). `renameAgent` also writes another tenant's `Agent` row (line 401). An unvalidated id like `../update-retell-llm/<id>` PATCHes other Retell endpoints. | Add a shared `requireAgentAccess(me, retellAgentId)`: check the regex, look up `Agent` by `retellAgentId`, and allow only SUPERUSER or an OWNER/ADMIN member of that agent's org. Call it first in all eight actions. See detail below. |
| AUTHZ-02 | MEDIUM | `app/lib/billing-actions.ts` | 139-164 | Org admins can switch their own subscription to any plan, including ENTERPRISE, with no payment step. The two writes (Subscription, then Organization) are not in a transaction. | Free upgrade to more included minutes and a lower overage rate. If the first write succeeds and the second fails, the plan disagrees between the two tables. | Until Stripe exists, restrict plan changes to SUPERUSER, or route them through a checkout flow. Wrap both writes in `db.transaction`. |
| AUTHZ-03 | MEDIUM | `app/lib/meeting-actions.ts`, `app/lib/contact-actions.ts` | 42-49; 17-24 | Write access to meetings and contacts is "any active membership". The `OrgRole` enum (OWNER/ADMIN/MEMBER/VIEWER) is ignored. | A `VIEWER` can create, edit or cancel meetings and add or delete contacts. | Define a permission per action (e.g. `canWrite = role !== 'VIEWER'`) and enforce it in one shared helper. |
| AUTH-03 | LOW | `app/lib/auth-actions.ts`, `auth.ts` | 72-81; 275-285 | Sign-up says "That email is already registered". Login skips `bcrypt.compare` when the user doesn't exist, which gives a timing difference. | Account enumeration, which makes AUTH-01 targeting easier. | Use a generic sign-up response (email the owner instead). Compare against a dummy hash when the user is missing. |
| AUTH-04 | LOW | `app/lib/auth-actions.ts` | 183-202 | Superuser → admin impersonation is well built, but it is not recorded anywhere. | No accountability for actions taken while impersonating. | Write an `AuditLog` row on each switch, and stamp `impersonatorId` on audit rows written during the session. |
| AUTH-05 | LOW | `app/ui/login-form.tsx` | 259-288 | The OTP code is submitted by `GET`, so it lands in the URL. | Codes appear in access logs, proxy logs and browser history, and can leak via Referer (no Referrer-Policy, SEC-03). | Short validity limits the risk. Prefer a POST to a server action that calls `signIn`, or accept the trade-off and add `Referrer-Policy`. |

---

# Multi-Tenant / Data Isolation Findings

Tenant isolation on **reads** is mostly correct. Every org-scoped page re-derives the org from the session and calls `notFound()` for foreign ids: call detail (`app/dashboard/call-logs/[id]/page.tsx:58-65`), agent detail (`app/dashboard/agents/[id]/page.tsx:60-68`), call logs, contacts, agenda, live events and analytics. Mutations in `knowledge-actions.ts`, `meeting-actions.ts`, `contact-actions.ts` and `billing-actions.ts` put `organizationId` into the `where` clause, so ids from another tenant match nothing. The tenant boundary is broken by AUTHZ-01 above, plus:

| ID | Severity | File | Line | Issue | Impact | Recommended Fix |
| -- | -------- | ---- | ---- | ----- | ------ | --------------- |
| TEN-01 | MEDIUM | `app/lib/meeting-data.ts`, `app/lib/agent-data.ts` | 37-45; 37-52 | Org resolution checks only `Membership.status = ACTIVE`. It ignores `Organization.status` (`SUSPENDED`, `PAST_DUE`) and `Organization.deletedAt`. | A suspended or soft-deleted tenant keeps full dashboard access: calls, transcripts, contacts, billing. Setting `SUSPENDED` in the admin UI (`org-actions.ts:22-48`) has no effect on access. | Join through to the organization and require `deletedAt IS NULL`. Decide which statuses allow read-only access and which allow none. |
| TEN-02 | LOW | `app/lib/agent-data.ts`, `app/lib/meeting-data.ts` | 39-47; 39-44 | `.first()` on memberships with no `orderBy`. `fetchAgentsOrganizationId` then checks the role of that arbitrary row. | A user in more than one org gets a nondeterministic "current org". An OWNER of org B whose first row is a MEMBER of org A is told they are not an admin. | Order deterministically, or add an explicit "active organization" chosen by the user and stored in the session, then validated per request. |

---

# Database Findings

| ID | Severity | File | Line | Issue | Impact | Recommended Fix |
| -- | -------- | ---- | ---- | ----- | ------ | --------------- |
| DB-01 | MEDIUM | `src/prisma/contract.prisma` | 836-852, 596-598 | `AuditLog` has no index on `action`, yet `fetchSentEmails`, `fetchLiveEvents` and every follow-up email filter on `action = 'email.sent'`. Calls are ordered by `startedAt` (`call-data.ts:25`), but the only composite index is `(organizationId, createdAt)`. | Sequential scans that grow with audit and call volume, on every analysed call and every 5-second Live Events refresh. | `@@index([action, createdAt])` and `@@index([organizationId, action, createdAt])` on AuditLog. `@@index([organizationId, startedAt])` on Call, or order by `createdAt`. |
| DB-02 | MEDIUM | `migrations/` | verify manually | `migrations/` holds contract snapshots and `refs/db.json` only. There are no reviewable migration files (SQL or `migration.ts`) in the repo. | Production schema changes can't be code-reviewed, rehearsed or rolled back. Destructive changes (column drops) are invisible in PRs. | Use Prisma 8's planned-migration workflow (`.claude/skills/prisma-8/` has the version-matched reference), commit the generated migrations, and apply them in deploy. |
| DB-03 | MEDIUM | `app/api/retell/webhook/route.ts`, `src/prisma/contract.prisma` | 91-96, 213-215; 286-293, 586-589, 856-867 | Retention is not enforced. `Call.retentionExpiresAt` is computed but nothing reads it. `WebhookEvent.payload` keeps every full Retell payload (transcripts, phone numbers, emails) forever. Expired `VerificationToken` rows are never deleted. | The org-level "Data retention" setting is a promise the app doesn't keep for its own copy of the data. Growing PII liability (GDPR storage limitation) and an ever-growing table. | A scheduled job (cron route protected by a secret, or `pg_cron`) that deletes `Call` past `retentionExpiresAt`, prunes `WebhookEvent` after N days, and deletes expired tokens. |
| DB-04 | INFO | `app/lib/org-data.ts`, `app/lib/data.ts` | 22, 41-43; 108-112 | User search text goes into `ILIKE` patterns without escaping `%` and `_`. | Not injection: all values are bound parameters. A search for `_` matches everything. | Escape `\`, `%` and `_` before wrapping in `%…%`. |

**SQL injection:** none found. Every query goes through the Prisma 8 query builder or `postgres.js` tagged templates with bound parameters (`app/lib/data.ts`, `app/lib/actions.ts`, `app/seed/route.ts`). No `sql.unsafe`, raw string concatenation or `db.sql` usage was found.

---

# API Findings

| ID | Severity | File | Line | Issue | Impact | Recommended Fix |
| -- | -------- | ---- | ---- | ----- | ------ | --------------- |
| API-01 | HIGH | `app/lib/actions.ts` | 44-81, 88-121, 126-129 | `createInvoice`, `updateInvoice` and `deleteInvoice` are exported server actions with **no authentication** and no id validation. They are referenced from client components, so their action ids are in the public JS. | Anyone can create, alter or delete invoices in the legacy DB. That data is shown to every signed-in user on the dashboard overview and the Invoices page. | Delete the Learn invoice actions and UI. If kept short-term, wrap them in `withRoleAction('SUPERUSER', …)` and validate `id` as a UUID. |
| API-02 | HIGH | `app/seed/route.ts`, `app/query/route.ts`, `proxy.ts`, `auth.config.ts` | 104-117; 16-22; 17-19; 8-18 | `GET /seed` and `GET /query` are public. The proxy only guards `/dashboard`. `/seed` runs `CREATE EXTENSION` / `CREATE TABLE` and bcrypt-hashes and inserts users with known passwords. `/query` returns legacy data. Both return the raw error object as JSON. | Unauthenticated DDL and writes on a production database (Neon), a CPU-heavy endpoint (bcrypt) for DoS, data exposure, and DB error details (hosts, SQL) in responses. | Delete both routes. Learn tutorial scaffolding should never ship. |

### Endpoint inventory

| Endpoint | Auth | Authorization | Validation | Risk | Notes |
| -------- | ---- | ------------- | ---------- | ---- | ----- |
| `GET/POST /api/auth/*` | n/a | n/a | Zod (credentials) | **CRITICAL** | OTP brute force (AUTH-01); no rate limits (SEC-02) |
| `POST /api/retell/webhook` | HMAC signature | n/a | Signature on raw body; minimal shape check | MEDIUM | Signature check is good; RACE-01/02, DB-03 |
| `GET /seed` | **None** | **None** | None | HIGH | API-02 |
| `GET /query` | **None** | **None** | None | HIGH | API-02 |
| Actions `createInvoice` / `updateInvoice` / `deleteInvoice` | **None** | **None** | Zod (fields only, `id` unvalidated) | HIGH | API-01 |
| Action `authenticate`, `signOutAction` | n/a | n/a | via Auth.js | MEDIUM | SEC-02 |
| Action `signUp` | None (public) | n/a | Zod | MEDIUM | Open registration; no rate limit; enumeration |
| Action `requestEmailCode` | None (public) | n/a | Zod | HIGH | Email cannon (SEC-02) |
| Action `switchAccountAction` | Session | SUPERUSER or impersonator | Server-derived | LOW | Well designed; not audited (AUTH-04) |
| Actions `setRetell*` ×5, `updateAgentVoice`, `updateAgentConversation`, `renameAgent` | Session | **USER only, no ownership** | Zod on body; id regex on 3 of 8 | HIGH | AUTHZ-01 |
| Actions `createRetellAgent`, `assignRetellAgent`, `updateAgentStatus` | Session | SUPERUSER | Zod / enum | LOW | `assignRetellAgent` doesn't regex-check `retellAgentId` (superuser-only) |
| Actions `addKnowledge`, `setKnowledgeAgent`, `deleteKnowledge` | Session | Org OWNER/ADMIN, org from session | Zod, size cap | LOW | Correctly scoped; RACE-03 |
| Actions `savePaymentMethod`, `deletePaymentMethod`, `setCancelAtPeriodEnd` | Session | SUPERUSER or org OWNER/ADMIN | Zod | LOW | RACE-04 |
| Action `changePlan` | Session | SUPERUSER or org OWNER/ADMIN | Enum | MEDIUM | AUTHZ-02 |
| Actions `createMeeting`, `updateMeeting`, `rescheduleMeeting` | Session | Any active member | Zod | MEDIUM | AUTHZ-03 |
| Actions `saveContactFromCall`, `removeContactFromCall`, `deleteContact` | Session | Any active member | id only | MEDIUM | AUTHZ-03; `deleteContact` fails silently |
| Actions `createOrganization`, `updateOrgField`, `updateOrgSettings` | Session | SUPERUSER | Zod / enum | LOW | Good |
| Actions `createUser`, `updateUserRole` | Session | SUPERUSER | Zod / enum | MEDIUM | Role change not effective until re-login (AUTH-02); not audited (OBS-01) |
| Actions `startTunnelAction`, `stopTunnelAction` | Session | SUPERUSER + non-production | Host header sanitized | LOW | Dev-only; exposes the whole dev server publicly while running |
| Actions `sendFakeCallAction`, `sendFakeEmailAction`, `bookMeetingAction` | Session | SUPERUSER + non-production | Index into fixed samples | LOW | Good design |
| Action `toggleSidebarAction` | None | n/a | n/a | INFO | Sets a UI cookie only |

---

# Frontend Findings

| ID | Severity | File | Line | Issue | Impact | Recommended Fix |
| -- | -------- | ---- | ---- | ----- | ------ | --------------- |
| FE-01 | LOW | `app/lib/meeting-data.ts`, `app/lib/agent-data.ts`, `app/lib/user-data.ts` | 9-30; 11-30; 8-26 | Agenda meetings, the superuser agent list and the user list are fetched unbounded and serialized wholesale into client components. | Payload and hydration cost grow linearly with tenant history. | Window meetings by the visible date range. Paginate the agent and user lists. |

**XSS:** no exploitable sink found. All user and caller data (transcripts, names, knowledge titles, email recipients) is rendered through React text nodes. The only `dangerouslySetInnerHTML` is a static script (SEC-06). Emails escape interpolated values (`follow-up-email.ts:81,109`, `auth.ts:341`).

**Client trust:** org and agent ids sent from client components are re-checked server-side everywhere except AUTHZ-01. The client-only `NEXT_PUBLIC_*` variables (`voice-agent-widget.tsx:19-25`) are the intended public Retell key, agent id and reCAPTCHA site key. None is a secret, but the exposed agent id is what makes AUTHZ-01 reachable.

**Accessibility:** forms use labels and `aria-live` regions (`login-form.tsx`). The collapsed sidebar toggle has `aria-label`. No significant problems noticed in the parts reviewed.

---

# Infrastructure & Deployment Findings

| ID | Severity | File | Line | Issue | Impact | Recommended Fix |
| -- | -------- | ---- | ---- | ----- | ------ | --------------- |
| INFRA-01 | MEDIUM | `Dockerfile.dev`, repo root | 31 | There is no production image or deploy definition and no CI (`.github/` is absent). The only Dockerfile runs `next dev`. There is a `.vercel/` folder, but Vercel config isn't in the repo. | Nothing runs lint, typecheck, tests or audit before code ships. Deploys can't be reproduced. | A CI workflow (`pnpm install --frozen-lockfile`, `tsc`, `eslint`, tests, `pnpm audit`). If self-hosting, a multi-stage Dockerfile with `output: 'standalone'`. |
| INFRA-02 | MEDIUM | `app/lib/data.ts`, `app/lib/actions.ts`, `app/ui/dashboard/*.tsx`, `app/ui/invoices/table.tsx` | 13; 11 | The legacy Neon database (`POSTGRES_URL`) is still required at runtime by the overview dashboard and the Invoices page. | Two databases to secure, back up and configure. If `POSTGRES_URL` is missing, the module-level client fails and those pages break. Every tenant sees the same global legacy data. | Remove the Learn pages, or move what's needed onto the Prisma contract (the contract already has a tenant-scoped `Invoice`). |
| INFRA-03 | LOW | `src/prisma/db.ts`, `app/lib/data.ts`, `app/lib/retell-api.ts` | 8; 13; 21 | Required env vars use non-null assertions instead of startup validation. `retell()` sends `Bearer undefined` when the key is missing. | Misconfiguration shows up as confusing runtime errors, not a failed boot. | One `env.ts` that parses `process.env` with Zod at import and fails fast. |
| INFRA-04 | LOW | `docker-compose.yml` | 67-70, 77 | Dev Postgres uses `postgres/postgres` and publishes `5433` on all host interfaces. | Reachable from the LAN or a café network while running. | Bind to `127.0.0.1:5433:5432`. |
| OBS-01 | MEDIUM | repo-wide; e.g. `app/lib/user-actions.ts`, `app/lib/org-actions.ts`, `app/lib/billing-actions.ts` | 77-97; 22-48; 139-164 | No error tracking, structured logging or health endpoint. `AuditLog` exists but is written only for emails. Role changes, org status and plan changes, impersonation, card changes and knowledge deletions are not audited. | Incidents can't be detected or investigated. There's no record of who promoted whom. | Add Sentry (or similar). Write `AuditLog` rows from a small `audit()` helper in every privileged action. Add a `/api/health` that checks the DB. |
| QUAL-01 | LOW | `_send.ts` | 1-12 | A committed scratch script at the repo root with a hardcoded production-looking call id. Running it sends a real follow-up email. | Accidental real email to a real caller; confusion. | Delete it. |

**Secrets:** `.env`, `.env*.local` and `.vercel/` are git-ignored, and no committed API keys, tokens or connection strings were found in the 20 commits of history (searched for common key formats). `.env.example` holds placeholders only. Two exceptions: the seed passwords (SEC-01) and the legacy Learn placeholder password in `app/lib/placeholder-data.ts:8`, which is the public tutorial value. `.env` also contains `VERCEL_OIDC_TOKEN` and `DATA_BASE_*` URLs; they are correctly ignored, but rotate them if this machine's copy was ever shared.

**HTTPS / reverse proxy:** nothing in the app assumes or enforces HTTPS (no HSTS, SEC-03). Auth.js marks cookies `Secure` automatically when `AUTH_URL` is https. Set `AUTH_URL` and `AUTH_TRUST_HOST` explicitly for production.

---

# Dependency Findings

| ID | Severity | File | Line | Issue | Impact | Recommended Fix |
| -- | -------- | ---- | ---- | ----- | ------ | --------------- |
| DEP-01 | MEDIUM | `package.json` | 30, 34, 36 | `next`, `react` and `react-dom` are `"latest"`. | Any install that doesn't use the frozen lockfile (or a `pnpm update`) silently jumps major versions. AGENTS.md already warns this Next.js "has breaking changes". | Pin exact versions (currently next 16.3.8, react 19.3.0) and upgrade deliberately. |
| DEP-02 | LOW | `package.json` | 14, 31, 61 | Auth (`next-auth 5.0.0-beta.32`) and the ORM (`@prisma/orm-postgres 8.0.0-rc.11`, `prisma 8.0.0-rc.15`, and the two disagree) are pre-release. | API churn, and security fixes may land only in newer pre-releases. | Track release notes. Align the two Prisma packages on one RC. Plan the move to GA. |
| DEP-03 | LOW | `pnpm-lock.yaml` | verify manually | `pnpm audit --prod` reports 47 advisories (1 critical, 34 high, 11 moderate, 1 low). **All of them are in install/build-time chains:** `bcrypt → @mapbox/node-pre-gyp → tar/rimraf/minimatch/brace-expansion`, `tailwindcss → sucrase/glob/postcss/nanoid/yaml`, `browserslist`. None handles request data at runtime. | Low runtime risk. Supply-chain and CI hygiene risk. | `bcrypt@6` (no `node-pre-gyp`) or `bcryptjs` removes the tar chain. Tailwind 3.4.x patch updates and `pnpm.overrides` for `glob`, `postcss`, `nanoid` and `brace-expansion` handle the rest. Test the build after overrides, since Tailwind 3's toolchain pins older majors. |

Other notes:
- `moment` (2.31) is in maintenance mode and pulled in by `react-big-calendar`. It's fine, but don't add new uses.
- `three` plus several hero animations add a lot of client JS to the landing page (see Performance).
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 2880`, a good supply-chain control.

---

# Performance Findings

| ID | Severity | File | Line | Issue | Impact | Recommended Fix |
| -- | -------- | ---- | ---- | ----- | ------ | --------------- |
| PERF-01 | MEDIUM | `app/lib/call-data.ts`, `app/dashboard/analytics/page.tsx`, `app/ui/call-logs/table.tsx` | 15-41; 137; 78 | `fetchCalls()` selects **every column** (including `transcript` and the whole `rawEvents` JSON array) with no limit when no page is given. The superuser call log and Analytics both call it that way. Analytics then aggregates in JS. | At around 10k calls this is tens to hundreds of MB per page view and an OOM risk. At 100k+ it's unusable. | Select only the displayed columns. Paginate the call log. Do analytics with SQL aggregates (`GROUP BY date_trunc('day', startedAt)`). |
| PERF-02 | LOW | `app/lib/org-actions.ts`, `app/dashboard/organizations/page.tsx`, `app/lib/org-data.ts` | 101-110; 29; 48 | `uniqueSlug` makes one query per candidate in a loop. `?page=-1` produces a negative `OFFSET`, which throws and renders the error page. | Minor. | One `LIKE 'base%'` query for existing slugs. Clamp `page` to at least 1. |

Scaling notes:
- **100 to 1,000 users:** fine apart from PERF-01 for the superuser.
- **10,000+:** DB-01 scans on every webhook and Live Events refresh (every 5 s per open tab). `fetchBudgetState` loads 48 h of calls per org page view, fine with the `(organizationId, createdAt)` index if it queried by `createdAt`. `syncKnowledgeStatus` and `syncAgentKnowledge` make sequential Retell round trips per agent and document inside page renders and actions.
- **100,000:** sessions are stateless JWTs and scale well. The Retell API rate limit becomes the bottleneck for the agent and knowledge pages. Add caching of `get-agent` results and run the syncs in the background.

---

# Code Quality & Architecture Findings

| ID | Severity | File | Line | Issue | Impact | Recommended Fix |
| -- | -------- | ---- | ---- | ----- | ------ | --------------- |
| ARCH-01 | LOW | `app/lib/billing-actions.ts`, `contact-actions.ts`, `meeting-actions.ts`, `knowledge-actions.ts` | 18-23; 17-24; 42-49; 51-54 | Authorization is re-implemented per file (`mayManage`, `allowedOrganization`, `refuseUnlessAllowed`, inline checks), each with slightly different rules. Two org resolvers (`fetchMyOrganizationId` vs `fetchAgentsOrganizationId`) encode "member" and "admin" implicitly. | This drift is exactly how AUTHZ-01 and AUTHZ-03 happened. Every new action is a fresh chance to forget a check. | A single policy module: `requireOrgAccess(me, orgId, 'read' \| 'write' \| 'admin')`, `requireAgentAccess(me, retellAgentId)`. Extend `withRoleAction` to take a resource check. |
| ARCH-02 | LOW | `app/lib/agent-data.ts` | 155-187, 208-220, 299-312, 327-336, 352-362 | Five hand-rolled Retell `fetch` calls duplicate the `retell()` helper, with inconsistent error handling (throw / null / swallow) and no timeouts. Only `retell-health.ts` sets a timeout. | A slow Retell API hangs page renders indefinitely. | Route everything through `retell()` and give it an `AbortSignal.timeout`. Type its result instead of `data: any` (`retell-api.ts:13`). |
| ARCH-03 | INFO | `app/lib/data.ts`, `actions.ts`, `placeholder-data.ts`, `app/ui/invoices/*`, `app/ui/customers/*`, `app/ui/dashboard/{cards,latest-invoices,revenue-chart}.tsx` | — | The Next.js Learn tutorial code still ships, mixed with product code (AGENTS.md acknowledges it). | Dead weight, a second DB (INFRA-02), and the source of API-01 and API-02. | Remove it in one PR. |
| ARCH-04 | INFO | `components/ui/use-case-explorer.tsx`, `components/ui/intro-hero.tsx` | — | 1,068- and 903-line client components. | Hard to review. Large landing-page bundle. | Split into data and view parts, and lazy-load the below-the-fold sections. |

Positives in code quality: `tsc --noEmit` passes under `strict`. The comments explain *why*, not *what*. Money is stored in integer cents. Ids are UUIDs. Server-only modules are marked and kept out of `'use client'` files.

---

# Testing Gaps

There are **no tests of any kind** (no `*.test.*` or `*.spec.*` files, no test runner in `package.json`) and no CI. These tests matter most:

1. **Authorization matrix (integration).** For every server action, call it as anonymous, as USER with no org, as VIEWER, MEMBER and ADMIN of org A, and as SUPERUSER, against resources in org A and org B. Assert allow or deny. This would have caught AUTHZ-01, AUTHZ-03 and API-01.
2. **OTP flow.** A wrong code N times locks the identifier. A new code invalidates the old one. An expired code fails. A code works once only.
3. **Webhook.** Invalid signature returns 401. A replay outside 5 minutes fails. Duplicate and concurrent `call_ended` + `call_analyzed` deliveries end at `ANALYZED`, with all payloads kept and exactly one follow-up email. Unknown agent returns 200 and logs it.
4. **Session revalidation.** After `updateUserRole` demotes a user, their next request no longer has SUPERUSER powers. A disabled user is signed out.
5. **Tenant isolation on pages.** Org A's admin requesting `/dashboard/call-logs/<orgB call id>` and `/dashboard/agents/<orgB agent>` gets 404.
6. **Billing invariants.** Exactly one default card after concurrent saves. Plan changes keep Subscription and Organization in step.
7. **Knowledge sync.** `syncAgentKnowledge` computes the right `knowledge_base_ids`, given a mocked Retell.
8. **E2E smoke (Playwright).** Sign up, sign in with password and with OTP, open each dashboard page, sign out.

---

# Recommended Fix Order

## P0 — Fix immediately

1. **AUTH-01:** attempt limiting and invalidation for the email OTP, or switch to long link tokens.
2. **AUTHZ-01:** add `requireAgentAccess` to all eight Retell agent actions, and validate the id shape in all of them.
3. **API-01 / API-02:** delete `/seed`, `/query` and the Learn invoice actions (or at least gate them behind SUPERUSER).
4. **SEC-01:** remove the committed passwords, add a production guard to the seed, and rotate those passwords wherever they were used.

## P1 — Fix before production

1. **AUTH-02:** re-validate role and status in the `jwt` callback, and add a session version for revocation.
2. **SEC-02 / SEC-04:** rate-limit login, sign-up, code requests and web calls. Verify widget emails before mailing.
3. **TEN-01:** enforce organization status and soft delete in org resolution.
4. **AUTHZ-02 / AUTHZ-03:** lock plan changes, and enforce org roles for writes.
5. **SEC-03:** security headers (frame-ancestors, HSTS, Referrer-Policy, Permissions-Policy, CSP in report-only mode first).
6. **RACE-01 / RACE-02:** atomic webhook update, and send each follow-up email exactly once.
7. **INFRA-01 / DB-02:** CI pipeline, production build definition, committed migrations.
8. Authorization-matrix and OTP tests (Testing Gaps 1-4).

## P2 — Strongly recommended

1. **PERF-01, DB-01:** column selection, pagination, SQL aggregates, AuditLog and Call indexes.
2. **DB-03:** retention and cleanup job.
3. **OBS-01:** error tracking, audit logging of privileged actions, health check.
4. **INFRA-02 / ARCH-03:** remove the legacy Neon database and the Learn code.
5. **ARCH-01 / ARCH-02:** a central policy module, and a single Retell client with timeouts.
6. **DEP-01:** pin Next.js and React.

## P3 — Nice to have

1. RACE-03, RACE-04, TEN-02, AUTH-03, AUTH-04, AUTH-05.
2. DEP-02, DEP-03 (move to `bcrypt@6` or `bcryptjs`; add overrides).
3. PERF-02, FE-01, INFRA-03, INFRA-04, QUAL-01, SEC-05, ARCH-04.

---

# Detailed Findings

## AUTH-01 — 6-digit email OTP can be brute-forced into any account

**Severity:** CRITICAL

**File:**

```text
auth.ts:217-223      (generateOtp: 6 digits)
auth.ts:326-332      (email-otp provider, maxAge 10 min)
auth.ts:154-161      (createVerificationToken: never removes earlier codes)
app/lib/auth-actions.ts:143-171   (requestEmailCode: no rate limit)
app/ui/login-form.tsx:259-288     (GET /api/auth/callback/email-otp?email=&token=)
```

**Problem**

The email provider replaces Auth.js's default 32-byte random link token with a 6-digit numeric code (`crypto.randomInt(0, 1_000_000)`). Auth.js's callback (`@auth/core/lib/actions/callback/index.js:141-154`) hashes the submitted code and calls `useVerificationToken`. A miss just throws `Verification`, with no counter and no lockout. Nothing in the app adds one. Each call to `requestEmailCode` also inserts a new `VerificationToken` row while every earlier code for that address stays valid for 10 minutes.

**Why it matters**

The OTP is a full sign-in, and the `jwt` callback copies `systemRole` from the user row. Taking over the superuser account (`mazen@…`, published in `src/prisma/seed.ts`) or the admin account (`ADMIN_ACCOUNT_EMAIL` in `auth.ts:30`) means control of every tenant, user and agent.

**Attack/Failure scenario**

1. The attacker calls `requestEmailCode` for the target email 50 times. That gives 50 valid codes, so each guess has a 1-in-20,000 chance.
2. The attacker sends `GET /api/auth/callback/email-otp?email=<target>&token=000000…999999` from a few hosts. Around 20,000 requests are expected for a hit, which is about 35 requests per second over the 10-minute window. Nothing throttles it.
3. On a hit, Auth.js sets the session cookie, and the attacker is the superuser.

The victim gets a pile of emails, but by then the attacker is in.

**Recommended fix**

Pick one:
- **Simplest:** remove `generateVerificationToken` so Auth.js issues its default high-entropy token, and keep the magic link only.
- **Keep typeable codes:** make them guess-proof.
  1. Delete existing codes for the identifier when issuing a new one.
  2. Count failures per identifier and burn every code after 5.
  3. Rate-limit both `requestEmailCode` and the callback per IP and per identifier.
  4. Consider 8+ alphanumeric characters.

**Example fix** (adapter-level, no Auth.js patching):

```ts
// contract: model OtpAttempt { identifier String @id; failures Int @default(0); updatedAt temporal.updatedAtString() }

async createVerificationToken({ identifier, token, expires }) {
  await db.transaction(async (tx) => {
    await tx.orm.public.VerificationToken.where({ identifier }).delete(); // one live code
    await tx.orm.public.OtpAttempt.where({ identifier }).delete();        // reset counter
    await tx.orm.public.VerificationToken.create({ identifier, token, expiresAt: expires.toISOString() });
  });
  return { identifier, token, expires };
},

async useVerificationToken({ identifier, token }) {
  return db.transaction(async (tx) => {
    const record = await tx.orm.public.VerificationToken.where({ identifier, token }).first();
    if (record) {
      await tx.orm.public.VerificationToken.where({ identifier }).delete();
      return { identifier, token, expires: new Date(record.expiresAt) };
    }
    // Miss: count it; after 5, burn every outstanding code for this address.
    const failures = await bumpFailures(tx, identifier); // upsert + increment, returns new value
    if (failures >= 5) await tx.orm.public.VerificationToken.where({ identifier }).delete();
    return null;
  });
},
```

**Additional considerations**

- Also limit `requestEmailCode` (SEC-02). Otherwise the "delete old codes" step lets an attacker keep resetting the counter.
- Auth.js auto-creates a user for an unknown email on OTP sign-in (the adapter's `createUser`), so this flow is also a second, unthrottled open registration.

---

## AUTHZ-01 — Any signed-in user can reconfigure any Retell agent

**Severity:** HIGH

**File:**

```text
app/lib/retell-actions.ts:94-104   setRetellVoicemail          (no id check)
app/lib/retell-actions.ts:107-120  setRetellVoiceModel         (no id check)
app/lib/retell-actions.ts:135-154  setRetellVoiceSettings      (no id check)
app/lib/retell-actions.ts:165-182  setRetellSpeechRecognition  (no id check)
app/lib/retell-actions.ts:185-197  setRetellLanguage           (no id check)
app/lib/retell-actions.ts:299-326  updateAgentVoice
app/lib/retell-actions.ts:350-378  updateAgentConversation
app/lib/retell-actions.ts:386-414  renameAgent                 (also updates our Agent row, line 401)
components/ui/voice-agent-widget.tsx:20   NEXT_PUBLIC_RETELL_AGENT_ID shipped to every visitor
```

**Problem**

All eight actions are wrapped in `withRoleAction('USER', …)`, which only checks that the caller is signed in. None of them checks that the agent belongs to the caller's organization. The agent page does check before rendering (`app/dashboard/agents/[id]/page.tsx:60-68`), but server actions are public endpoints and the page check doesn't protect them. Five of the actions also skip the `AGENT_ID` regex, so the id is interpolated raw into `https://api.retellai.com/update-agent/${agentId}`, and `../` segments are normalized by `fetch`.

**Why it matters**

Registration is open (`signUp`, and OTP auto-creation), so "any signed-in user" means anyone. The demo agent that answers the public landing page is the most valuable target, and its id is in the JS bundle. A tenant admin also sees their own agent ids, so a former admin keeps the ability to edit those agents after removal.

**Attack/Failure scenario**

1. The attacker signs up.
2. They read `agent_…` from the landing page bundle.
3. They invoke `updateAgentConversation(agentId, { maxCallMinutes: 120, silenceSeconds: 3600, … })` and `renameAgent(agentId, '…')`.

Every visitor call now runs up to two hours on your Retell bill, and the agent's language and voice can be changed to break the demo. With path manipulation (e.g. `setRetellLanguage('../update-retell-llm/llm_x', …)`), the PATCH reaches other Retell resources. Retell probably ignores the unexpected body fields, but this should not be relied on.

**Recommended fix**

Add one guard and call it first in all eight actions.

**Example fix**

```ts
// app/lib/retell-api.ts (server-only)
const AGENT_ID = /^agent_[A-Za-z0-9]+$/;

export async function requireAgentAccess(me: SessionUser, retellAgentId: string) {
  if (!AGENT_ID.test(retellAgentId)) return false;
  if (hasRole(me.role, 'SUPERUSER')) return true;
  const agent = await db.orm.public.Agent.where({ retellAgentId })
    .select('organizationId').first();
  if (!agent) return false;
  return (await fetchAgentsOrganizationId(me.id)) === agent.organizationId; // OWNER/ADMIN only
}

// in each action:
if (!(await requireAgentAccess(me, agentId))) return { error: 'Unknown agent.' };
```

**Additional considerations**

- Decide whether the unassigned demo agent should be editable by anyone other than a SUPERUSER. With the guard above it isn't, because there's no `Agent` row and so no access.
- Consider giving the demo agent a separate Retell workspace or API key, so a tenant-scoped bug can't reach it.

---

## API-01 / API-02 — Unauthenticated legacy endpoints write to a live database

**Severity:** HIGH

**File:**

```text
app/lib/actions.ts:44-81, 88-121, 126-129   createInvoice / updateInvoice / deleteInvoice
app/seed/route.ts:104-117                   GET /seed
app/query/route.ts:16-22                    GET /query
proxy.ts:17-19, auth.config.ts:8-18         only /dashboard is guarded
```

**Problem**

These are Next.js Learn tutorial leftovers. None of them checks a session.
- `/seed` is a GET route. It runs `CREATE EXTENSION`, `CREATE TABLE` and many inserts, including bcrypt hashing.
- `/query` returns joined invoice and customer rows.
- Both send the raw caught error object to the client.
- The invoice actions are exported from a `'use server'` file and bound in client components, so their action ids ship in public JS.

**Why it matters**

`POSTGRES_URL` points at a real hosted Neon database (env names `DATA_BASE_*` in `.env`). Its data is rendered to **every** signed-in user on `/dashboard` and `/dashboard/invoices`. Anyone on the internet can modify or delete it, trigger DDL, or use `/seed` as a CPU-burning DoS lever.

**Attack/Failure scenario**

1. `curl https://<host>/seed` repeatedly. Each request runs bcrypt hashes and DDL.
2. An anonymous POST of the `deleteInvoice` action id with an arbitrary id wipes invoice rows.
3. `/query` with a broken DB returns connection error details.

**Recommended fix**

Delete `app/seed`, `app/query`, `app/lib/actions.ts`'s invoice functions, `app/lib/data.ts`, `placeholder-data.ts` and the Learn UI. If a page must stay short-term, gate it behind `withRoleAction('SUPERUSER', …)`, validate ids as UUIDs, and never return raw errors.

**Additional considerations**

`authenticate` and `signOutAction` also live in `app/lib/actions.ts`. Move them next to `auth-actions.ts` before deleting the file.

---

## AUTH-02 — Roles and account status are frozen into the session

**Severity:** HIGH

**File:**

```text
auth.ts:236-264   (jwt callback only writes claims when `user` is present, i.e. at sign-in)
auth.ts:375-378   (currentUser trusts the cookie, no DB read)
app/lib/user-actions.ts:77-97   (updateUserRole)
```

**Problem**

`token.role` is set once at sign-in. `currentUser()` and `withRoleAction` trust it for the life of the cookie. Auth.js defaults to a 30-day max age, extended on activity. No code path re-reads `systemRole` or `status`. Nothing in the app sets `DISABLED` either, so there is no way to lock someone out.

**Why it matters**

Demoting a compromised or departing superuser has no effect on their current session. They can re-promote themselves through `updateUserRole` (which blocks self-changes, but they can promote a sock-puppet account) or keep editing tenants for weeks.

**Attack/Failure scenario**

A superuser's laptop session is stolen. You demote the account in Team. The attacker's cookie still says `SUPERUSER`, and every `withRoleAction('SUPERUSER')` still passes.

**Recommended fix**

Re-validate in the `jwt` callback. It runs whenever `auth()` is called server-side.

**Example fix**

```ts
async jwt({ token, user }) {
  if (user) { /* as today */ token.checkedAt = Date.now(); return token; }
  if (Date.now() - (token.checkedAt as number ?? 0) > 60_000) {
    const row = await db.orm.public.User.where({ id: token.id as string })
      .select('systemRole', 'status', 'sessionVersion').first();
    if (!row || row.status === 'DISABLED' || row.sessionVersion !== token.sv) return null; // ends session
    token.role = row.systemRole;
    token.checkedAt = Date.now();
  }
  return token;
},
```

**Additional considerations**

`proxy.ts` uses the database-free `authConfig`, which is fine because it only checks "signed in". Add a "Disable user" and "Sign out everywhere" action (bump `sessionVersion`) to Team.

---

## SEC-01 — Superuser credentials committed in the seed

**Severity:** HIGH

**File:**

```text
src/prisma/seed.ts:14-27     SUPERUSER and ORG_ADMIN with literal passwords (redacted here)
src/prisma/seed.ts:294-299   MEMBER with literal password
src/prisma/seed.ts:354-375   re-running resets the superuser password and role
```

**Problem**

Real-domain accounts with plaintext passwords are in a tracked file and in git history. The script has no environment guard, and it actively resets the superuser's password and role on every run.

**Why it matters**

If anyone ever runs `pnpm db:seed` with a production `DATABASE_URL`, or the same password is reused in prod, the superuser is compromised by anyone with repo access. This includes future collaborators and any public mirror.

**Recommended fix**

1. Read passwords from env (`SEED_SUPERUSER_PASSWORD`), or generate random ones and print them once.
2. Abort unless `DATABASE_URL` host is `localhost` or `127.0.0.1` and `NODE_ENV !== 'production'`.
3. Rotate those passwords anywhere they have been used. The git history keeps the old values, so treat them as public.

---

## SEC-02 — No rate limiting; sign-in code requests are an open email relay

**Severity:** HIGH

**File:**

```text
app/lib/auth-actions.ts:143-171   requestEmailCode → Resend, unlimited
app/lib/auth-actions.ts:53-115    signUp (bcrypt cost 12 per request)
auth.ts:268-297                   credentials authorize
```

**Problem / Why it matters**

There are no per-IP or per-account limits anywhere. `requestEmailCode` sends one branded email per request to any syntactically valid address, which:
- enables AUTH-01,
- lets an attacker email-bomb any victim from your domain,
- exhausts the Resend quota and gets the domain blocklisted.

Credentials login can be brute-forced online. Sign-up does bcrypt at cost 12 per request, so it is a cheap CPU-exhaustion lever.

**Recommended fix**

A small limiter shared by these actions and the Auth.js callback route. Use Redis/Upstash, or a Postgres table with `(key, windowStart, count)` and an atomic upsert. Suggested limits:
- Code requests: 3 per 15 min per address, 10 per hour per IP.
- Login: 10 per 15 min per account, plus IP limits.

Add reCAPTCHA (the site key is already configured for the widget) to the code-request and sign-up forms.

---

## TEN-01 — Suspended and deleted organizations keep full access

**Severity:** MEDIUM

**File:**

```text
app/lib/meeting-data.ts:37-45
app/lib/agent-data.ts:37-52
app/lib/org-actions.ts:22-48   (status can be set, but is never enforced)
```

**Problem**

Every tenant page and action resolves the user's org via `Membership.status = 'ACTIVE'` only. `Organization.status` (`SUSPENDED`, `PAST_DUE`) and `Organization.deletedAt` are not consulted anywhere outside display code.

**Attack/Failure scenario**

A tenant is suspended for non-payment or abuse. Its users keep reading call transcripts, editing meetings and managing knowledge. Their agents keep answering calls, because nothing pauses them on Retell either.

**Recommended fix**

Resolve the membership together with the organization. Return `null` (or a read-only flag) when `deletedAt` is set or the status is `SUSPENDED`. When an org is suspended, also set its agents to `PAUSED` and push that to Retell.

---

## RACE-01 — Webhook updates lose events and can move a call backwards

**Severity:** MEDIUM

**File:**

```text
app/api/retell/webhook/route.ts:181-195
```

**Problem**

```ts
const existing = await …select('id', 'status', 'rawEvents').first();
await …update({ status: RANK[status] >= RANK[existing.status] ? status : existing.status,
                rawEvents: [...existing.rawEvents, payload] });
```

This is a read-modify-write with no lock. Retell delivers `call_ended` and `call_analyzed` seconds apart, and retries on 5xx.

**Attack/Failure scenario**

Two deliveries arrive within one round trip. Both read `{status: ONGOING, rawEvents: [started]}`. `call_analyzed` writes `ANALYZED, [started, analyzed]`. Then `call_ended` writes `ENDED, [started, ended]`. The final row has lost the analyzed payload, and its status has gone backwards.

**Recommended fix**

Do it in one SQL statement (`array_append` plus a `CASE` on rank). If the ORM can't express that, use `db.transaction` and `SELECT … FOR UPDATE` on the call row before computing the update. The same applies to the follow-up email claim (RACE-02).

---

## RACE-02 — Follow-up emails can be sent twice, and the daily throttle breaks at scale

**Severity:** MEDIUM

**File:**

```text
app/lib/follow-up-email.ts:57-64    per-call dedupe: lookup, then send, then insert
app/lib/follow-up-email.ts:66-76    per-address throttle: scans the newest 200 rows globally
app/lib/follow-up-email.ts:133-141  audit row written after the send
```

**Problem**

The idempotency marker is written after the send, so concurrent or retried `call_analyzed` deliveries both see "not sent". The per-address limit only looks at the 200 newest `email.sent` rows across all tenants and filters the JSON in JavaScript.

**Recommended fix**

Claim first: insert a row with a unique key for the call (a dedicated table, or a unique index), send only if the insert won, and mark it failed or delete it if the send throws. Query the throttle by recipient with an index (store `to` in its own column, not only in the JSON `diff`).

---

## SEC-03 — No security headers

**Severity:** MEDIUM

**File:**

```text
next.config.ts:3-26
```

**Example fix**

```ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; frame-ancestors 'none'; …" },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ],
  }];
},
```

Build the CSP in report-only mode first. The Retell web SDK (WebRTC/LiveKit endpoints), reCAPTCHA, Google Fonts and the inline theme script all need entries or nonces.

---

## AUTHZ-02 — Tenants can upgrade their own plan for free

**Severity:** MEDIUM

**File:**

```text
app/lib/billing-actions.ts:139-164
```

**Problem**

`changePlan` is open to org OWNER and ADMIN. It writes `plan`, `minutesIncluded` and `overageRateCentsPerMinute` directly, with no payment. It makes two separate writes with no transaction.

**Recommended fix**

Until a real payment provider exists, allow only SUPERUSER, or record a "requested plan" for staff to approve. When Stripe arrives, plan changes should come from Stripe webhooks, never from a client call. Wrap both writes in `db.transaction` either way.

---

## PERF-01 — Unbounded call queries with full payloads

**Severity:** MEDIUM

**File:**

```text
app/lib/call-data.ts:15-41               fetchCalls: no select(), no limit unless currentPage
app/dashboard/analytics/page.tsx:137     fetchCalls({ organizationId }) — all calls
app/ui/call-logs/table.tsx:78            superuser call log: all calls, all orgs
```

**Problem**

Every column, including `transcript` (often several KB) and `rawEvents` (every webhook payload, which also contains the transcript), is loaded for every call in the system. The results are then serialized into the RSC payload.

**Recommended fix**

`.select('id','status','direction','callerName','fromNumber','startedAt','durationMs','costCents','sentiment')`. Paginate the call log. Compute the analytics series with `aggregate()` / `GROUP BY` in SQL, using the index from DB-01.

---

# Positive Findings

- **Webhook authentication is done right** (`app/api/retell/webhook/route.ts:65-88`). The raw body is read before parsing. The signature is verified with Retell's HMAC (constant-time, 5-minute replay window, checked in `retell-sdk/lib/webhook_auth.js`). The route fails closed when the key is missing. Every verified delivery is logged. Retries are driven by status code.
- **The account-switch provider is carefully designed** (`auth.ts:32-83, 301-325`). HMAC tokens are purpose-prefixed, compared with `timingSafeEqual`, expire after 60 s, and are minted only server-side after checking the session. The "trip back" can only land on a SUPERUSER.
- **Tenant scoping on reads and most writes is consistent.** Pages re-derive the org from the session and return `notFound()` so foreign ids look nonexistent. Mutations put `organizationId` in the `where` clause. `addKnowledge` takes the org from the session, never from the form.
- **Superuser-only actions are all wrapped in `withRoleAction('SUPERUSER')`** and re-checked server-side, not left to UI hiding.
- **No SQL injection surface.** Every query is parameterized (Prisma 8 builder or `postgres.js` templates).
- **Input validation** with Zod on nearly every action: bounded strings, enums, numeric ranges, a URL normalizer, and an 8 MB file cap that matches `bodySizeLimit`.
- **Passwords** use bcrypt cost 12. Emails are lower-cased to avoid duplicate accounts. Unique constraints serve as race backstops.
- **Outbound email** escapes interpolated values. The follow-up email deliberately excludes call content and filters visitor names to a plain-name pattern.
- **Dev-only tooling** (tunnel, test lab) is gated on both SUPERUSER and `NODE_ENV !== 'production'`. The Host header is sanitized before it's used to build a URL.
- **Secrets hygiene:** `.env*` is ignored, there are no committed API keys in history, `.env.example` has placeholders and warns against `NEXT_PUBLIC_` secrets, and server-only modules are documented.
- **Data model** uses integer cents, UUID ids, `organizationId` indexes on tenant tables, and explicit enums with CHECK constraints.
- **Supply chain:** `minimumReleaseAge: 2880` and an explicit `allowBuilds` list in `pnpm-workspace.yaml`.
- **Type safety:** `tsc --noEmit` passes under `strict`.

---

# Final Verdict

1. **Overall assessment.** A well-written early-stage product whose newer code shows real security awareness. The security edges were not closed off: the authentication flow, a group of agent actions, and the tutorial scaffolding. Operational foundations (tests, CI, rate limiting, headers, observability, migrations, retention) are mostly absent.

2. **Biggest risks.**
   - Account takeover through the OTP (AUTH-01).
   - Any registrant reconfiguring production voice agents (AUTHZ-01).
   - Anonymous writes and DDL through the Learn endpoints (API-01 and API-02).
   - Sessions that can't be revoked (AUTH-02).
   - Committed superuser credentials (SEC-01).
   - An unthrottled email relay (SEC-02).

3. **Must be fixed before production.**
   - Every P0 and P1 item: AUTH-01, AUTHZ-01, API-01, API-02, SEC-01, AUTH-02, SEC-02, SEC-04, TEN-01, AUTHZ-02, AUTHZ-03, SEC-03, RACE-01, RACE-02.
   - A CI pipeline with at least the authorization-matrix and OTP tests.
   - A reproducible production build with committed migrations.

4. **Can wait until after launch.**
   - Performance work (PERF-01, DB-01) while volume is low.
   - Retention automation, if launch is limited and no retention promise is made publicly.
   - Removing the Learn code, once its endpoints are gone.
   - The architecture refactors (ARCH-01 to ARCH-04).
   - Dependency hygiene (DEP-02, DEP-03).
   - The remaining LOW items.

5. **Would I approve this codebase for production today?** **No.** One CRITICAL and six HIGH issues can each be exploited by an anonymous or self-registered attacker with a handful of requests. The P0 list is small and well-contained, roughly a few days of work. With P0 and P1 done and the tests above in CI, this would move to **NEEDS MINOR WORK**.
