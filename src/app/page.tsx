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

export default function Page() {
  return (
    <main>
      <Header />
      <Hero />
      <Problem />
      <HowItWorks />
      <CommitShowcase />
      <UseCases />
      <Stack />
      <Pricing />
      <Faq />
      <Waitlist />
      <Footer />
    </main>
  );
}
