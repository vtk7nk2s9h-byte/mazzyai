'use client';
 
import { lusitana } from '@/app/ui/fonts';
import {
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import LogoutButton from '@/app/ui/log-out-button';
import Link from 'next/link';
import { useActionState } from 'react';
import { authenticate } from '@/app/lib/actions';
import {
  requestEmailCode,
  type RequestEmailCodeState,
} from '@/app/lib/auth-actions';
import { useSearchParams } from 'next/navigation';

const initialCodeState: RequestEmailCodeState = {};

const field =
  'peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );
  const [codeState, codeFormAction, isCodePending] = useActionState(
    requestEmailCode,
    initialCodeState,
  );

  return (
    <>
    <form action={formAction} className="space-y-3">
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className={`${lusitana.className} mb-3 text-2xl`}>
          Please log in to continue.
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
            <div className="relative">
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
          variant="brand"
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

    <details className="mt-3 rounded-lg bg-gray-50 px-6 py-4">
      <summary className="cursor-pointer text-sm font-medium text-gray-900">
        Or sign in with an emailed code
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
            required
          />
          <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
        </div>
        <LogoutButton
          type="submit"
          label="Send me a code"
          variant="dark"
          disabled={isCodePending}
          className="w-full justify-between"
        />
        <div aria-live="polite" aria-atomic="true">
          {codeState.error && (
            <p className="text-sm text-red-500">{codeState.error}</p>
          )}
          {codeState.message && (
            <p className="text-sm text-gray-600">{codeState.message}</p>
          )}
        </div>
      </form>

      {/* Plain GET straight to Auth.js's own callback route — the emailed
          link is the same URL, just with `token` filled in already, so
          clicking it and typing the code here verify identically. No
          client-side handling needed. */}
      <form
        method="get"
        action="/api/auth/callback/email-otp"
        className="mt-4 space-y-3 border-t border-gray-200 pt-4"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label
          className="block text-xs font-medium text-gray-900"
          htmlFor="otp-verify-email"
        >
          Email
        </label>
        <div className="relative">
          <input
            className={field}
            id="otp-verify-email"
            type="email"
            name="email"
            placeholder="Enter your email address"
            autoComplete="email"
            required
          />
          <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
        </div>
        <label
          className="block text-xs font-medium text-gray-900"
          htmlFor="otp-token"
        >
          6-digit code
        </label>
        <input
          className={field.replace('pl-10', 'px-3')}
          id="otp-token"
          type="text"
          name="token"
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
    </details>
    </>
  );
}