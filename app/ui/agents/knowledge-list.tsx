import { fetchKnowledge, syncKnowledgeStatus } from '@/app/lib/agent-data';
import { formatDateToLocal } from '@/app/lib/utils';
import { label } from '@/app/ui/organizations/status';

const kindLabel = { TEXT: 'Text', URL: 'URL', FILE: 'File' } as const;

function size(bytes: number | null) {
  if (bytes == null) return null;
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Everything the organization has uploaded, kept on the page: it reads from our
 * own table, not from Retell, so it is there on every visit. Rows still
 * indexing are settled against Retell first.
 */
export default async function KnowledgeList({
  organizationId,
}: {
  organizationId: string;
}) {
  let docs = await fetchKnowledge(organizationId);
  if (await syncKnowledgeStatus(docs).catch(() => false)) {
    docs = await fetchKnowledge(organizationId);
  }

  if (docs.length === 0) {
    return (
      <div className="mt-4 rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
        Nothing uploaded yet. Add text, a URL or a file above.
      </div>
    );
  }

  return (
    <div className="mt-4 flow-root overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2">
          <table className="min-w-full text-sm text-gray-900">
            <thead className="text-left font-normal">
              <tr>
                <th className="px-4 py-4 font-medium">Resource</th>
                <th className="px-3 py-4 font-medium">Type</th>
                <th className="px-3 py-4 font-medium">Status</th>
                <th className="px-3 py-4 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="bg-gray-100">
              {docs.map((d) => (
                <tr key={d.id} className="border-b last-of-type:border-none">
                  <td className="max-w-[40ch] px-4 py-3">
                    <p className="truncate font-medium">{d.title}</p>
                    {d.sourceUrl && (
                      <p className="truncate text-xs text-gray-500">
                        {d.sourceUrl}
                      </p>
                    )}
                    {size(d.sizeBytes) && (
                      <p className="text-xs text-gray-500">{size(d.sizeBytes)}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {kindLabel[d.sourceType as keyof typeof kindLabel]}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {label(d.status)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDateToLocal(d.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
