'use client';
 
import { lusitana } from '@/app/ui/fonts';
import {
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import LogoutButton from '@/app/ui/log-out-button';
import Link from 'next/link';
import { useActionState, useId } from 'react';
import {
  authenticate,
  requestEmailCode,
  type RequestEmailCodeState,
} from '@/app/lib/auth-actions';
import { useSearchParams } from 'next/navigation';
import styles from '@/app/ui/login-form.module.css';

const initialCodeState: RequestEmailCodeState = {};

// The ?error= values app/login/email-link sends back.
const CODE_ERRORS: Record<string, string> = {
  'invalid-code': 'That code is wrong or has already been used.',
  'code-expired': 'That code has expired. Send a new one.',
  'too-many-attempts': 'Too many wrong tries for that code. Send a new one.',
  'rate-limited': 'Too many sign-in attempts. Wait a few minutes and try again.',
};

const field =
  'peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500';

// Glass rather than the old solid bg-gray-50, so the animated field behind the
// page carries through the card — the same surface the sidebar and the logo
// plate above this form use.
const panel =
  'rounded-[inherit] border border-white/[0.07] bg-white/[0.05] px-6 pb-4 pt-8 backdrop-blur-xl';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  // Set by app/login/email-link when a typed code or emailed link failed.
  const codeError = searchParams.get('error');
  const codeErrorMessage = codeError ? CODE_ERRORS[codeError] : undefined;
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );
  const [codeState, codeFormAction, isCodePending] = useActionState(
    requestEmailCode,
    initialCodeState,
  );
  // A wrong code still has tries left, so the code box comes back for it with
  // the address it was sent to.
  const codeEmail =
    codeState.email ??
    (codeError === 'invalid-code'
      ? searchParams.get('email') || undefined
      : undefined);
  // clipPath ids are document-global, so it has to be unique per instance.
  const aboveEnvelope = `otp-above-${useId().replace(/:/g, '')}`;

  return (
    <>
    {/* Two copies of the same travelling arc — a blurred one bleeding outside
        the card for the glow, a crisp one on the edge itself. Same pairing the
        landing page's glass cards use, so the ring reads as the site's, not as
        a one-off on the login screen. */}
    <div className="relative rounded-lg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[3px] rounded-[inherit] opacity-60 blur-[10px]"
      >
        <div className="glow-ring h-full w-full rounded-[inherit] [--ring-w:3px]" />
      </div>
      <div
        aria-hidden="true"
        className="glow-ring pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
      />

      <form action={formAction} className="relative rounded-lg">
      <div className={panel}>
        <h1 className={`${lusitana.className} mb-3 text-2xl`}>
          Log in to your dashboard
        </h1>
        <div className="w-full">
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email address"
                required
              />
              <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
          <div className="mt-4">
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative rounded-lg">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="password"
                type="password"
                name="password"
                placeholder="Enter password"
                required
                minLength={6}
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
        </div>
        <input type="hidden" name="redirectTo" value={callbackUrl} />
        <LogoutButton
          type="submit"
          label="Log in"
          variant="outline"
          disabled={isPending}
          className="mt-4 w-full justify-between"
        />
        <div
          className="flex h-8 items-end space-x-1"
          aria-live="polite"
          aria-atomic="true"
        >
          {errorMessage && (
            <>
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">{errorMessage}</p>
            </>
          )}
        </div>

        {/* Outside the primary action, and a link rather than a button, so it
            never reads as a second way to submit this form. */}
        <div className="mt-2 border-t border-gray-200 pt-4">
          <Link
            href="/signup"
            className="flex w-full items-center justify-center rounded-md border border-maroon-400/40 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-900 transition-colors duration-200 hover:border-brand-red hover:text-brand-red-lit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400"
          >
            Create an account
          </Link>
        </div>
      </div>
      </form>
    </div>

    {/* Same ring as the card above, so the two panels read as a pair. */}
    <div className="relative mt-3 rounded-lg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[3px] rounded-[inherit] opacity-60 blur-[10px]"
      >
        <div className="glow-ring h-full w-full rounded-[inherit] [--ring-w:3px]" />
      </div>
      <div
        aria-hidden="true"
        className="glow-ring pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
      />

    {/* Opens itself when sent back from a failed code or link, so the message
        below is visible. */}
    <details
      open={!!codeErrorMessage || undefined}
      className="relative rounded-[inherit] border border-white/[0.07] bg-white/[0.05] px-6 py-4 backdrop-blur-xl"
    >
      <summary className={styles.otpToggle}>
        <span className={styles.mail} aria-hidden="true">
          <svg
            viewBox="0 0 40 30"
            width="34"
            height="26"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <defs>
              {/* Everything above the envelope's top edge. The letter is
                  clipped rather than hidden behind an opaque flap — the panel
                  is translucent glass now, so a shape painted in "the panel
                  colour" would show as a dark patch on it. */}
              <clipPath id={aboveEnvelope}>
                <rect x="-10" y="-16" width="60" height="23" />
              </clipPath>
            </defs>

            <rect
              className={styles.body}
              x="2"
              y="7"
              width="36"
              height="21"
              rx="2"
            />
            <path className={styles.flap} d="M2 7 20 19 38 7Z" />
            <g clipPath={`url(#${aboveEnvelope})`}>
              <rect
                className={styles.letter}
                x="8"
                y="6"
                width="24"
                height="16"
                rx="1.5"
              />
            </g>
          </svg>
        </span>
        <span className={styles.label}>OTP Sign in</span>
        <span className={styles.chevron} aria-hidden="true">
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </summary>

      <form action={codeFormAction} className="mt-4 space-y-3">
        <label
          className="block text-xs font-medium text-gray-900"
          htmlFor="otp-request-email"
        >
          Email
        </label>
        <div className="relative">
          <input
            className={field}
            id="otp-request-email"
            type="email"
            name="email"
            placeholder="Enter your email address"
            autoComplete="email"
            defaultValue={codeEmail}
            required
          />
          <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
        </div>
        <SendCodeButton pending={isCodePending} sent={!!codeEmail} />
        <div aria-live="polite" aria-atomic="true">
          {/* Cleared by a fresh send, which is what fixes it. */}
          {codeErrorMessage && !codeState.email && (
            <p className="text-sm text-red-500">{codeErrorMessage}</p>
          )}
          {codeState.error && (
            <p className="text-sm text-red-500">{codeState.error}</p>
          )}
          {codeState.message && (
            <p className="text-sm text-gray-600">{codeState.message}</p>
          )}
        </div>
      </form>

      {/* Only appears once a code is actually out — there is nothing to type
          before that, and an address field here would be the second one on
          screen asking for the same thing. The address rides along hidden,
          taken from what requestEmailCode just confirmed.

          Plain GET to app/login/email-link — the emailed link is the same
          URL with `otp` filled in already, so clicking it and typing the
          code here verify identically. No client-side handling needed. */}
      {codeEmail && (
        <form
          method="get"
          action="/login/email-link"
          className="mt-4 space-y-3 border-t border-gray-200 pt-4"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <input type="hidden" name="email" value={codeEmail} />

          <label
            className="block text-xs font-medium text-gray-900"
            htmlFor="otp-token"
          >
            6-digit code
          </label>
          {/* Keyed on the address so a fresh send remounts the field, which is
              what lets autoFocus fire again and clears any stale digits. */}
          <input
            key={codeEmail}
            autoFocus
            className={field.replace('pl-10', 'px-3')}
            id="otp-token"
            type="text"
            name="otp"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            autoComplete="one-time-code"
            required
          />
          <LogoutButton
            type="submit"
            label="Sign in with code"
            variant="brand"
            className="w-full justify-between"
          />
        </form>
      )}
    </details>
    </div>
    </>
  );
}

