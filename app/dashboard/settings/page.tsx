import { Metadata } from 'next';

import { currentUser } from '@/auth';
import { lusitana } from '@/app/ui/fonts';
import { Field, Section } from '@/app/ui/organizations/field';
import { UserRoleBadge } from '@/app/ui/organizations/status';

export const metadata: Metadata = {
  title: 'Settings',
};

/**
 * The signed-in user's own account. Read-only for now — it shows what the
 * session already carries, so it costs no query. Editing (name, password) is
 * the next step; this is the page the sidebar's Settings link lands on.
 */
export default async function Page() {
  const me = await currentUser();

  return (
    <div className="w-full">
      <h1 className={`${lusitana.className} mb-4 text-2xl`}>Settings</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Account" description="Who you are signed in as.">
          <Field label="Name">{me?.name}</Field>
          <Field label="Email">{me?.email}</Field>
          <Field label="Role">{me && <UserRoleBadge role={me.role} />}</Field>
        </Section>
      </div>
    </div>
  );
}
