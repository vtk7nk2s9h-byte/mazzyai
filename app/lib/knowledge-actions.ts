'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { withRoleAction } from '@/auth';
import { fetchAgentsOrganizationId } from '@/app/lib/agent-data';
import { retell } from '@/app/lib/retell-api';
import { db } from '@/src/prisma/db';

// Bigger files fit in Retell (50MB) but not in a server action body, which
// next.config.ts caps at 10MB.
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const TextSchema = z.object({
  title: z.string().trim().min(1, 'Please give the text a title.').max(100),
  text: z.string().trim().min(1, 'Please enter some text.').max(100_000),
});

// People paste "example.com" or "www.example.com/page", so a missing scheme is
// filled in rather than refused. Anything that still isn't a web URL is.
const UrlSchema = z.object({
  url: z
    .string()
    .trim()
    .transform((u) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(u) ? u : `https://${u}`))
    .pipe(
      z
        .string()
        .url('Please enter a valid URL.')
        .refine(
          (u) => /^https?:\/\/[^/]*\./i.test(u),
          'Please enter a web address',
        ),
    ),
});

/**
 * Adds one resource (text, URL or file) to the signed-in organization admin's
 * knowledge base. An organization has one Retell knowledge base, created with
 * the first resource and grown from then on; every voice agent of the
 * organization is pointed at it. The organization comes from the session's
 * membership, never from the form.
 */
export const addKnowledge = withRoleAction('USER', async (me, form: FormData) => {
  if (!process.env.RETELL_API_KEY) return { error: 'RETELL_API_KEY is not set.' };

  const organizationId = await fetchAgentsOrganizationId(me.id);
  if (!organizationId) {
    return { error: 'Only an organization admin can add to the knowledge base.' };
  }

  // What goes to Retell, and what we keep to show afterwards.
  const upload = new FormData();
  let row:
    | { title: string; sourceType: 'TEXT'; textContent: string; sizeBytes: number }
    | { title: string; sourceType: 'URL'; sourceUrl: string }
    | { title: string; sourceType: 'FILE'; filePath: string; sizeBytes: number };

  const kind = form.get('kind');
  if (kind === 'text') {
    const parsed = TextSchema.safeParse({
      title: form.get('title'),
      text: form.get('text'),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Check the fields.' };
    }
    const { title, text } = parsed.data;
    upload.append('knowledge_base_texts', JSON.stringify([{ title, text }]));
    row = {
      title,
      sourceType: 'TEXT',
      textContent: text,
      sizeBytes: new TextEncoder().encode(text).length,
    };
  } else if (kind === 'url') {
    const parsed = UrlSchema.safeParse({ url: form.get('url') });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Check the URL.' };
    }
    const { url } = parsed.data;
    upload.append('knowledge_base_urls', JSON.stringify([url]));
    row = { title: new URL(url).hostname, sourceType: 'URL', sourceUrl: url };
  } else if (kind === 'file') {
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { error: 'Please choose a file.' };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { error: 'That file is too large. The limit is 8MB.' };
    }
    upload.append('knowledge_base_files', file, file.name);
    row = {
      title: file.name,
      sourceType: 'FILE',
      filePath: file.name,
      sizeBytes: file.size,
    };
  } else {
    return { error: 'Unknown resource type.' };
  }

  try {
    const org = await db.orm.public.Organization.where({ id: organizationId })
      .select('name')
      .first();
    const existing = await db.orm.public.KnowledgeDocument.where({
      organizationId,
    })
      .select('retellKnowledgeBaseId')
      .all();
    let kbId =
      existing.find((d) => d.retellKnowledgeBaseId)?.retellKnowledgeBaseId ??
      null;

    if (kbId) {
      const res = await retell('POST', `/add-knowledge-base-sources/${kbId}`, upload);
      if (!res.ok) return { error: res.message };
    } else {
      // Retell wants the name under 40 characters.
      upload.append('knowledge_base_name', (org?.name ?? 'Knowledge base').slice(0, 39));
      const res = await retell('POST', '/create-knowledge-base', upload);
      if (!res.ok) return { error: res.message };
      kbId = res.data.knowledge_base_id as string;
    }

    await db.orm.public.KnowledgeDocument.create({
      ...row,
      organizationId,
      retellKnowledgeBaseId: kbId,
      status: 'INDEXING',
      createdByUserId: me.id,
    });

    const failed = await attachToAgents(organizationId, kbId);
    revalidatePath('/dashboard/agents');
    return {
      ok: true as const,
      warning: failed
        ? `Saved, but ${failed} agent${failed === 1 ? '' : 's'} could not be linked to it.`
        : undefined,
    };
  } catch (error) {
    console.error('Failed to add knowledge:', error);
    return { error: 'Could not add that. Please try again.' };
  }
});

/**
 * Points every Retell agent of the organization at the knowledge base. The
 * knowledge base lives on the agent's Retell LLM, and the docs don't say
 * whether `knowledge_base_ids` is replaced or merged, so this reads the current
 * list and sends back the whole union. Returns how many agents failed.
 */
async function attachToAgents(organizationId: string, kbId: string) {
  const agents = await db.orm.public.Agent.where({ organizationId })
    .select('retellAgentId')
    .all();
  let failed = 0;

  for (const { retellAgentId } of agents) {
    if (!retellAgentId) continue;
    try {
      const agent = await retell('GET', `/get-agent/${retellAgentId}`);
      const llmId = agent.ok ? agent.data?.response_engine?.llm_id : null;
      if (!llmId) {
        failed += 1;
        continue;
      }
      const llm = await retell('GET', `/get-retell-llm/${llmId}`);
      if (!llm.ok) {
        failed += 1;
        continue;
      }
      const ids: string[] = llm.data?.knowledge_base_ids ?? [];
      if (ids.includes(kbId)) continue;
      const res = await retell('PATCH', `/update-retell-llm/${llmId}`, {
        knowledge_base_ids: [...ids, kbId],
      });
      if (!res.ok) failed += 1;
    } catch {
      failed += 1;
    }
  }
  return failed;
}
