import { checkRetell, checkTunnel } from '@/app/lib/retell-health';
import { ownedTunnel } from '@/app/lib/tunnel-process';
import TunnelButton from '@/app/ui/live-events/tunnel-button';

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
  children,
}: {
  tone: 'good' | 'bad' | 'dim';
  name: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <Dot tone={tone} />
      <span className="text-gray-500">{name}</span>
      <span className="text-gray-900">{value}</span>
      {children}
    </li>
  );
}

/**
 * The two links a call depends on. "API" is a live test from here to Retell.
 * "Tunnel" is whether a public tunnel is carrying Retell's webhooks to this dev
 * server; no tunnel is shown dim, not red, because outside testing it is the
 * normal state.
 *
 * The tunnel line is for superusers: it describes this machine, which an
 * organization admin has no business with. In development it also carries the
 * button that starts the tunnel, or stops one this server started; a tunnel
 * opened from a terminal is shown but left alone.
 */
export default async function ConnectionStatus({
  showTunnel,
}: {
  showTunnel: boolean;
}) {
  const [health, tunnel] = await Promise.all([
    checkRetell(),
    showTunnel ? checkTunnel() : null,
  ]);

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
      {tunnel && (
        <Item
          tone={
            tunnel.state === 'up' ? 'good' : tunnel.state === 'down' ? 'bad' : 'dim'
          }
          name="Tunnel"
          value={tunnel.host ? `${tunnel.message} · ${tunnel.host}` : tunnel.message}
        >
          {process.env.NODE_ENV !== 'production' &&
            (tunnel.state === 'none' ? (
              <TunnelButton mode="start" />
            ) : ownedTunnel() ? (
              <TunnelButton mode="stop" />
            ) : null)}
        </Item>
      )}
    </ul>
  );
}
