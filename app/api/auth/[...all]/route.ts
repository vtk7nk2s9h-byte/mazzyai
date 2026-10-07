import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

// Every Better Auth endpoint (/api/auth/sign-in/email, /api/auth/get-session,
// /api/auth/admin/*, …) is served from this one catch-all.
export const { GET, POST } = toNextJsHandler(auth);
