'use server';

import { cookies } from 'next/headers';

/**
 * Collapses or expands the dashboard sidebar. The state lives in a cookie so
 * the server can render the right width on the first paint — no flash from
 * expanded to collapsed — and so it survives navigation and reloads. Setting a
 * cookie in a Server Action makes Next re-render the page and its layouts, so
 * the layout picks the new value up without any client state.
 */
export async function toggleSidebarAction() {
  const store = await cookies();
  const collapsed = store.get('sidebar')?.value === 'collapsed';
  store.set('sidebar', collapsed ? 'expanded' : 'collapsed', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}
