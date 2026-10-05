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
  // where it expected the file. Audio and video are in the list for the same
  // reason: the landing page's call recording is /audio/sample-call.wav, and
  // the use-case demos fetch their /audio/demos/*.peaks.json (hence json).
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif|bmp|woff2?|ttf|otf|eot|css|js|map|txt|json|xml|webmanifest|wav|mp3|m4a|ogg|opus|aac|mp4|webm)$).*)',
  ],
};