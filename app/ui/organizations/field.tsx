/**
 * The building blocks of the organization page: a titled panel and the
 * label/value rows inside it. Kept dumb and presentational so the page reads
 * as a list of what it shows rather than as markup.
 */

export function Section({
  title,
  description,
  action,
  titleAction,
  children,
}: {
  /** A string, or a link when the title leads somewhere. */
  title: React.ReactNode;
  description?: string;
  /** Sits at the right of the header, e.g. an edit button. */
  action?: React.ReactNode;
  /** Sits right after the title, e.g. the pencil that edits the whole card. */
  titleAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg bg-gray-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-900">{title}</h2>
            {titleAction}
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      <dl className="mt-4 space-y-0">{children}</dl>
    </section>
  );
}

/**
 * One label/value pair. An empty value renders an em dash rather than a blank
 * gap, so a missing setting still reads as a row that exists.
 */
export function Field({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  const empty =
    children === null || children === undefined || children === '';

  return (
    <div className="flex items-start justify-between gap-6 border-b border-gray-200 py-2.5 last:border-none">
      <dt className="shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-gray-900">
        {empty ? <span className="text-gray-400">—</span> : children}
      </dd>
    </div>
  );
}

/** A setting that is either on or off, shown as a word rather than a checkbox. */
export function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${on ? 'text-gray-900' : 'text-gray-400'}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          on
            ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]'
            : 'bg-brand-red-lit shadow-[0_0_8px_rgba(255,46,67,0.8)]'
        }`}
      />

      {on ? 'Enabled' : 'Disabled'}
    </span>
  );
}
