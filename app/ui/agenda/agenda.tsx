import { fetchMeetings } from '@/app/lib/meeting-data';
import AgendaCalendar from '@/app/ui/agenda/calendar';

/**
 * One organization's agenda. Server side, so the query runs here and only
 * plain rows cross into the client calendar. Shared by the Agenda page (the
 * signed-in user's own org) and the organization profile (any org, for a
 * superuser).
 */
export default async function Agenda({
  organizationId,
}: {
  organizationId: string;
}) {
  const meetings = await fetchMeetings(organizationId);
  return <AgendaCalendar organizationId={organizationId} meetings={meetings} />;
}