/**
 * Submit button for the code request. The door-and-figure on the sign-in
 * buttons says "you are going through" — wrong verb here, where nothing moves
 * but the message, so the envelope tips into an inbox tray instead. Same
 * approach as log-out-button: one SVG, every stage a selector off data-state,
 * no animation state in React.
 */
function SendCodeButton({
  pending,
  sent,
}: {
  pending: boolean;
  sent: boolean;
}) {
  const state = pending ? 'sending' : sent ? 'sent' : 'idle';

  return (
    <button
      type="submit"
      disabled={pending}
      data-state={state}
      aria-busy={pending}
      className={styles.sendButton}
    >
      <span className={styles.label}>
        {pending ? 'Sending…' : sent ? 'Send another code' : 'Send me a code'}
      </span>

      <svg
        className={styles.outbox}
        viewBox="0 0 48 32"
        width="42"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {/* The tray sits still; the envelope flies into it. Drawn first so a
            landing envelope reads as being in front of the lip. */}
        <path
          className={styles.tray}
          d="M27 15h5l2 4h6l2-4h5v13H27z"
        />
        <g className={styles.packet}>
          <rect x="3" y="9" width="19" height="14" rx="1.5" />
          <path d="M3 10.5 12.5 18 22 10.5" />
        </g>
        {/* Three speed lines, drawn in behind the envelope as it launches. */}
        <g className={styles.trail}>
          <path d="M0 12h6" />
          <path d="M0 17h9" />
          <path d="M0 22h5" />
        </g>
      </svg>
    </button>
  );
}