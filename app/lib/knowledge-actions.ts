'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { withRoleAction } from '@/auth';
import { fetchAgentsOrganizationId } from '@/app/lib/agent-data';
import { retell } from '@/app/lib/retell-api';
import { RETELL_API_KEY } from '@/lib/env';
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
 * knowledge base. The organization comes from the session's membership, never
 * from the form.
 *
 * Every asset becomes a Retell knowledge base of its own. Retell attaches a
 * whole knowledge base to an agent, never one file inside it, so this is what
 * lets an asset be given to one agent and not another. A new asset applies to
 * all of the organization's agents until it is assigned to one.
 */
export const addKnowledge = withRoleAction('USER', async (me, form: FormData) => {
  if (!RETELL_API_KEY) return { error: 'RETELL_API_KEY is not set.' };

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
    // Retell wants the name under 40 characters.
    upload.append('knowledge_base_name', row.title.slice(0, 39));
    const res = await retell('POST', '/create-knowledge-base', upload);
    if (!res.ok) return { error: res.message };

    await db.orm.public.KnowledgeDocument.create({
      ...row,
      organizationId,
      retellKnowledgeBaseId: res.data.knowledge_base_id as string,
      status: 'INDEXING',
      createdByUserId: me.id,
    });

    const failed = await syncAgentKnowledge(organizationId);
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
 * Sets which voice agent an asset applies to: one of the organization's agents,
 * or null for all of them. The document id comes from the browser, so the
 * document and the agent are both checked against the caller's own
 * organization before anything changes.
 */
export const setKnowledgeAgent = withRoleAction(
  'USER',
  async (me, documentId: string, agentId: string | null) => {
    const organizationId = await fetchAgentsOrganizationId(me.id);
    if (!organizationId) {
      return { error: 'Only an organization admin can change this.' };
    }

    try {
      const doc = await db.orm.public.KnowledgeDocument.where({
        id: documentId,
        organizationId,
      })
        .select('id')
        .first();
      if (!doc) return { error: 'That resource no longer exists.' };

      if (agentId) {
        const agent = await db.orm.public.Agent.where({
          id: agentId,
          organizationId,
        })
          .select('id')
          .first();
        if (!agent) return { error: 'That agent no longer exists.' };
      }

      await db.orm.public.KnowledgeDocument.where({ id: doc.id }).update({
        agentId,
      });

      const failed = await syncAgentKnowledge(organizationId);
      revalidatePath('/dashboard/agents');
      return failed
        ? {
            error: `Saved, but ${failed} agent${failed === 1 ? '' : 's'} could not be updated in Retell.`,
          }
        : { ok: true as const };
    } catch (error) {
      console.error('Failed to assign knowledge:', error);
      return { error: 'Could not change that. Please try again.' };
    }
  },
);

/**
 * Deletes an asset: takes its knowledge base off the organization's agents,
 * deletes it on Retell, then removes the row. The document id comes from the
 * browser, so it is checked against the caller's own organization first.
 *
 * Nothing is deleted if an agent couldn't be detached, so a base never
 * disappears from under an agent that still points at it; the row stays and the
 * delete can be tried again.
 */
export const deleteKnowledge = withRoleAction(
  'USER',
  async (me, documentId: string) => {
    const organizationId = await fetchAgentsOrganizationId(me.id);
    if (!organizationId) {
      return { error: 'Only an organization admin can delete resources.' };
    }

    try {
      const doc = await db.orm.public.KnowledgeDocument.where({
        id: documentId,
        organizationId,
      })
        .select('id', 'retellKnowledgeBaseId')
        .first();
      if (!doc) return { error: 'That resource no longer exists.' };

      const failed = await syncAgentKnowledge(organizationId, doc.id);
      if (failed) {
        return {
          error: `Could not detach it from ${failed} agent${failed === 1 ? '' : 's'} in Retell, so nothing was deleted. Please try again.`,
        };
      }

      // A base shared with another asset (from before each asset had its own)
      // must stay: deleting it would empty the other one too.
      const kbId = doc.retellKnowledgeBaseId;
      const shared = kbId
        ? (
            await db.orm.public.KnowledgeDocument.where({ organizationId })
              .select('id', 'retellKnowledgeBaseId')
              .all()
          ).some((d) => d.id !== doc.id && d.retellKnowledgeBaseId === kbId)
        : false;

      if (kbId && !shared) {
        const res = await retell('DELETE', `/delete-knowledge-base/${kbId}`);
        // Already gone on Retell's side is the outcome we wanted.
        if (!res.ok && res.status !== 404) return { error: res.message };
      }

      await db.orm.public.KnowledgeDocument.where({ id: doc.id }).delete();
      revalidatePath('/dashboard/agents');
      return { ok: true as const };
    } catch (error) {
      console.error('Failed to delete knowledge:', error);
      return { error: 'Could not delete that. Please try again.' };
    }
  },
);

/**
 * Makes every Retell agent of the organization hold exactly the knowledge bases
 * its assets call for: those assigned to it, plus those assigned to no agent.
 * Knowledge bases on an agent that this app never created are left alone.
 * `without` is an asset about to be deleted: its knowledge base is taken off
 * every agent even though the row still exists.
 *
 * The knowledge bases live on each agent's Retell LLM, and the docs don't say
 * whether `knowledge_base_ids` is replaced or merged, so this reads the current
 * list and sends back the whole thing. Returns how many agents failed.
 */
async function syncAgentKnowledge(organizationId: string, without?: string) {
  const [docs, agents] = await Promise.all([
    db.orm.public.KnowledgeDocument.where({ organizationId })
      .select('id', 'agentId', 'retellKnowledgeBaseId')
      .all(),
    db.orm.public.Agent.where({ organizationId })
      .select('id', 'retellAgentId')
      .all(),
  ]);

  const ours = new Set(
    docs.flatMap((d) => (d.retellKnowledgeBaseId ? [d.retellKnowledgeBaseId] : [])),
  );
  let failed = 0;

  for (const agent of agents) {
    if (!agent.retellAgentId) continue;
    const wanted = new Set(
      docs.flatMap((d) =>
        d.retellKnowledgeBaseId &&
        d.id !== without &&
        (!d.agentId || d.agentId === agent.id)
          ? [d.retellKnowledgeBaseId]
          : [],
      ),
    );

    try {
      const found = await retell('GET', `/get-agent/${agent.retellAgentId}`);
      if (!found.ok) {
        failed += 1;
        continue;
      }
      // Only agents on a Retell LLM can be linked here. A conversation-flow
      // agent takes its knowledge bases through the flow's own nodes, so there
      // is nothing for this to set — skipped, not counted as a failure.
      if (found.data?.response_engine?.type !== 'retell-llm') continue;
      const llmId = found.data.response_engine.llm_id;
      if (!llmId) {
        failed += 1;
        continue;
      }
      const llm = await retell('GET', `/get-retell-llm/${llmId}`);
      if (!llm.ok) {
        failed += 1;
        continue;
      }
      const current: string[] = llm.data?.knowledge_base_ids ?? [];
      const next = [...current.filter((id) => !ours.has(id)), ...wanted];
      const same =
        next.length === current.length && next.every((id) => current.includes(id));
      if (same) continue;

      const res = await retell('PATCH', `/update-retell-llm/${llmId}`, {
        knowledge_base_ids: next,
      });
      if (!res.ok) failed += 1;
    } catch {
      failed += 1;
    }
  }
  return failed;
}
