'use client';

import { useTransition } from 'react';

import { startTunnelAction, stopTunnelAction } from '@/app/lib/tunnel-actions';
import { toastError, toastSuccess } from '@/hooks/use-toast';

/** Starts or stops the dev tunnel; rendered only in development, by a superuser. */
export default function TunnelButton({ mode }: { mode: 'start' | 'stop' }) {
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result =
        mode === 'start' ? await startTunnelAction() : await stopTunnelAction();
      if ('error' in result && result.error) {
        toastError(mode === 'start' ? 'Tunnel not started' : 'Tunnel not stopped', result.error);
      } else if (mode === 'start' && 'host' in result) {
        // The action also pushes the address to Retell, and whether that
        // succeeded is the part worth reading — the URL alone used to look like
        // success even when no agent had been told about it.
        toastSuccess(
          'Tunnel is up',
          `${'message' in result ? `${result.message} ` : ''}Webhook URL: https://${result.host}/api/retell/webhook`,
        );
      } else {
        toastSuccess('Tunnel stopped');
      }
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className="rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-2 py-0.5 text-[11px] font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60"
    >
      {pending
        ? mode === 'start'
          ? 'Starting…'
          : 'Stopping…'
        : mode === 'start'
          ? 'Start tunnel'
          : 'Stop'}
    </button>
  );
}
