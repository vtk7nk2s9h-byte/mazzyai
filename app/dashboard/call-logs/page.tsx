import { Suspense } from 'react';
import { Metadata } from 'next';

import { lusitana } from '@/app/ui/fonts';
import CallLogsTable from '@/app/ui/call-logs/table';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';

export const metadata: Metadata = {
  title: 'Call logs',
};

export default function Page() {
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Call logs</h1>
      </div>
      <Suspense fallback={<InvoicesTableSkeleton />}>
        <CallLogsTable />
      </Suspense>
    </div>
  );
}
