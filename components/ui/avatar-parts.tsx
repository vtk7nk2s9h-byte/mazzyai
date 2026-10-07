'use client';

import * as React from 'react';
import Image, { type ImageProps } from 'next/image';

import { cn } from '@/app/lib/utils';

/**
 * Web port of heroui-native's Avatar (src/components/avatar). The library
 * itself is React Native + Reanimated + Uniwind, so it can't render here; this
 * keeps its anatomy (Avatar / Avatar.Image / Avatar.Fallback), props (size,
 * variant, color, delayMs, alt) and useAvatar() status, on next/image and
 * Tailwind 3. Sizes, the 15% soft tint, the 200ms image fade and the person
 * icon sizes are the library's; colours map onto this project's palette.
 *
 * This file is the client half: state, effects and the three parts. The
 * `<Avatar>` + `<Avatar.Image>` compound object lives in ./avatar, which has no
 * 'use client' — a server component can't read `.Image` off a client export,
 * so building the namespace here would leave it undefined for OrgAvatar.
 *
 * One deliberate difference from the native primitive: the fallback shows
 * while the image is still loading as well as after it errors (Radix's
 * behaviour). Native hides it until error, which on the web would leave an
 * empty disc between server HTML and hydration.
 */

type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarVariant = 'default' | 'soft';
type AvatarColor = 'default' | 'accent' | 'success' | 'warning' | 'danger';
type AvatarStatus = 'loading' | 'loaded' | 'error';

// Full literals, not template strings, so Tailwind's scanner sees every class.
const SIZE: Record<AvatarSize, string> = {
  sm: 'size-10',
  md: 'size-12',
  lg: 'size-16',
};

const TEXT_SIZE: Record<AvatarSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const ICON_SIZE: Record<AvatarSize, string> = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
};

/** The library's `*-soft-foreground`: the colour initials and the icon take. */
const FOREGROUND: Record<AvatarColor, string> = {
  default: 'text-gray-700',
  accent: 'text-brand-red-lit',
  success: 'text-success-lit',
  warning: 'text-amber-400',
  danger: 'text-destructive-lit',
};

/** `soft` is the colour at 15%; `default` is one neutral for every colour. */
const SOFT_BG: Record<AvatarColor, string> = {
  default: 'bg-gray-200',
  accent: 'bg-brand-red-lit/15',
  success: 'bg-success-lit/15',
  warning: 'bg-amber-400/15',
  danger: 'bg-destructive-lit/15',
};

type AvatarContextValue = {
  size: AvatarSize;
  color: AvatarColor;
  alt: string;
  status: AvatarStatus;
  setStatus: (status: AvatarStatus) => void;
};

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

/** Loading state of the image — e.g. to draw a skeleton while it's 'loading'. */
export function useAvatar() {
  const ctx = React.useContext(AvatarContext);
  if (!ctx) throw new Error('useAvatar must be used inside <Avatar>');
  return { status: ctx.status, setStatus: ctx.setStatus };
}

type AvatarProps = React.ComponentProps<'span'> & {
  size?: AvatarSize;
  variant?: AvatarVariant;
  color?: AvatarColor;
  /** Accessible name; the library defaults to 'Avatar'. */
  alt?: string;
};

function AvatarRoot({
  size = 'md',
  variant = 'default',
  color = 'accent',
  alt = 'Avatar',
  className,
  children,
  ...props
}: AvatarProps) {
  const [status, setStatus] = React.useState<AvatarStatus>('loading');
  const value = React.useMemo(
    () => ({ size, color, alt, status, setStatus }),
    [size, color, alt, status],
  );

  return (
    <AvatarContext.Provider value={value}>
      <span
        className={cn(
          'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
          SIZE[size],
          // `default` is one neutral fill whatever the colour; `soft` tints.
          variant === 'default' ? 'bg-gray-200' : SOFT_BG[color],
          className,
        )}
        {...props}
      >
        {children}
      </span>
    </AvatarContext.Provider>
  );
}

function AvatarImage({
  src,
  alt,
  className,
  ...props
}: Omit<ImageProps, 'fill' | 'alt' | 'unoptimized' | 'src'> & {
  src?: ImageProps['src'] | null;
  alt?: string;
}) {
  const ctx = React.useContext(AvatarContext);
  if (!ctx) throw new Error('<Avatar.Image> must be used inside <Avatar>');
  const { setStatus, status } = ctx;
  const ref = React.useRef<HTMLImageElement>(null);

  // onLoad never fires for an image that finished before hydration, so look at
  // the element itself as well as listening for events.
  React.useEffect(() => {
    const img = ref.current;
    setStatus(
      !src
        ? 'error'
        : img?.complete
          ? img.naturalWidth > 0
            ? 'loaded'
            : 'error'
          : 'loading',
    );
  }, [src, setStatus]);

  if (!src || status === 'error') return null;

  return (
    <Image
      ref={ref}
      src={src}
      alt={alt ?? ctx.alt}
      fill
      sizes="64px"
      // No remotePatterns in next.config.ts: the optimizer would reject an
      // arbitrary tenant-supplied host, so the URL is served as given.
      unoptimized
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('error')}
      className={cn(
        'object-cover transition-opacity duration-200 ease-in',
        status === 'loaded' ? 'opacity-100' : 'opacity-0',
        className,
      )}
      {...props}
    />
  );
}

/** The library's default fallback glyph. */
function PersonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 4.5C10 5.60457 9.10457 6.5 8 6.5C6.89543 6.5 6 5.60457 6 4.5C6 3.39543 6.89543 2.5 8 2.5C9.10457 2.5 10 3.39543 10 4.5ZM11.5 4.5C11.5 6.433 9.933 8 8 8C6.067 8 4.5 6.433 4.5 4.5C4.5 2.567 6.067 1 8 1C9.933 1 11.5 2.567 11.5 4.5ZM2.5 12.5C2.5 12.2955 2.72027 11.6911 3.81956 11.0413C4.83752 10.4395 6.31979 10 8 10C9.68021 10 11.1625 10.4395 12.1804 11.0413C13.2797 11.6911 13.5 12.2955 13.5 12.5C13.5 13.0523 13.0523 13.5 12.5 13.5H3.5C2.94772 13.5 2.5 13.0523 2.5 12.5ZM8 8.5C4.15 8.5 1 10.5 1 12.5C1 13.8807 2.11929 15 3.5 15H12.5C13.8807 15 15 13.8807 15 12.5C15 10.5 11.85 8.5 8 8.5Z"
      />
    </svg>
  );
}

function AvatarFallback({
  children,
  delayMs = 0,
  color: colorProp,
  className,
  ...props
}: React.ComponentProps<'span'> & {
  /** Hold the fallback back this long, so a fast image never flashes it. */
  delayMs?: number;
  color?: AvatarColor;
}) {
  const ctx = React.useContext(AvatarContext);
  if (!ctx) throw new Error('<Avatar.Fallback> must be used inside <Avatar>');

  const [elapsed, setElapsed] = React.useState(false);
  React.useEffect(() => {
    if (delayMs <= 0) return;
    const t = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  if (ctx.status === 'loaded' || (delayMs > 0 && !elapsed)) return null;

  const color = colorProp ?? ctx.color;

  return (
    <span
      role="img"
      aria-label={ctx.alt}
      className={cn(
        'flex size-full items-center justify-center rounded-full font-medium',
        TEXT_SIZE[ctx.size],
        FOREGROUND[color],
        className,
      )}
      {...props}
    >
      {children ?? <PersonIcon className={ICON_SIZE[ctx.size]} />}
    </span>
  );
}

export { AvatarRoot, AvatarImage, AvatarFallback };
