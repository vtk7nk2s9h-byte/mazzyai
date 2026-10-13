'use client';

import { startTransition, useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { XMarkIcon } from '@heroicons/react/24/outline';

import {
  collapseSidebarAction,
  expandSidebarAction,
} from '@/app/lib/sidebar-actions';

/**
 * A glass card that slides in from the right edge, about as wide as the
 * sidebar and made of the same glass. Mount it to open it, unmount it to close
 * it: the server decides (usually from a search param), so the open card has a
 * URL, survives a reload and closes with the Back button. Any table can feed
 * it — the caller renders the contents as children, server-side if it likes.
 *
 * It is a native <dialog> opened with show(), not showModal(): the page behind
 * it stays live — no scrim, no blur, nothing inert — so clicking another row
 * swaps the card's contents, and the table's own controls keep working. To
 * keep them in view the page content makes room for the card while it is open
 * (the layout reads `data-panel` off the shell, set here).
 *
 * Opening it collapses the sidebar, and closing expands it again if it was
 * open before. Both go through the sidebar's own Server Actions, the same
 * path as its pill and drag handle, so the pill never goes stale while the
 * card is up; the shell attribute is also set straight away so the sidebar
 * doesn't wait for the round trip.
 *
 * Closing is a short slide-out first, and only then a `router.replace` to
 * `closeHref`, which is what makes the server drop the panel. A link marked
 * `data-panel-close` closes it the same way: the table points the open row's
 * link at `closeHref`, so clicking that record again slides the card shut
 * instead of just cutting it.
 */
export default function SidePanel({
  title,
  description,
  media,
  closeHref,
  children,
}: {
  title: string;
  description?: string;
  /** Sits beside the title — an avatar, an icon. */
  media?: React.ReactNode;
  /** Where to go once it has slid shut: the current URL without the panel's param. */
  closeHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const shell = useRef<HTMLElement | null>(null);
  // Whether we are the ones who collapsed the sidebar, and so owe it a reopen.
  const collapsedIt = useRef(false);
  const closing = useRef(false);
  const done = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function reopenSidebar() {
    const s = shell.current;
    if (!collapsedIt.current || !s) return;
    collapsedIt.current = false;
    // Only if it is still the way we left it: someone who opened it by hand
    // while the card was up has already done this.
    if (s.dataset.sidebar === 'collapsed') {
      s.dataset.sidebar = 'expanded';
      startTransition(() => {
        expandSidebarAction();
      });
    }
  }

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const s = d.closest<HTMLElement>('[data-sidebar]');
    shell.current = s;
    if (s) {
      s.dataset.panel = 'open';
      if (s.dataset.sidebar !== 'collapsed') {
        collapsedIt.current = true;
        s.dataset.sidebar = 'collapsed';
        startTransition(() => {
          collapseSidebarAction();
        });
      }
    }
    const before = document.activeElement;
    if (!d.open) d.show();
    // show() moves focus to the first focusable thing in the card — the close
    // button, which then wears its focus ring on a fresh load. The page behind
    // is live, so focus stays where it was: on the row you used, or nowhere.
    if (before instanceof HTMLElement && before !== document.body) {
      before.focus({ preventScroll: true });
    } else if (document.activeElement instanceof HTMLElement && d.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    // A non-modal dialog gets no Escape handling of its own.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) close();
    };
    document.addEventListener('keydown', onKey);

    // Capture phase, so this runs before the link's own handler and can stop
    // the navigation (Next's <Link> ignores a click that is already
    // defaultPrevented). Modified clicks are left alone: open-in-new-tab
    // should still open the closed URL.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!(e.target instanceof Element)) return;
      if (e.target.closest('a[data-panel-close]')) {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick, true);
      clearTimeout(timer.current);
      if (s) delete s.dataset.panel;
      reopenSidebar();
      d.close();
    };
    // close() only reads refs and closeHref; the effect is mount/unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    if (done.current) return;
    done.current = true;
    router.replace(closeHref, { scroll: false });
  }

  function close() {
    const d = dialog.current;
    if (!d || closing.current) return;
    closing.current = true;
    // The page takes its room back and the sidebar reopens while the card
    // slides away, not after.
    if (shell.current) delete shell.current.dataset.panel;
    reopenSidebar();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    d.dataset.closing = 'true';
    // animationend does the work; this is only for the case it never fires.
    timer.current = setTimeout(finish, 400);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onAnimationEnd={(e) => {
        if (closing.current && e.target === e.currentTarget) finish();
      }}
      // The tables' glass — a diagonal white gradient over a hairline — held
      // between the sidebar's flat 3% and the tables' 10% so it stays dark
      // against the page, and tilted the other way (light in the corner by
      // the page, thinning toward the screen edge).
      //
      // bg-transparent is not optional: a <dialog>'s default background-color
      // is Canvas, which is opaque, and a gradient only sets the image on top
      // of it. The backdrop blur is deliberately small: the page's field
      // (maroon-data-wires) lights up the dots under the pointer, and the
      // sidebar's blur-2xl smeared them out. 2px only softens them behind the
      // text.
      className="side-panel fixed inset-y-0 left-auto right-0 z-30 m-0 h-dvh max-h-none w-[min(100vw,max(var(--sb-w,12rem),20rem))] max-w-none overflow-hidden border-0 border-l border-white/[0.12] bg-transparent bg-gradient-to-bl from-white/[0.07] via-white/[0.04] to-white/[0.02] p-0 text-gray-900 backdrop-blur-[6px]"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 px-5 py-4">
          {media}
          <div className="min-w-0 grow">
            <h2 id={titleId} className="truncate text-base font-semibold">
              {title}
            </h2>
            {description && (
              <p className="truncate text-sm text-gray-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="self-start rounded-md p-1 text-gray-500 transition-colors hover:text-brand-red-lit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>
        {/* The bottom padding keeps the last row clear of the voice widget. */}
        <div className="grow overflow-y-auto overscroll-contain px-5 pb-24 pt-5">
          {children}
        </div>
      </div>
    </dialog>
  );
}
