import Image from 'next/image';
import LoginForm from '@/app/ui/login-form';
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
    <main className="flex items-center justify-center px-4 py-10 md:py-3">
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