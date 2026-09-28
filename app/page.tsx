import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { lusitana } from '@/app/ui/fonts';
import styles from '@/app/ui/home.module.css';
import Image from 'next/image';
import ReflectiveDiv from "@/app/ui/dashboard/reflective-div";
import NavigationMenu from "@/app/ui/dashboard/navigation-menu";
import ScrollGlobe from "@/components/ui/scroll-globe";
import VoiceAgentWidget from "@/components/ui/voice-agent-widget";
import {
  FeaturesSection,
  ServicesSection,
  UseCasesSection,
} from "@/components/ui/site-sections";



export default function Page() {

  return (
    <>
    <main className="flex min-h-screen flex-col p-6">

        <div className={styles.shape} />
      <div className="flex h-20 shrink-0 items-end rounded-lg border border-white/[0.07] bg-gradient-to-br from-maroon-600/70 to-ink-900/70 p-4 backdrop-blur-xl md:h-52">
      </div>
      <NavigationMenu />
      <div className="mt-4 flex grow flex-col gap-4 md:flex-row">
        {/* Translucent rather than bg-gray-50: that token is opaque, so a
            backdrop-filter behind it would have nothing to blur. */}
        <div className="flex flex-col justify-center gap-6 rounded-lg border border-white/[0.07] bg-white/[0.035] px-6 py-10 backdrop-blur-xl md:w-2/5 md:px-20">
        <div
  className="relative w-0 h-0 border-l-[15px] border-r-[15px] border-b-[26px] border-l-transparent border-r-transparent border-b-black"
/>
          <p className={`${lusitana.className} text-xl text-gray-800 md:text-3xl md:leading-normal`}>
            
            <strong>Welcome to Acme.</strong> This is the example for the{' '}
            <a href="https://nextjs.org/learn/" className="text-maroon-500 underline-offset-2 hover:underline">
              Next.js Learn Course
            </a>
            , brought to you by Vercel.
          </p>
          <Link
            href="/login"
            className="flex items-center gap-5 self-start rounded-lg bg-maroon-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-maroon-400 md:text-base"
          >
            <span>Log in</span> <ArrowRightIcon className="w-5 md:w-6" />
          </Link>
         <ReflectiveDiv>DARK CSS</ReflectiveDiv>
        </div>
        <div className="flex items-center justify-center p-6 md:w-3/5 md:px-28 md:py-12">
          <Image
        src="/hero-desktop.png"
        width={1000}
        height={760}
        className="hidden md:block"
        alt="Screenshots of the dashboard project showing desktop version"
      />
      <Image
        src="/hero-mobile.png"
        width={560}
        height={620}
        className="block md:hidden"
        alt="Screenshots of the dashboard project showing mobile version"
      />
        </div>
      </div>
    </main>

    {/* Sticky, scroll-driven stage. Sits outside <main> so no ancestor with
        padding or overflow can break position: sticky. */}
    <ScrollGlobe />

    <FeaturesSection />
    <UseCasesSection />
    <ServicesSection />

    {/* Scratch height for testing: ten stacked cards so there is page left to
        scroll after the globe's own 600vh. */}
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-28 px-6 py-24">
      {Array.from({ length: 10 }).map((_, i) => (
        <ReflectiveDiv key={i} width="100%" height={160} radius={16}>
          CARD {String(i + 1).padStart(2, '0')}
        </ReflectiveDiv>
      ))}
    </section>

    <VoiceAgentWidget />
    </>
  );
}
