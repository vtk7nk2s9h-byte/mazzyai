'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

import { createUser } from '@/app/lib/user-actions';
import { USER_ROLES, type UserRole } from '@/app/lib/utils';
import GlassSelect from '@/app/ui/glass-select';
import { toastError, toastSuccess } from '@/hooks/use-toast';

const input =
  'block w-full rounded-md border border-gray-200 bg-transparent px-3 py-[9px] text-sm outline-2 placeholder:text-gray-500';
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-900';

/**
 * "Create user" button and its form. The form is a native <dialog> — modal,
 * blurred ::backdrop, Escape-to-close and focus handling for free — the same
 * way the agenda's event form works. The fresh account signs in with the
 * password entered here.
 */
export default function CreateUser() {
  const dialog = useRef<HTMLDialogElement>(null);
  // Bumped on every open, so the form remounts empty rather than keeping the
  // last person's details.
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('USER');
  const [pending, startTransition] = useTransition();

  function open() {
    setFormKey((k) => k + 1);
    setError(null);
    setRole('USER');
    dialog.current?.showModal();
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createUser({
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        password: String(data.get('password') ?? ''),
        role,
      });
      if ('error' in result && result.error) {
        setError(result.error);
        toastError('User not created', result.error);
      } else {
        dialog.current?.close();
        toastSuccess('User created', `${String(data.get('email'))} can sign in now.`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <PlusIcon className="h-4 w-4" />
        Create user
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="w-[min(92vw,26rem)] rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form key={formKey} onSubmit={submit} className="space-y-4 p-5">
          <h3 className="text-base font-semibold">Create user</h3>

          <div>
            <label className={labelClass} htmlFor="new-user-name">
              Name
            </label>
            <input
              id="new-user-name"
              name="name"
              required
              minLength={2}
              maxLength={120}
              autoFocus
              autoComplete="off"
              placeholder="Full name"
              className={input}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="new-user-email">
              Email
            </label>
            <input
              id="new-user-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder="name@company.com"
              className={input}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="new-user-password">
                Password
              </label>
              <input
                id="new-user-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="8+ characters"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="new-user-role">
                Role
              </label>
              <GlassSelect
                id="new-user-role"
                value={role}
                options={USER_ROLES}
                onChange={setRole}
              />
            </div>
          </div>

          <p aria-live="polite" className="min-h-4 text-xs text-red-400">
            {error}
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:text-brand-red-lit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60"
            >
              {pending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
