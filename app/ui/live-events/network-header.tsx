import {
  ChevronRightIcon,
  CloudIcon,
  CpuChipIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline';

const nodes = [
  { icon: CloudIcon, label: 'Provider', sub: 'AI Voice' },
  { icon: CpuChipIcon, label: 'MazzyAI', sub: 'Platform' },
  { icon: MicrophoneIcon, label: 'Live Session', sub: 'Calls' },
];

/** The link between two nodes: a lit rule with an arrowhead, like the map in
 *  Windows' Network and Sharing Center. */
function Link() {
  return (
    <div
      aria-hidden="true"
      className="relative mb-9 flex h-6 min-w-8 flex-1 items-center sm:min-w-16"
    >
      <span className="h-px w-full bg-gradient-to-r from-brand-red/30 via-brand-red-lit to-brand-red/30 shadow-[0_0_8px_rgba(255,46,67,0.6)]" />
      <ChevronRightIcon className="absolute -right-1 w-4 text-brand-red-lit" />
    </div>
  );
}

/**
 * Provider -> MazzyAI -> Live Session, as three connected nodes. Purely
 * presentational: it names the path a call takes into the events below.
 */
export default function NetworkHeader() {
  return (
    <div
      role="img"
      aria-label="Provider connects to MazzyAI, which connects to the live session"
      className="flex items-start justify-center rounded-lg border border-white/[0.12] bg-gradient-to-br from-white/[0.10] to-white/[0.03] px-4 pb-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:px-8"
    >
      {nodes.map((node, i) => {
        const NodeIcon = node.icon;
        return (
          <div key={node.label} className="contents">
            {i > 0 && <Link />}
            <div className="flex w-20 shrink-0 flex-col items-center text-center sm:w-24">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.06] text-brand-red-lit shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                <NodeIcon className="w-6" />
              </span>
              <p className="mt-2 text-xs font-medium text-gray-900">
                {node.label}
              </p>
              <p className="text-[10px] text-gray-500">{node.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
