'use client';

import { lusitana } from '@/app/ui/fonts';
import {
  AtSymbolIcon,
  ExclamationCircleIcon,
  KeyIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import LogoutButton from '@/app/ui/log-out-button';
import Link from 'next/link';
import { useActionState } from 'react';
import { signUp, type SignUpState } from '@/app/lib/auth-actions';

const initialState: SignUpState = {};

const field =
  'peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500';
const icon =
  'pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900';

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  return (
    <div id={id} aria-live="polite" aria-atomic="true">
      {errors?.map((error) => (
        <p className="mt-2 text-sm text-red-500" key={error}>
          {error}
        </p>
      ))}
    </div>
  );
}

export default function SignupForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className={`${lusitana.className} mb-3 text-2xl`}>
          Create your account.
        </h1>

        <div className="w-full">
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="name"
            >
              Name
            </label>
            <div className="relative">
              <input
                className={field}
                id="name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                autoComplete="name"
                required
                aria-describedby="name-error"
              />
              <UserIcon className={icon} />
            </div>
            <FieldError id="name-error" errors={state.errors?.name} />
          </div>

          <div className="mt-4">
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <input
                className={field}
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email address"
                autoComplete="email"
                required
                aria-describedby="email-error"
              />
              <AtSymbolIcon className={icon} />
            </div>
            <FieldError id="email-error" errors={state.errors?.email} />
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
                className={field}
                id="password"
                type="password"
                name="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
                aria-describedby="password-error"
              />
              <KeyIcon className={icon} />
            </div>
            <FieldError id="password-error" errors={state.errors?.password} />
          </div>
        </div>

        <LogoutButton
          type="submit"
          label="Sign up"
          variant="brand"
          disabled={isPending}
          className="mt-4 w-full justify-between"
        />

        <div
          className="flex h-8 items-end space-x-1"
          aria-live="polite"
          aria-atomic="true"
        >
          {state.message && (
            <>
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">{state.message}</p>
            </>
          )}
        </div>

        <p className="mt-2 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-maroon-400 underline-offset-2 transition-colors hover:text-brand-red-lit hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </form>
  );
}
