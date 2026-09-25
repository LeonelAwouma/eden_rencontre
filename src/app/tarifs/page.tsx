"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { OliveBirdDivider } from "@/components/garden";
import { useI18n } from "@/lib/i18n";
import { BillingToggle } from "@/components/pricing/billing-toggle";
import { planPricing, formatFcfa, type BillingPeriod, type PlanId } from "@/lib/pricing";
import {
  Check,
  Heart,
  ShieldCheck,
  Sparkles,
  Users,
  MapPin,
  Star,
  Zap,
  MessageCircle,
  Lock,
} from "lucide-react";

export default function PricingPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  const plans = [
    {
      id: "bronze" as PlanId,
      name: t("tarifs.bronze.name"),
      icon: "🥉",
      description: t("tarifs.bronze.description"),
      badge: t("tarifs.bronze.badge"),
      badgeColor: { bg: "#F5E6D3", text: "#8B6914" },
      features: [
        { text: t("tarifs.bronze.feature1"), icon: Heart },
        { text: t("tarifs.bronze.feature2"), icon: MessageCircle },
        { text: t("tarifs.bronze.feature3"), icon: Sparkles },
      ],
      tagline: t("tarifs.bronze.tagline"),
      cta: t("tarifs.bronze.cta"),
      popular: false,
      gold: false,
    },
    {
      id: "argent" as PlanId,
      name: t("tarifs.argent.name"),
      icon: "🥈",
      description: t("tarifs.argent.description"),
      badge: t("tarifs.argent.badge"),
      badgeColor: { bg: "#EEF5EC", text: "#486B46" },
      features: [
        { text: t("tarifs.argent.feature1"), icon: Sparkles },
        { text: t("tarifs.argent.feature2"), icon: MessageCircle },
        { text: t("tarifs.argent.feature3"), icon: Zap },
      ],
      tagline: t("tarifs.argent.tagline"),
      cta: t("tarifs.argent.cta"),
      popular: true,
      gold: false,
    },
    {
      id: "or" as PlanId,
      name: t("tarifs.or.name"),
      icon: "🥇",
      description: t("tarifs.or.description"),
      badge: t("tarifs.or.badge"),
      badgeColor: { bg: "#FDF6E3", text: "#9B7C15" },
      features: [
        { text: t("tarifs.or.feature1"), icon: Zap },
        { text: t("tarifs.or.feature2"), icon: MapPin },
        { text: t("tarifs.or.feature3"), icon: MessageCircle },
        { text: t("tarifs.or.feature4"), icon: Users },
      ],
      tagline: t("tarifs.or.tagline"),
      cta: t("tarifs.or.cta"),
      popular: false,
      gold: true,
    },
  ];

  return (
    <div className="eden-public flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        {/* ══ HERO SECTION ══ */}
        <section className="relative eden-sky pt-14 pb-10 sm:pt-20 sm:pb-14 overflow-hidden">
          {/* Halo vegetal, tres lave */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[620px] h-[380px] rounded-full pointer-events-none opacity-25"
            style={{ background: "radial-gradient(circle, hsl(145 30% 55%) 0%, transparent 70%)", filter: "blur(90px)" }} aria-hidden="true" />
          <div className="absolute top-24 right-12 w-[220px] h-[220px] rounded-full pointer-events-none opacity-15"
            style={{ background: "radial-gradient(circle, hsl(95 28% 38%) 0%, transparent 70%)", filter: "blur(70px)" }} aria-hidden="true" />

          <div className="relative z-10 container mx-auto px-4 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6"
              style={{ background: "rgba(198,161,91,0.1)", border: "1px solid rgba(198,161,91,0.25)" }}>
              <Sparkles className="w-4 h-4" style={{ color: "#C6A15B" }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#9B7C15" }}>
                {t("tarifs.badge")}
              </span>
            </div>
            <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-foreground tracking-tight">
              {t("tarifs.heroTitle")}{" "}
              <span className="italic text-primary">{t("tarifs.heroTitleHighlight")}</span>
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto text-muted-foreground font-body">
              {t("tarifs.heroSubtitle")}
            </p>
            <div className="mt-8 flex items-center justify-center">
              <OliveBirdDivider className="w-44 sm:w-56" />
            </div>
          </div>
        </section>

        {/* ══ PRICING CARDS ══ */}
        <section className="pb-12 sm:pb-16 -mt-4">
          <div className="container mx-auto px-4">
            {/* Mensuel / Annuel (−10 %) */}
            <div className="flex flex-col items-center gap-2.5 mb-12">
              <BillingToggle value={period} onChange={setPeriod} />
              <p className="text-sm text-muted-foreground font-body" aria-live="polite">
                {t(period === "annual" ? "billing.annualNote" : "billing.monthlyNote")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-start">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className="relative group"
                  style={plan.popular ? { marginTop: "-12px", marginBottom: "-12px" } : {}}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                      <div className="flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg"
                        style={{ background: "linear-gradient(135deg, #486B46, #5A8C58)", color: "#FFFFFF" }}>
                        <Star className="w-3 h-3" style={{ fill: "#FFFFFF" }} />
                        {plan.badge}
                      </div>
                    </div>
                  )}

                  {/* Card */}
                  <div
                    className="relative overflow-hidden rounded-[24px] transition-all duration-500 flex flex-col h-full"
                    style={{
                      background: plan.gold
                        ? "linear-gradient(160deg, #FFFEF8 0%, #FDF6E3 30%, #FAF9F6 100%)"
                        : "#FFFFFF",
                      border: plan.popular
                        ? "2px solid #486B46"
                        : plan.gold
                        ? "1px solid rgba(198,161,91,0.3)"
                        : "1px solid #E8E5E0",
                      boxShadow: plan.popular
                        ? "0 8px 40px rgba(72,107,70,0.15), 0 2px 8px rgba(72,107,70,0.08)"
                        : "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)",
                      padding: plan.popular ? "36px 28px" : "28px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-6px)";
                      e.currentTarget.style.boxShadow = plan.popular
                        ? "0 16px 56px rgba(72,107,70,0.2), 0 4px 12px rgba(72,107,70,0.1)"
                        : "0 8px 40px rgba(72,107,70,0.12), 0 2px 8px rgba(72,107,70,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = plan.popular
                        ? "0 8px 40px rgba(72,107,70,0.15), 0 2px 8px rgba(72,107,70,0.08)"
                        : "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)";
                    }}
                  >
                    {/* Gold shimmer effect */}
                    {plan.gold && (
                      <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-[0.08]"
                        style={{ background: "radial-gradient(circle, #C6A15B 0%, transparent 70%)" }} />
                    )}

                    {/* Plan icon & badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{plan.icon}</span>
                        <h3 className="font-headline text-xl font-bold" style={{ color: "#2F2F2F" }}>
                          {plan.name}
                        </h3>
                      </div>
                      {!plan.popular && (
                        <span
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: plan.badgeColor.bg,
                            color: plan.badgeColor.text,
                          }}
                        >
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className="text-sm leading-relaxed mb-4" style={{ color: "#777777" }}>
                        {plan.description}
                      </p>
                    )}

                    {/* Price */}
                    {(() => {
                      const price = planPricing(plan.id, period);
                      return (
                        <div className="mb-6 pb-6" style={{ borderBottom: "1px solid #F0EDE8" }}>
                          {price.fullYear !== null && (
                            <p className="text-sm font-semibold line-through" style={{ color: "#9CA3AF" }}>
                              {formatFcfa(price.fullYear)} F
                            </p>
                          )}
                          <div className="flex items-baseline gap-1 flex-wrap">
                            <span
                              className="font-headline font-black"
                              style={{
                                fontSize: plan.popular ? "3.25rem" : "2.75rem",
                                color: plan.gold ? "#9B7C15" : plan.popular ? "#486B46" : "#2F2F2F",
                              }}
                            >
                              {formatFcfa(price.amount)}
                            </span>
                            <span className="text-base font-medium ml-1" style={{ color: "#6B746E" }}>
                              F {t(period === "annual" ? "billing.perYear" : "billing.perMonth")}
                            </span>
                          </div>
                          {price.perMonth !== null && price.savings !== null && (
                            <div className="mt-2 space-y-1">
                              <p className="text-sm" style={{ color: "#56615A" }}>
                                {t("billing.perMonthEquivalent", { amount: formatFcfa(price.perMonth) })}
                              </p>
                              <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: "#EEF5EC", color: "#486B46" }}>
                                {t("billing.savings", { amount: formatFcfa(price.savings) })}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Features */}
                    <ul className="space-y-4 flex-1 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature.text} className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background: plan.gold
                                ? "rgba(198,161,91,0.12)"
                                : plan.popular
                                ? "#EEF5EC"
                                : "#FAF9F6",
                              border: `1px solid ${
                                plan.gold
                                  ? "rgba(198,161,91,0.2)"
                                  : plan.popular
                                  ? "#C6D4C0"
                                  : "#F0EDE8"
                              }`,
                            }}
                          >
                            <Check
                              className="w-4 h-4"
                              style={{
                                color: plan.gold ? "#9B7C15" : "#486B46",
                              }}
                            />
                          </div>
                          <span className="text-sm leading-relaxed pt-1.5" style={{ color: "#374151" }}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Tagline */}
                    {plan.tagline && (
                      <p className="text-xs italic leading-relaxed mb-6" style={{ color: "#9CA3AF" }}>
                        {plan.tagline}
                      </p>
                    )}

                    {/* CTA Button */}
                    <Button
                      className="w-full h-13 rounded-2xl font-bold text-sm gap-2 transition-all duration-300"
                      style={{
                        background: plan.popular
                          ? "linear-gradient(135deg, #486B46 0%, #5A8C58 100%)"
                          : plan.gold
                          ? "linear-gradient(135deg, #9B7C15 0%, #C6A15B 100%)"
                          : "transparent",
                        color: plan.popular || plan.gold ? "#FFFFFF" : "#486B46",
                        border: plan.popular || plan.gold ? "none" : "1px solid #C6D4C0",
                        height: "52px",
                      }}
                    >
                      {plan.gold && <Sparkles className="w-4 h-4" />}
                      {plan.popular && <Zap className="w-4 h-4" style={{ fill: "#FFFFFF" }} />}
                      {plan.cta}
                    </Button>

                    {/* Secure payment reassurance */}
                    <div className="flex items-center justify-center gap-1.5 mt-4">
                      <Lock className="w-3 h-3" style={{ color: "#9CA3AF" }} />
                      <span className="text-[11px]" style={{ color: "#9CA3AF" }}>
                        {t("tarifs.securePayment")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ BOTTOM CTA SECTION ══ */}
        <section className="pb-16 sm:pb-20">
          <div className="container mx-auto px-4">
            <div
              className="relative overflow-hidden rounded-[28px] max-w-3xl mx-auto text-center px-6 py-14 sm:py-20"
              style={{
                background: "linear-gradient(135deg, #EEF5EC 0%, #FAF9F6 50%, #FDF6E3 100%)",
                border: "1px solid #C6D4C0",
              }}
            >
              {/* Decorative circles */}
              <div
                className="absolute -top-10 -left-10 w-40 h-40 rounded-full pointer-events-none opacity-20"
                style={{ background: "radial-gradient(circle, #486B46 0%, transparent 70%)", filter: "blur(40px)" }}
              />
              <div
                className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full pointer-events-none opacity-20"
                style={{ background: "radial-gradient(circle, #C6A15B 0%, transparent 70%)", filter: "blur(40px)" }}
              />

              <div className="relative z-10">
                {/* Heart icon */}
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #FFFFFF 0%, #EEF5EC 100%)",
                    border: "1px solid #C6D4C0",
                    boxShadow: "0 4px 20px rgba(72,107,70,0.1)",
                  }}
                >
                  <Heart className="w-7 h-7" style={{ color: "#C6A15B" }} />
                </div>

                <h2 className="font-headline text-2xl sm:text-3xl font-bold mb-4" style={{ color: "#2F2F2F" }}>
                  {t("tarifs.bottomTitle")}
                </h2>
                <p
                  className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-2"
                  style={{ color: "#555555" }}
                >
                  {t("tarifs.bottomText")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══ TRUST BADGES ══ */}
        <section className="pb-14">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 max-w-2xl mx-auto">
              {[
                { icon: ShieldCheck, label: t("tarifs.trustSecurePayment") },
                { icon: Lock, label: t("tarifs.trustEncrypted") },
                { icon: Heart, label: t("tarifs.trustCancel") },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-2">
                  <badge.icon className="w-4 h-4" style={{ color: "#486B46" }} />
                  <span className="text-xs font-medium" style={{ color: "#777777" }}>
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
