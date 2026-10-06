"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import { PricingHero, PricingPlans } from "@/components/pricing/pricing-plans";
import type { PlanId } from "@/lib/pricing";

/**
 * Page publique des tarifs : même bloc tarifaire que l'onglet Premium de
 * l'espace membre (src/components/pricing/pricing-plans.tsx).
 */
export default function PricingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  // Le paiement se fait depuis l'espace membre : un membre connecté y est
  // conduit (onglet Premium), un visiteur commence par créer son compte.
  const choose = async (plan: PlanId) => {
    setLoadingPlan(plan);
    try {
      const user = await getSession();
      router.push(user ? "/dashboard?tab=Premium" : "/register");
    } catch {
      router.push("/register");
    }
  };

  return (
    <div className="eden-public flex flex-col min-h-screen bg-[#FAF9F6]">
      <Navigation />

      <main className="flex-1">
        <section className="px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-20">
          <div className="max-w-[1180px] mx-auto">
            <PricingHero
              as="h1"
              eyebrow={t("tarifs.badge")}
              title={t("tarifs.heroTitle")}
              highlight={t("tarifs.heroTitleHighlight")}
              subtitle={t("tarifs.heroSubtitle")}
            />
            <PricingPlans className="mt-10" onSelect={choose} loadingPlan={loadingPlan} />
          </div>
        </section>

        {/* Mot de fin, sobre */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-20">
          <div className="max-w-3xl mx-auto rounded-[20px] bg-white border border-[#E6EAE5] shadow-[0_4px_20px_rgba(20,40,30,0.05)] px-6 py-12 sm:px-12 sm:py-14 text-center">
            <span className="mx-auto mb-5 w-12 h-12 rounded-2xl bg-[#F3F8F2] ring-1 ring-[#DCE6DA] flex items-center justify-center">
              <Heart className="w-5 h-5 text-[#C6A15B]" aria-hidden="true" />
            </span>
            <h2 className="font-headline text-[28px] sm:text-[32px] font-bold leading-tight text-[#1C241F]">{t("tarifs.bottomTitle")}</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#5C665F] max-w-xl mx-auto">{t("tarifs.bottomText")}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
