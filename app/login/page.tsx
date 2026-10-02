import Image from 'next/image';
import Link from 'next/link';
import LoginForm from '@/app/ui/login-form';
import ArrowIcon from '@/components/ui/arrow-icon';
import { Suspense } from 'react';
import { Metadata } from 'next';
 
export const metadata: Metadata = {
  title: 'Login',
};
 
export default function LoginPage() {
  return (
    // Padding rather than a fixed height: h-screen centres the card by
    // overflowing it in both directions, so opening the OTP panel pushed the
    // top of the card above the scroll origin where nothing could reach it.
    // Letting the page grow downward keeps it scrollable from the top.
    // The generous bottom padding is deliberate: it leaves a gap under the OTP
    // panel so the page can scroll past it, and the button stays reachable
    // while the panel is still closed as well as once it opens.
    <main className="relative flex items-center justify-center px-4 pb-40 pt-20 md:pb-48 md:pt-3">
      {/* Pinned to the page's top-left corner, outside the card column. */}
      <Link
        href="/"
        aria-label="Back to home page"
        className="group back-link absolute left-4 top-4 z-10 md:left-8 md:top-6"
      >
        <ArrowIcon direction="left" size={44} className="back-link-arrow" />
        <span className="back-link-label">
          <span className="back-link-initial">H</span>ome
        </span>
        <span aria-hidden="true" className="back-link-rule" />
      </Link>
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5">
        {/* The sidebar's glass plate, but light: the wordmark's letters are
            #0E0C0D, so on a white/5 fill over the page's near-black ground
            they had nothing to sit against. The fill is what changed — the
            mark still renders in its own colours, no filter over it.
            Still translucent, so the field behind the page carries through,
            and the hairline moves to maroon because a white one would vanish
            on a light surface. */}
        <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-maroon-300/50 bg-gradient-to-br from-maroon-100/95 to-maroon-200/95 px-3 backdrop-blur-3xl">
          <Image
            src="/mazzyai-phone-logo.svg"
            alt="MazzyAI"
            width={794}
            height={600}
            priority
            unoptimized
            className="h-16 w-auto object-contain"
          />
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}