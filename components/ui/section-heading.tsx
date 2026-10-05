import * as React from 'react';

import { cn } from "@/app/lib/utils.ts"

type SectionHeadingProps = {
  /** Rendered with its first letter in the system red. */
  title: string;
  /** Small label above the title. */
  eyebrow?: string;
  /** Sentence under the heading block. */
  description?: string;
  /** Ties the section's aria-labelledby to the <h2>. */
  id?: string;
  className?: string;
};

/**
 * Centred section heading underlined with the same red rule the header's bar
 * items light up on hover — brand-red, blooming downward — with a specular
 * sweep travelling along it.
 *
 * The plate is inline-flex so the rule is the width of the words rather than
 * the width of the page.
 */
export default function SectionHeading({
  title,
  eyebrow,
  description,
  id,
  className,
}: SectionHeadingProps) {
  const first = title.slice(0, 1);
  const rest = title.slice(1);

  const words = (
    <>
      <span className="text-brand-red-lit [text-shadow:0_0_22px_rgba(255,46,67,0.5)]">
        {first}
      </span>
      {rest}
    </>
  );
  const type = 'text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl';

  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <div className="relative inline-flex flex-col items-center px-8 pb-3">
        {eyebrow ? (
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.28em] text-gray-400">
            {eyebrow}
          </p>
        ) : null}

        <h2 id={id} className={type}>
          {words}
        </h2>

        {/* The rule: a red bar that fades out at both ends so it reads as lit
            rather than drawn, with the header's downward glow under it. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-full bg-gradient-to-r from-transparent via-brand-red to-transparent shadow-[0_5px_14px_-6px_rgba(140,25,37,0.95)]"
        >
          <span className="absolute inset-y-0 left-0 w-1/4 animate-rule-shine bg-gradient-to-r from-transparent via-[#ff8a95] to-transparent" />
        </span>
      </div>

      {description ? (
        <p className="mt-12 max-w-2xl text-balance text-sm leading-relaxed text-gray-500 md:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
