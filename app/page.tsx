import ReflectiveDiv from "@/app/ui/dashboard/reflective-div";
import NavigationMenu from "@/app/ui/dashboard/navigation-menu";
import IntroHero from "@/components/ui/intro-hero";
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
    <main>
    {/* The first screen. It paints above the globe's fixed layer (z-10 in
        the component), so the globe rises behind the intro, not over it. */}
    <IntroHero />

    {/* The scroll-driven globe and its chapters. It measures its progress
        from its own position, so the intro above only delays the chapters. */}
    <ScrollGlobe />

    {/* Once the chapters are over the globe stays on screen, docked along the
        bottom edge (a fixed layer inside ScrollGlobe's stage). `relative`
        makes everything after it paint above that layer, so the sections read
        over the globe instead of being covered by it. */}
    <div className="relative">
    <UseCasesSection />
    <FeaturesSection />
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
    </div>
    </main>

    <div className="relative p-6">
      <NavigationMenu notchColor="#090203" />
    </div>

    <VoiceAgentWidget />
    </>
  );
}
