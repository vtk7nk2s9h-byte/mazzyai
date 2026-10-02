'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Re-renders the server components on this page every few seconds, so the feed
 * stays current without a push connection. Skips ticks while the tab is hidden
 * and refreshes once when it comes back.
 */
export default function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) router.refresh();
    };
    const id = setInterval(tick, seconds * 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [router, seconds]);

  return null;
}
