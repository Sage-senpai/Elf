import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CommitShowcase } from "@/components/landing/CommitShowcase";
import { UseCases } from "@/components/landing/UseCases";
import { Stack } from "@/components/landing/Stack";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { Waitlist } from "@/components/landing/Waitlist";
import { Footer } from "@/components/landing/Footer";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";

export default function Page() {
  return (
    <>
      <ScrollProgress />
      <main>
        {/* Sticky shell for the page */}
        <Header />

        {/* Hero stays out of the reveal wrapper — already on screen */}
        <Hero />

        {/* Each below-the-fold section fades + slides in on first viewport entry */}
        <RevealOnScroll>
          <Problem />
        </RevealOnScroll>
        <RevealOnScroll>
          <HowItWorks />
        </RevealOnScroll>
        <RevealOnScroll>
          <CommitShowcase />
        </RevealOnScroll>
        <RevealOnScroll>
          <UseCases />
        </RevealOnScroll>
        <RevealOnScroll>
          <Stack />
        </RevealOnScroll>
        <RevealOnScroll>
          <Pricing />
        </RevealOnScroll>
        <RevealOnScroll>
          <Faq />
        </RevealOnScroll>
        <RevealOnScroll>
          <Waitlist />
        </RevealOnScroll>
        <RevealOnScroll>
          <Footer />
        </RevealOnScroll>
      </main>
    </>
  );
}
