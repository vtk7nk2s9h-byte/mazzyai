'use client';

import { useRef, useTransition } from 'react';

import {
  collapseSidebarAction,
  setSidebarWidthAction,
} from '@/app/lib/sidebar-actions';

// Mirrored in sidebar-actions.ts, which re-clamps: a Server Action is a public
// endpoint and can't trust these.
const MIN = 176; // 11rem — narrower than this and the nav labels wrap
const MAX = 384; // 24rem
const RAIL = 64; // md:w-16, the collapsed rail
// A dead zone below MIN: you drag into it, feel the width stick, and only then
// does it snap shut — so a small overshoot doesn't collapse the sidebar.
const COLLAPSE_AT = 140;
const NUDGE = 16; // arrow-key step

type Drag = {
  shell: HTMLElement;
  startX: number;
  startW: number;
  width: number;
  collapsed: boolean;
  moved: boolean;
  fromButton: boolean;
};

/**
 * The sidebar's right edge: a drag strip for any width between MIN and MAX,
 * with a glass pill in the middle that snaps it open or shut.
 *
 * Both gestures end in a Server Action that writes the cookies the layout
 * reads, so the width survives a reload with no flash. Mid-drag, though, a
 * round trip per pointermove would be hopeless — so the drag writes `--sb-w`
 * and `data-sidebar` straight onto the shell element and lets the action catch
 * up on pointerup. React reconciles its own values back over the top on the
 * next render; they agree by then.
 */
export default function SidebarResizer({
  collapsed,
  width,
}: {
  collapsed: boolean;
  width: number;
}) {
  const [, startTransition] = useTransition();
  const drag = useRef<Drag | null>(null);
  // A drag that starts on the pill still fires a click on pointerup. Without
  // this the gesture would resize and then toggle.
  const swallowClick = useRef(false);

  const persist = (next: number, isCollapsed: boolean) =>
    startTransition(() => {
      if (isCollapsed) collapseSidebarAction();
      else setSidebarWidthAction(next);
    });

  function onPointerDown(e: React.PointerEvent<HTMLElement>, fromButton: boolean) {
    if (e.button !== 0) return;
    const shell = e.currentTarget.closest<HTMLElement>('[data-sidebar]');
    if (!shell) return;
    // Stops the browser selecting text across the page while you drag.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    shell.dataset.dragging = 'true';
    drag.current = {
      shell,
      startX: e.clientX,
      // Measured off the panel both handles sit in, not taken from the
      // `width` prop: the prop is the last *committed* width, and the two
      // part company whenever a render is still in flight. Measuring means
      // the edge always starts moving from where it actually is.
      startW:
        e.currentTarget.parentElement?.getBoundingClientRect().width ||
        (collapsed ? RAIL : width),
      width,
      collapsed,
      moved: false,
      fromButton,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    // A few pixels of slop, so a click with an unsteady hand stays a click.
    if (!d.moved && Math.abs(dx) <= 4) return;
    d.moved = true;

    const raw = d.startW + dx;
    d.collapsed = raw < COLLAPSE_AT;
    d.width = d.collapsed ? d.width : Math.min(Math.max(raw, MIN), MAX);
    // Writing it while collapsed is harmless: w-16 wins, and pointerup puts
    // the stored width back before anything can reopen at this one.
    d.shell.style.setProperty('--sb-w', `${d.width}px`);
    d.shell.dataset.sidebar = d.collapsed ? 'collapsed' : 'expanded';
  }

  function onPointerUp(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    delete d.shell.dataset.dragging;
    if (!d.moved) return;
    if (d.fromButton) swallowClick.current = true;
    if (d.collapsed) {
      // The widths the drag passed through on its way shut were only
      // feedback; the stored one is unchanged. Put it back by hand, because
      // React won't: its own `--sb-w` is the same on both sides of the
      // re-render, so it leaves the value we wrote over the top in place —
      // and the sidebar would then reopen at wherever the drag happened to
      // cross the threshold.
      d.shell.style.setProperty('--sb-w', `${width}px`);
    }
    persist(d.width, d.collapsed);
  }

  const edge = {
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  return (
    <>
      {/* Grab anywhere along the edge. An invisible 8px strip, easy to hit:
          the resize cursor is the only hint it's draggable, so nothing
          competes with the sidebar's own hairline border. */}
      <div
        aria-hidden="true"
        onPointerDown={(e) => onPointerDown(e, false)}
        {...edge}
        className="absolute inset-y-0 -right-1 z-10 hidden w-2 cursor-col-resize touch-none select-none md:block"
      />

      {/* Straddles the edge at its midpoint. Same glass as the sidebar's
          plates — a hairline, a low white fill and a blur — rather than the
          opaque ink pill it used to be, so the page's field shows through it.
          Grey at rest, red on hover: only the marks carry state, as with the
          nav links and the sign-out button. */}
      <button
        type="button"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={
          collapsed
            ? 'Expand sidebar — or drag the edge'
            : 'Collapse sidebar — or drag the edge'
        }
        onPointerDown={(e) => onPointerDown(e, true)}
        {...edge}
        onClick={() => {
          if (swallowClick.current) {
            swallowClick.current = false;
            return;
          }
          // Expanding restores the width you dragged to, not the default.
          persist(width, !collapsed);
        }}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          // From the rail there's nothing to nudge — one press reopens it.
          if (collapsed) {
            if (dir > 0) persist(width, false);
            return;
          }
          const next = width + dir * NUDGE;
          // Below the floor, a nudge means "close it".
          persist(next, next < MIN);
        }}
        className="absolute -right-3.5 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 cursor-col-resize touch-none items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-gray-400 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors hover:border-brand-red-lit/60 hover:bg-white/[0.12] hover:text-brand-red-lit md:flex"
      >
        {/* Two arrows back to back across a short divider — the resize
            mark, not a direction indicator: it stays put whether the sidebar
            is open, shut or mid-drag, because what it offers never changes.
            The divider is 8 of 24 units tall and the arrows span x=5 to
            x=19, which leaves a visible gap either side of the divider and
            keeps every stroke well clear of the button's inner edge. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-[1.125rem] w-[1.125rem]"
        >
          <path d="M8 8.5 5 12 8 15.5" />
          <path d="M12 8V16" />
          <path d="M16 8.5 19 12 16 15.5" />
        </svg>
      </button>
    </>
  );
}
