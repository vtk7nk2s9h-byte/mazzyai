'use client';

import { useRef, useTransition } from 'react';

import { addKnowledge } from '@/app/lib/knowledge-actions';
import { toastError, toastSuccess } from '@/hooks/use-toast';

const input =
  'block w-full rounded-md border border-brand-red-lit/10 bg-transparent px-3 py-[9px] text-sm outline-2 placeholder:text-gray-500';
const button =
  'rounded-md border border-brand-red-lit/35 bg-maroon-500/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60';

/** One slot: a heading, its fields, and its own Add button. */
function Slot({
  kind,
  title,
  hint,
  children,
}: {
  kind: 'text' | 'url' | 'file';
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set('kind', kind);
    startTransition(async () => {
      const result = await addKnowledge(data);
      if ('error' in result && result.error) {
        toastError('Not added', result.error);
        return;
      }
      form.current?.reset();
      toastSuccess(
        'Added to the knowledge base',
        ('warning' in result && result.warning) ||
          'It will show as indexing for a moment.',
      );
    });
  }

  return (
    <form
      ref={form}
      onSubmit={submit}
      // A pane of glass: fill, hairline, top highlight, shadow, blur.
      className="flex flex-col gap-3 rounded-lg border border-white/[0.12] bg-gradient-to-br from-white/[0.10] to-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
    >
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
      </div>
      <div className="flex grow flex-col gap-2">{children}</div>
      <button type="submit" disabled={pending} className={`${button} self-end`}>
        {pending ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}

/** The three ways in: pasted text, a web page, and a file. */
export default function KnowledgeForm() {
  return (
    // items-start: each card keeps its own height, so resizing the text box
    // doesn't stretch the other two to match.
    <div className="mt-4 grid items-start gap-3 md:grid-cols-3">
      <Slot
        kind="text"
        title="Text"
        hint="Opening hours, prices, policies — anything the agent should know."
      >
        <input
          name="title"
          required
          maxLength={100}
          autoComplete="off"
          placeholder="Title, e.g. Opening hours"
          aria-label="Title"
          className={input}
        />
        <textarea
          name="text"
          required
          rows={5}
          maxLength={100000}
          placeholder="Paste or write the text here"
          aria-label="Text"
          className={input}
        />
      </Slot>

      <Slot
        kind="url"
        title="Website or URL"
        hint="Your website or any page. Retell reads the page's content."
      >
        <input
          name="url"
          // Not type="url": that refuses anything without a scheme, so
          // "example.com" could never be submitted. The server adds https://.
          type="text"
          inputMode="url"
          required
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="www.example.com"
          aria-label="URL"
          className={input}
        />
      </Slot>

      <Slot
        kind="file"
        title="File"
        hint="PDF, Word, text or CSV. Up to 8MB."
      >
        <input
          name="file"
          type="file"
          required
          accept=".pdf,.doc,.docx,.txt,.md,.csv"
          aria-label="File"
          className={`${input} file:mr-3 file:rounded file:border-0 file:bg-white/[0.08] file:px-2 file:py-1 file:text-xs file:text-gray-900`}
        />
      </Slot>
    </div>
  );
}
