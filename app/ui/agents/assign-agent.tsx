'use client';

import { useRef, useState, useTransition } from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';

import { assignRetellAgent } from '@/app/lib/retell-actions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toastError, toastSuccess } from '@/hooks/use-toast';

/**
 * A link icon next to a Retell agent's name, opening a <dialog> listing every
 * organization. Pick one and Assign to attach the agent to it; the agent's
 * current organization is preselected, and picking another moves it.
 */
export default function AssignAgent({
  retellAgentId,
  agentName,
  assignedOrgId,
  organizations,
}: {
  retellAgentId: string;
  agentName: string;
  assignedOrgId: string | null;
  organizations: { id: string; name: string }[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState(assignedOrgId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setChoice(assignedOrgId ?? '');
    setError(null);
    dialog.current?.showModal();
  }

  function save() {
    const org = organizations.find((o) => o.id === choice);
    if (!org) return;
    startTransition(async () => {
      const result = await assignRetellAgent(retellAgentId, agentName, org.id);
      if ('error' in result && result.error) {
        setError(result.error);
        toastError('Agent not assigned', result.error);
      } else {
        dialog.current?.close();
        toastSuccess(
          'Agent assigned',
          `${agentName} now belongs to ${org.name}.`,
        );
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Assign ${agentName} to an organization`}
        className="group ml-2 inline-flex rounded align-middle focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <LinkIcon className="h-4 w-4 text-gray-500 transition-[color,filter] duration-200 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))] group-focus-visible:text-brand-red-lit" />
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="max-h-[92vh] w-[min(92vw,24rem)] whitespace-normal normal-case rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="p-5"
        >
          <h3 className="text-base font-semibold">Assign to organization</h3>
          <p className="mt-1 text-xs text-gray-500">{agentName}</p>

          {organizations.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No organizations yet.</p>
          ) : (
            <RadioGroup
              aria-label="Organizations"
              value={choice}
              onValueChange={setChoice}
              className="mt-4 max-h-64 gap-1 overflow-y-auto"
            >
              {organizations.map((org) => (
                <label
                  key={org.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-sm transition-colors hover:bg-white/[0.04] has-[[data-state=checked]]:border-brand-red-lit/50 has-[[data-state=checked]]:bg-maroon-500/30"
                >
                  <RadioGroupItem value={org.id} />
                  {org.name}
                </label>
              ))}
            </RadioGroup>
          )}

          <p aria-live="polite" className="mt-3 min-h-4 text-xs text-red-400">
            {error}
          </p>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:text-brand-red-lit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !choice || choice === assignedOrgId}
              className="rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60"
            >
              {pending ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
