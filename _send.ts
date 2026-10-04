import { sendFollowUpEmail } from './app/lib/follow-up-email.ts';
import { db } from './src/prisma/db.ts';
const call = await db.orm.public.Call.where({ id: '575c0789-4f29-45f1-b08f-b70429484938' })
  .select('retellCallId', 'organizationId', 'dynamicVariables').first();
await sendFollowUpEmail(call!.organizationId, {
  call_id: call!.retellCallId,
  retell_llm_dynamic_variables: call!.dynamicVariables as Record<string, unknown>,
});
const sent = await db.orm.public.AuditLog.where({ action: 'email.sent', targetId: call!.retellCallId }).select('diff','createdAt').all();
console.log(JSON.stringify(sent));
await db.close();
