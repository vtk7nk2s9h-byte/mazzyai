'use server';

import { cookies } from 'next/headers';

// A year, so the sidebar you set up stays the way you left it. Only exported
// async functions are allowed out of a 'use server' file — a plain const is
// fine as long as it stays private to the module.
const COOKIE = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
} as const;

// Matches the clamp in sidebar-resizer.tsx. Repeated rather than shared
// because a Server Action is a public endpoint: a client that skipped the
// clamp could otherwise store a width nobody can drag back from.
const MIN = 176;
const MAX = 384;

/**
 * Expands the dashboard sidebar to a dragged width. The state lives in cookies
 * so the server can render the right width on the first paint — no flash from
 * expanded to collapsed, or from the default width to yours — and so it
 * survives navigation and reloads. Setting a cookie in a Server Action makes
 * Next re-render the page and its layouts, so the layout picks the new values
 * up without any client state.
 */
export async function setSidebarWidthAction(width: number) {
  const store = await cookies();
  store.set('sidebar', 'expanded', COOKIE);
  store.set(
    'sidebar-w',
    String(Math.round(Math.min(Math.max(width, MIN), MAX))),
    COOKIE,
  );
}

/** Collapse without touching the stored width, so expanding restores it. */
export async function collapseSidebarAction() {
  const store = await cookies();
  store.set('sidebar', 'collapsed', COOKIE);
}

/** Expand without touching the stored width — for callers that never knew it. */
export async function expandSidebarAction() {
  const store = await cookies();
  store.set('sidebar', 'expanded', COOKIE);
}
