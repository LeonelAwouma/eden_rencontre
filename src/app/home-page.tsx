"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenHero, PromoBanner, AnnouncementBar } from "@/components/garden";
import { FeaturesSection } from "@/components/garden/features-section";
import { QuoteSection } from "@/components/garden/quote-section";
import { PublicAnnouncement } from "@/components/whats-new/public-announcement";

export function HomePage() {
  return (
    <div className="eden-public flex flex-col min-h-screen bg-background text-foreground">
      <AnnouncementBar />
      <Navigation />
      {/* Sous la navigation (jamais dans le <nav>, dont le menu mobile est positionné en dur). */}
      <PublicAnnouncement />

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
