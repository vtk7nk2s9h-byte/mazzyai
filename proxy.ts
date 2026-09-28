import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
 
export default NextAuth(authConfig).auth;
 
export const config = {
  // https://nextjs.org/docs/app/api-reference/file-conventions/proxy#matcher
  //
  // Every static file extension has to be excluded, not just .png. Anything
  // that reaches this middleware runs `authorized`, which redirects a
  // signed-in user off any non-/dashboard path — so a logged-in request for
  // /logo.svg answered 302 to /dashboard, and the browser drew a broken image
  // where it expected the file.
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif|bmp|woff2?|ttf|otf|eot|css|js|map|txt|xml|webmanifest)$).*)',
  ],
};