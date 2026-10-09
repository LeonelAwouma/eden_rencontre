"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenHero, PromoBanner, AnnouncementBar } from "@/components/garden";
import { FeaturesSection } from "@/components/garden/features-section";
import { QuoteSection } from "@/components/garden/quote-section";

export function HomePage() {
  return (
    <div className="eden-public flex flex-col min-h-screen bg-background text-foreground">
      <AnnouncementBar />
      <Navigation />

      <main>
        <GardenHero />
        <PromoBanner />
        <FeaturesSection />
        <QuoteSection />
      </main>

      <Footer />
    </div>
  );
}
