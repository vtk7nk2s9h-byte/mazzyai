'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

/**
 * The Analytics time range: a row of links with one lit highlight behind the
 * chosen option, which slides to the next one when another is picked.
 *
 * The highlight moves on the click itself, not when the page comes back, so
 * the slide plays while the server renders the new range. Until it has been
 * measured (the server render, the first paint), the chosen link lights itself
 * instead, so nothing flashes.
 */
export default function RangeFilter({
  ranges,
  current,
  hrefs,
}: {
  ranges: readonly number[];
  current: number;
  /** One URL per range, built by the page so every other choice is kept. */
  hrefs: string[];
}) {
  const [picked, setPicked] = useState(current);
  // Back and forward change the range without a click.
  useEffect(() => setPicked(current), [current]);

  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const el = links.current[ranges.indexOf(picked)];
    if (el) setBox({ x: el.offsetLeft, w: el.offsetWidth });
  }, [picked, ranges]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
        <CalendarDaysIcon className="h-4 w-4 text-brand-red-lit" />
        Time range
      </span>
      <nav
        aria-label="Time range"
        className="relative flex gap-1 rounded-xl border border-white/[0.12] bg-white/[0.05] p-1 backdrop-blur-xl"
      >
        {box && (
          <span
            aria-hidden="true"
            className="absolute inset-y-1 left-0 rounded-lg border border-brand-red-lit/50 bg-maroon-500/40 shadow-[0_0_18px_-6px_rgba(255,46,67,0.7)] transition-[transform,width] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            style={{ width: box.w, transform: `translateX(${box.x}px)` }}
          />
        )}
        {ranges.map((n, i) => (
          <Link
            key={n}
            ref={(el) => {
              links.current[i] = el;
            }}
            href={hrefs[i]}
            scroll={false}
            onClick={() => setPicked(n)}
            aria-current={n === current ? 'page' : undefined}
            className={`relative rounded-lg border border-transparent px-3.5 py-1.5 text-sm font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit ${
              n === picked ? 'text-white' : 'text-gray-600 hover:text-brand-red-lit'
            } ${
              box
                ? ''
                : 'aria-[current=page]:border-brand-red-lit/50 aria-[current=page]:bg-maroon-500/40'
            }`}
          >
            {n} months
          </Link>
        ))}
      </nav>
    </div>
  );
}
