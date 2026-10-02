'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

import { createOrganization } from '@/app/lib/org-actions';
import GlassSelect from '@/app/ui/glass-select';
import { industryOptions } from '@/components/ui/use-case-explorer';
import { toastError, toastSuccess } from '@/hooks/use-toast';

const input =
  'block w-full rounded-md border border-gray-200 bg-transparent px-3 py-[9px] text-sm outline-2 placeholder:text-gray-500';
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-900';

const sectors = industryOptions.map((o) => o.sector);
const asIs = (value: string) => value;

/**
 * "Create organization" button and its form, a native <dialog> like the Team
 * page's. Industry is the landing page's own pair of dropdowns — sector, then
 * the business within it — fed from the same list, and is stored as the
 * business (or the sector, if no business is picked). There is no slug field:
 * the server makes it from the name.
 */
export default function CreateOrganization() {
  const dialog = useRef<HTMLDialogElement>(null);
  // Bumped on every open, so the form remounts empty.
  const [formKey, setFormKey] = useState(0);
  const [sector, setSector] = useState('');
  const [business, setBusiness] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const businesses =
    industryOptions.find((o) => o.sector === sector)?.businesses ?? [];

  function open() {
    setFormKey((k) => k + 1);
    setSector('');
    setBusiness('');
    setError(null);
    dialog.current?.showModal();
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (name: string) => String(data.get(name) ?? '');
    const name = text('name');

    startTransition(async () => {
      const result = await createOrganization({
        name,
        email: text('email'),
        phone: text('phone'),
        website: text('website'),
        industry: business || sector,
        billingEmail: text('billingEmail'),
        postalCode: text('postalCode'),
      });
      if ('error' in result && result.error) {
        setError(result.error);
        toastError('Organization not created', result.error);
      } else {
        dialog.current?.close();
        toastSuccess('Organization created', `${name} is on the list now.`);
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
        Create organization
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="max-h-[92vh] w-[min(92vw,30rem)] rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form key={formKey} onSubmit={submit} className="space-y-4 p-5">
          <h3 className="text-base font-semibold">Create organization</h3>

          <div>
            <label className={labelClass} htmlFor="new-org-name">
              Name
            </label>
            <input
              id="new-org-name"
              name="name"
              required
              minLength={2}
              maxLength={120}
              autoFocus
              autoComplete="off"
              placeholder="Bella Napoli"
              className={input}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="new-org-email">
                Email
              </label>
              <input
                id="new-org-email"
                name="email"
                type="email"
                autoComplete="off"
                placeholder="hello@mazzyai.com"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="new-org-phone">
                Phone number
              </label>
              <input
                id="new-org-phone"
                name="phone"
                type="tel"
                autoComplete="off"
                placeholder="+31 687441003"
                className={input}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="new-org-website">
              Website
            </label>
            <input
              id="new-org-website"
              name="website"
              autoComplete="off"
              placeholder="company.com"
              className={input}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="new-org-sector">
                Industry
              </label>
              <GlassSelect
                id="new-org-sector"
                value={sector}
                options={sectors}
                format={asIs}
                placeholder="Sector"
                onChange={(next) => {
                  setSector(next);
                  setBusiness('');
                }}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="new-org-business">
                Business
              </label>
              {/* Keyed on the sector, so picking another one remounts the
                  list closed instead of leaving the old panel open. */}
              <GlassSelect
                key={sector}
                id="new-org-business"
                value={business}
                options={businesses}
                format={asIs}
                placeholder={sector ? 'Business' : 'Pick a sector first'}
                onChange={setBusiness}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="new-org-billing">
                Billing email
              </label>
              <input
                id="new-org-billing"
                name="billingEmail"
                type="email"
                autoComplete="off"
                placeholder="billing@company.com"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="new-org-postal">
                Postal code
              </label>
              <input
                id="new-org-postal"
                name="postalCode"
                maxLength={20}
                autoComplete="off"
                placeholder="10115"
                className={input}
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
