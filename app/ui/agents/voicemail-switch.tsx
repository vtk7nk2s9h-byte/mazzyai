'use client';

import { useOptimistic, useTransition } from 'react';

import { setRetellVoicemail } from '@/app/lib/retell-actions';
import { Switch } from '@/components/ui/switch';
import { toastError } from '@/hooks/use-toast';

/**
 * Voicemail detection on/off. Flips at once and settles on the server's answer:
 * if Retell refuses, the switch springs back and a toast says why.
 */
export default function VoicemailSwitch({
  agentId,
  enabled,
}: {
  agentId: string;
  enabled: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    startTransition(async () => {
      setOptimistic(next);
      const result = await setRetellVoicemail(agentId, next);
      if ('error' in result && result.error) {
        toastError('Voicemail not updated', result.error);
      }
    });
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs text-gray-600">
      <Switch
        size="sm"
        checked={optimistic}
        disabled={pending}
        onCheckedChange={change}
      />
      {optimistic ? 'Active' : 'Inactive'}
    </label>
  );
}
