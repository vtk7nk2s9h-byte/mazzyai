import { cn } from '@/app/lib/utils';

type ArrowIconProps = {
  /** Right is the shape as drawn; left is the same paths mirrored. */
  direction?: 'right' | 'left';
  /** Width in px; the height follows from the 40:24 viewBox. */
  size?: number;
  className?: string;
};

/**
 * The app's one arrow — the long-shafted one from the sign-in buttons. Stroke
 * is currentColor, so colour, glow and motion all come from the caller's
 * classes; nothing is baked in here. Elongated viewBox rather than a scaled-up
 * square: stretching the shaft is what makes it read as long, not just large.
 */
export default function ArrowIcon({
  direction = 'right',
  size = 35,
  className,
}: ArrowIconProps) {
  return (
    <svg
      viewBox="0 0 40 24"
      width={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(direction === 'left' && '-scale-x-100', className)}
    >
      <path d="M2 12h32" />
      <path d="M26.5 5 34 12l-7.5 7" />
    </svg>
  );
}
