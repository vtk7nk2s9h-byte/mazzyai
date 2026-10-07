import {
  CalendarDaysIcon,
  CpuChipIcon,
  PhoneIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';
import { fetchOverviewStats } from '@/app/lib/org-data';

const iconMap = {
  calls: PhoneIcon,
  agents: CpuChipIcon,
  contacts: UsersIcon,
  meetings: CalendarDaysIcon,
};

/** The dashboard home's stat row: one organization, or all of them. */
export default async function CardWrapper({
  organizationId,
}: {
  organizationId?: string;
}) {
  const { callsThisMonth, agents, contacts, upcomingMeetings } =
    await fetchOverviewStats(organizationId);

  return (
    <>
      <Card title="Calls this month" value={callsThisMonth} type="calls" />
      <Card title="Agents" value={agents} type="agents" />
      <Card title="Contacts" value={contacts} type="contacts" />
      <Card title="Upcoming meetings" value={upcomingMeetings} type="meetings" />
    </>
  );
}

export function Card({
  title,
  value,
  type,
}: {
  title: string;
  value: number | string;
  type: keyof typeof iconMap;
}) {
  const Icon = iconMap[type];

  return (
    <div className="rounded-xl bg-gray-50 p-2 shadow-sm border border-brand-red-lit/10">
      <div className="flex p-4">
        {Icon ? <Icon className="h-5 w-5 text-gray-700" /> : null}
        <h3 className="ml-2 text-sm font-medium">{title}</h3>
      </div>
      <p
        className={`${lusitana.className}
          truncate rounded-xl bg-gray-100 px-4 py-8 text-center text-2xl`}
      >
        {value}
      </p>
    </div>
  );
}
