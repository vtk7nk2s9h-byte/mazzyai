import { db } from '@/src/prisma/db';

/** How many the sidebar's notifications panel lists. */
const PANEL_LIMIT = 8;

/**
 * A user's most recent notifications, newest first, for the sidebar panel.
 *
 * Unlike the other data helpers this does not throw: the sidebar renders on
 * every dashboard page, so a failed query here would take the whole dashboard
 * down over a bell. It logs and returns an empty list instead.
 */
export async function fetchRecentNotifications(userId: string) {
  try {
    return await db.orm.public.Notification.where({ userId })
      .select('id', 'type', 'title', 'body', 'isRead', 'createdAt')
      .orderBy((n) => n.createdAt.desc())
      .limit(PANEL_LIMIT)
      .all();
  } catch (error) {
    console.error('Database Error:', error);
    return [];
  }
}
