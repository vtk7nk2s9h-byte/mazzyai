import { handlers } from '@/auth';

// The email/OTP provider's magic link (and the plain <form method="get">
// code-entry fallback in login-form.tsx) both resolve to
// /api/auth/callback/email-otp, which only exists once this route is here —
// the Credentials-only flow this app started with never needed it.
export const { GET, POST } = handlers;
