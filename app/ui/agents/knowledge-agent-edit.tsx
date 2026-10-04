'use client';

import { useRef, useState, useTransition } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';

import { setKnowledgeAgent } from '@/app/lib/knowledge-actions';
import { AssignmentBadge } from '@/app/ui/organizations/status';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toastError, toastSuccess } from '@/hooks/use-toast';

// The radio group's values are strings, so "all agents" gets one that can't
// collide with an agent's id.
const ALL = 'ALL';

/**
 * The agent a knowledge-base asset applies to, as a badge with a small pencil
 * beside it. The pencil opens a <dialog> in the same shape as the one that
 * assigns a Retell agent to an organization: pick one and Save.
 */
export default function KnowledgeAgentEdit({
  documentId,
  title,
  agentId,
  agents,
}: {
  documentId: string;
  title: string;
  agentId: string | null;
  agents: { id: string; name: string }[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const current = agentId ?? ALL;
  const [choice, setChoice] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameOf = (value: string) =>
    value === ALL
      ? 'All agents'
      : (agents.find((a) => a.id === value)?.name ?? 'Unknown agent');

  function open() {
    setChoice(current);
    setError(null);
    dialog.current?.showModal();
  }

  function save() {
    startTransition(async () => {
      const result = await setKnowledgeAgent(
        documentId,
        choice === ALL ? null : choice,
      );
      if (result && 'error' in result && result.error) {
        setError(result.error);
        toastError('Agent not changed', result.error);
      } else {
        dialog.current?.close();
        toastSuccess('Agent updated', `${title} now applies to ${nameOf(choice)}.`);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <AssignmentBadge name={agentId ? nameOf(agentId) : null} />
      <button
        type="button"
        onClick={open}
        aria-label={`Choose the agent ${title} applies to`}
        className="group inline-flex rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
      >
        <PencilIcon className="h-4 w-4 text-gray-500 transition-[color,filter] duration-200 group-hover:text-brand-red-lit group-hover:[filter:drop-shadow(0_0_8px_rgba(255,46,67,0.65))] group-focus-visible:text-brand-red-lit" />
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
          <h3 className="text-base font-semibold">Apply to agent</h3>
          <p className="mt-1 truncate text-xs text-gray-500">{title}</p>

          <RadioGroup
            aria-label="Agents"
            value={choice}
            onValueChange={setChoice}
            className="mt-4 max-h-64 gap-1 overflow-y-auto"
          >
            {[ALL, ...agents.map((a) => a.id)].map((value) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-sm transition-colors hover:bg-white/[0.04] has-[[data-state=checked]]:border-brand-red-lit/50 has-[[data-state=checked]]:bg-maroon-500/30"
              >
                <RadioGroupItem value={value} />
                {nameOf(value)}
              </label>
            ))}
          </RadioGroup>

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
              disabled={pending || choice === current}
              className="rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
