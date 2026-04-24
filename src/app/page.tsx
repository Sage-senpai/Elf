import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Stack } from "@/components/landing/Stack";
import { Waitlist } from "@/components/landing/Waitlist";
import { Footer } from "@/components/landing/Footer";

export default function Page() {
  return (
    <main>
      <Header />
      <Hero />
      <HowItWorks />
      <Stack />
      <Waitlist />
      <Footer />
    </main>
  );
}
