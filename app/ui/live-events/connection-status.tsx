import { checkRetell, lastWebhookAt } from '@/app/lib/retell-health';
import { ago } from '@/app/ui/live-events/feed';

const DAY_MS = 86_400_000;

/** A glowing dot, same recipe as the agent status dot: green, red or dim. */
function Dot({ tone }: { tone: 'good' | 'bad' | 'dim' }) {
  return (
    <span
      aria-hidden="true"
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
        tone === 'good'
          ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]'
          : tone === 'bad'
            ? 'bg-brand-red-lit shadow-[0_0_8px_rgba(255,46,67,0.8)]'
            : 'bg-gray-400/60'
      }`}
    />
  );
}

function Item({
  tone,
  name,
  value,
}: {
  tone: 'good' | 'bad' | 'dim';
  name: string;
  value: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <Dot tone={tone} />
      <span className="text-gray-500">{name}</span>
      <span className="text-gray-900">{value}</span>
    </li>
  );
}

/**
 * The two links a call depends on. "API" is a live test from here to Retell.
 * "Webhook" can't be tested from here — Retell has to reach us — so it reports
 * the last delivery instead; having none in a day is shown dim, not red,
 * because a quiet account looks the same as a broken webhook.
 *
 * The webhook line is for superusers: the log is global, so it says nothing
 * specific to one organization.
 */
export default async function ConnectionStatus({
  showWebhook,
}: {
  showWebhook: boolean;
}) {
  const [health, webhookAt] = await Promise.all([
    checkRetell(),
    showWebhook ? lastWebhookAt() : null,
  ]);

  const fresh = webhookAt && Date.now() - Date.parse(webhookAt) < DAY_MS;

  return (
    <ul className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
      <Item
        tone={health.ok ? 'good' : 'bad'}
        name="API"
        value={
          health.ok && health.ms != null
            ? `${health.message} · ${health.ms} ms`
            : health.message
        }
      />
      {showWebhook && (
        <Item
          tone={fresh ? 'good' : 'dim'}
          name="Webhook"
          value={
            webhookAt
              ? `Last event ${ago(webhookAt)}`
              : 'No events received yet'
          }
        />
      )}
    </ul>
  );
}
