import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';

import { cn } from "@/app/lib/utils.ts"
import SectionHeading from '@/components/ui/section-heading';

export type CardItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional — renders the "Learn more" affordance when present. */
  href?: string;
};

type GlassCardProps = CardItem & {
  /** Offsets this card's border arc so a row doesn't animate in lockstep. */
  index?: number;
  className?: string;
  /** Tighter padding and a smaller icon, for a shorter card. */
  compact?: boolean;
};

/**
 * Glass panel with a red arc travelling around its edge.
 *
 * Three stacked layers, all sharing the article's radius:
 *  1. a blurred ring — the glow, sitting just outside the card,
 *  2. a crisp 1px ring — the border itself,
 *  3. the glass surface, which reads the page background through a
 *     backdrop-filter.
 *
 * The glow is a blurred child inside a filtered wrapper rather than a blurred
 * .glow-ring directly: a filter on the masked element itself would be clipped
 * back to the ring by its own mask, killing the bleed that makes it glow.
 */
export function GlassCard({
  icon: Icon,
  title,
  description,
  href,
  index = 0,
  className,
  compact = false,
}: GlassCardProps) {
  return (
    <article
      style={{ '--ring-delay': `${index * -1.7}s` } as React.CSSProperties}
      className={cn(
        'group relative rounded-2xl transition-transform duration-500 ease-out hover:-translate-y-1',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[3px] rounded-[inherit] opacity-60 blur-[10px] transition-opacity duration-500 group-hover:opacity-100"
      >
        <div className="glow-ring h-full w-full rounded-[inherit] [--ring-w:3px]" />
      </div>

      <div
        aria-hidden="true"
        className="glow-ring pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
      />

      <div
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-[inherit] border border-white/[0.07] bg-white/[0.035] shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl',
          compact ? 'p-5' : 'p-7',
        )}
      >
        {/* Specular sheen across the top edge — what sells the surface as
            glass rather than a flat translucent fill. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -top-24 h-48 w-48 rounded-full bg-maroon-400/20 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
        />

        <span
          className={cn(
            'relative inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#ff6b78] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors duration-300 group-hover:border-maroon-400/50 group-hover:text-[#ff8a95]',
            compact ? 'mb-3 h-10 w-10' : 'mb-6 h-12 w-12',
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>

        <h3 className="relative text-lg font-semibold tracking-tight text-gray-900">
          {title}
        </h3>
        <p className="relative mt-3 text-sm leading-relaxed text-gray-500">
          {description}
        </p>

        {href ? (
          <Link
            href={href}
            className="relative mt-6 inline-flex items-center gap-1.5 self-start text-sm font-medium text-gray-600 transition-colors hover:text-[#ff8a95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            Learn more
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

type CardSectionProps = {
  /** Slugified into the heading id the section is labelled by. */
  id: string;
  /** Omit to render just the cards, with no heading block. */
  title?: string;
  eyebrow?: string;
  description?: string;
  items: CardItem[];
  /** Rendered between the heading and the card row — e.g. the explorer. */
  children?: React.ReactNode;
  className?: string;
  /** Overrides the card row's default gap-6. */
  gridClassName?: string;
  /** Shorter cards, passed down to each GlassCard. */
  compact?: boolean;
};

/** Centred heading, an optional block of its own, then a row of three cards. */
export default function CardSection({
  id,
  title,
  eyebrow,
  description,
  items,
  children,
  className,
  gridClassName,
  compact,
}: CardSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn('mx-auto w-full max-w-6xl px-6 py-24', className)}
    >
      {title ? (
        <SectionHeading
          id={headingId}
          title={title}
          eyebrow={eyebrow}
          description={description}
          className="mb-16"
        />
      ) : null}

      {children}

      <div className={cn('grid grid-cols-1 gap-6 md:grid-cols-3', gridClassName)}>
        {items.map((item, i) => (
          <GlassCard key={item.title} index={i} compact={compact} {...item} />
        ))}
      </div>
    </section>
  );
}
