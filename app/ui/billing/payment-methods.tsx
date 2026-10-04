'use client';

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { CreditCardIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

import { deletePaymentMethod, savePaymentMethod } from '@/app/lib/billing-actions';
import { CARD_BRANDS } from '@/app/lib/billing';
import GlassSelect from '@/app/ui/glass-select';
import type { PaymentMethodRow } from '@/app/lib/billing-data';
import { toastError, toastSuccess } from '@/hooks/use-toast';

const input =
  'block w-full rounded-md border border-gray-200 bg-transparent px-3 py-[9px] text-sm outline-2 placeholder:text-gray-500';
const label = 'mb-1.5 block text-xs font-medium text-gray-900';
const dialogClass =
  'w-[min(92vw,26rem)] rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm';
const iconButton =
  'rounded-md p-1.5 text-gray-500 transition-colors hover:text-brand-red-lit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60';

/**
 * An organization's saved cards: add, edit and delete. Only the brand, last
 * four digits and expiry are kept — there is no field for a full number or
 * CVC. The form is a native <dialog>, like the agenda's.
 */
export default function PaymentMethods({
  organizationId,
  methods,
  heading,
}: {
  organizationId: string;
  methods: PaymentMethodRow[];
  /** The section title, so the Add button can sit on its line. */
  heading: ReactNode;
}) {
  const [editing, setEditing] = useState<PaymentMethodRow | null>(null);
  // GlassSelect is controlled, so the provider lives in state, not in FormData.
  const [provider, setProvider] = useState<(typeof CARD_BRANDS)[number]>(CARD_BRANDS[0]);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);

  function open(method: PaymentMethodRow | null) {
    setEditing(method);
    setProvider(
      CARD_BRANDS.find((b) => b === method?.brand) ?? CARD_BRANDS[0],
    );
    setFormKey((k) => k + 1); // remount, so the fields take the new defaults
    setError(null);
    dialog.current?.showModal();
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await savePaymentMethod(organizationId, editing?.id ?? null, {
        brand: provider,
        last4: String(data.get('last4') ?? ''),
        expMonth: String(data.get('expMonth') ?? ''),
        expYear: String(data.get('expYear') ?? ''),
        holderName: String(data.get('holderName') ?? ''),
        billingAddress: String(data.get('billingAddress') ?? ''),
        isDefault: data.get('isDefault') === 'on',
      } as never);
      if ('error' in result) {
        setError(result.error);
        toastError('Card not saved', result.error);
      } else {
        dialog.current?.close();
        toastSuccess(editing ? 'Card updated' : 'Card added', 'Saved to payment information.');
      }
    });
  }

  function remove(method: PaymentMethodRow) {
    if (!confirm(`Delete the ${method.brand} card ending ${method.last4}?`)) return;
    startTransition(async () => {
      const result = await deletePaymentMethod(organizationId, method.id);
      if ('error' in result) toastError('Card not deleted', result.error);
      else toastSuccess('Card deleted', `${method.brand} •••• ${method.last4} was removed.`);
    });
  }

  const year = new Date().getFullYear();

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        {heading}
        <button
          type="button"
          onClick={() => open(null)}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
        >
          <PlusIcon className="h-4 w-4" />
          Add card
        </button>
      </div>

      <div className="overflow-x-auto md:overflow-visible">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <table className="min-w-full text-gray-900">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">Card</th>
                <th scope="col" className="px-3 py-5 font-medium">Cardholder</th>
                <th scope="col" className="px-3 py-5 font-medium">Expires</th>
                <th scope="col" className="px-3 py-5 font-medium">Billing address</th>
                <th scope="col" className="px-3 py-5 font-medium">Default</th>
                <th scope="col" className="relative py-3 pl-6 pr-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-100">
              {methods.length === 0 && (
                <tr>
                  <td colSpan={6} className="rounded-lg px-6 py-6 text-center text-sm text-gray-500">
                    No payment method yet.
                  </td>
                </tr>
              )}
              {methods.map((m) => (
                <tr
                  key={m.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <span className="flex items-center gap-2 font-medium">
                      <CreditCardIcon className="h-4 w-4 text-brand-red-lit" />
                      {m.brand} •••• {m.last4}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{m.holderName}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {String(m.expMonth).padStart(2, '0')}/{m.expYear}
                  </td>
                  <td className="max-w-[28ch] truncate px-3 py-3 text-gray-500">
                    {m.billingAddress ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {m.isDefault ? (
                      <span className="rounded-full border border-maroon-300/70 bg-maroon-500/10 px-2 py-1 text-xs text-maroon-200">
                        Default
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${m.brand} ending ${m.last4}`}
                        onClick={() => open(m)}
                        className={iconButton}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${m.brand} ending ${m.last4}`}
                        disabled={pending}
                        onClick={() => remove(m)}
                        className={iconButton}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className={dialogClass}
      >
        <form key={formKey} onSubmit={submit} className="space-y-4 p-5">
          <h3 className="text-base font-semibold">{editing ? 'Edit card' : 'Add card'}</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="card-provider">Provider</label>
              <GlassSelect
                id="card-provider"
                value={provider}
                options={CARD_BRANDS}
                onChange={setProvider}
                format={(v) => v}
              />
            </div>
            <div>
              <label className={label} htmlFor="card-last4">Last 4 digits</label>
              <input
                id="card-last4"
                name="last4"
                required
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder="4242"
                defaultValue={editing?.last4}
                className={input}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="card-month">Expiry month</label>
              <input
                id="card-month"
                name="expMonth"
                type="number"
                required
                min={1}
                max={12}
                placeholder="MM"
                defaultValue={editing?.expMonth}
                className={input}
              />
            </div>
            <div>
              <label className={label} htmlFor="card-year">Expiry year</label>
              <input
                id="card-year"
                name="expYear"
                type="number"
                required
                min={year}
                max={year + 20}
                placeholder="YYYY"
                defaultValue={editing?.expYear}
                className={input}
              />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="card-holder">Cardholder name</label>
            <input
              id="card-holder"
              name="holderName"
              required
              maxLength={120}
              defaultValue={editing?.holderName}
              className={input}
            />
          </div>

          <div>
            <label className={label} htmlFor="card-address">Billing address</label>
            <input
              id="card-address"
              name="billingAddress"
              maxLength={240}
              placeholder="Optional"
              defaultValue={editing?.billingAddress ?? ''}
              className={input}
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-gray-900">
            <input
              type="checkbox"
              name="isDefault"
              defaultChecked={editing?.isDefault ?? false}
              className="h-4 w-4 rounded border-gray-200 bg-transparent"
            />
            Use as the default card
          </label>

          <p aria-live="polite" className="min-h-4 text-xs text-red-400">{error}</p>

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
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}