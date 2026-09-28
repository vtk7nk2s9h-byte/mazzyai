import Image from 'next/image';
import SignupForm from '@/app/ui/signup-form';
import { Suspense } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign up',
};

export default function SignupPage() {
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex h-20 w-full items-end rounded-lg bg-gradient-to-br from-maroon-600 to-ink-900 p-3 md:h-36">
          <Image
            src="/mazzyai-phone-logo.svg"
            alt="MazzyAI"
            width={794}
            height={584}
            priority
            unoptimized
            className="h-12 w-auto md:h-16"
          />
        </div>
        <Suspense>
          <SignupForm />
        </Suspense>
      </div>
    </main>
  );
}
