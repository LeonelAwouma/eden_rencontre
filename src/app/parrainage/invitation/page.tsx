"use client";

import Link from "next/link";
import { Gift, Heart } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";

/**
 * Page de présentation publique du parrainage — atteinte via /r/[code], qui
 * pose le cookie `eden_ref` (jeton d'intention) puis redirige ici. La
 * référence au parrain ne transite jamais par l'URL au-delà de cette étape,
 * uniquement par le cookie — elle survit ainsi à la redirection OAuth Google.
 */
export default function ReferralInvitationPage() {
  const { t } = useI18n();

  return (
    <div className="eden-public flex flex-col min-h-screen bg-[#FAF9F6]">
      <Navigation />
      <main className="flex-1">
        <section className="px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-24">
          <div className="max-w-[640px] mx-auto text-center">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#EEF5EE] mb-6">
              <Gift className="w-8 h-8 text-[#28543C]" aria-hidden="true" />
            </span>
            <h1 className="font-headline text-[28px] sm:text-[36px] font-bold text-[#1C241F] mb-4">
              {t("referral.invitationTitle")}
            </h1>
            <p className="text-[16px] text-[#4A564F] leading-relaxed mb-8">
              {t("referral.invitationBody")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#1F4D3A] text-white font-semibold hover:bg-[#28543C] transition-colors"
              >
                <Heart className="w-4 h-4" aria-hidden="true" /> {t("referral.invitationCta")}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-[#DCE6DA] text-[#28543C] font-semibold hover:bg-[#F0F4EF] transition-colors"
              >
                {t("referral.invitationLogin")}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
