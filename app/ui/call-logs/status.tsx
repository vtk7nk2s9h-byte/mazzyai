import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const pill = 'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs';

/** REGISTERED / ONGOING / ENDED / ANALYZED / FAILED. */
export function CallStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(pill, {
        'bg-gray-100 text-gray-500': status === 'REGISTERED',
        'bg-amber-500/15 text-amber-300': status === 'ONGOING',
        'bg-gray-100 text-gray-600': status === 'ENDED',
        'bg-green-500/15 text-green-400': status === 'ANALYZED',
        'bg-red-500/15 text-red-400': status === 'FAILED',
      })}
    >
      {status === 'REGISTERED' && (
        <>
          Registered <ClockIcon className="w-4" />
        </>
      )}
      {status === 'ONGOING' && (
        <>
          Ongoing <PhoneIcon className="w-4" />
        </>
      )}
      {status === 'ENDED' && (
        <>
          Ended <CheckIcon className="w-4" />
        </>
      )}
      {status === 'ANALYZED' && (
        <>
          Analyzed <CheckIcon className="w-4" />
        </>
      )}
      {status === 'FAILED' && (
        <>
          Failed <ExclamationTriangleIcon className="w-4" />
        </>
      )}
    </span>
  );
}

/** INBOUND / OUTBOUND / WEB. */
export function CallDirectionBadge({ direction }: { direction: string }) {
  return (
    <span className={clsx(pill, 'bg-gray-100 text-gray-600')}>
      {direction === 'INBOUND' && (
        <>
          <ArrowDownLeftIcon className="w-4 text-green-400" /> Inbound
        </>
      )}
      {direction === 'OUTBOUND' && (
        <>
          <ArrowUpRightIcon className="w-4 text-maroon-300" /> Outbound
        </>
      )}
      {direction === 'WEB' && (
        <>
          <GlobeAltIcon className="w-4 text-brand-red-lit" /> Web
        </>
      )}
    </span>
  );
}

/** A dot rather than a word — sentiment is a hint, not a headline. */
export function SentimentDot({ sentiment }: { sentiment: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-gray-500">
      <span
        aria-hidden="true"
        className={clsx('h-2 w-2 rounded-full', {
          'bg-green-400': sentiment === 'POSITIVE',
          'bg-gray-400': sentiment === 'NEUTRAL',
          'bg-red-400': sentiment === 'NEGATIVE',
          'bg-gray-300/40': sentiment === 'UNKNOWN',
        })}
      />
      {sentiment.charAt(0) + sentiment.slice(1).toLowerCase()}
    </span>
  );
}
