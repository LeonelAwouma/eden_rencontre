import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Check,
  Heart,
  ShieldCheck,
  Sparkles,
  Users,
  Globe,
  MapPin,
  Star,
  Zap,
  Search,
  MessageCircle,
  Target,
  Lock,
} from "lucide-react";

export default function PricingPage() {
  const plans = [
    {
      name: "Bronze",
      icon: "🥉",
      price: "2 500",
      currency: "F",
      badge: "Idéal pour commencer",
      badgeColor: { bg: "#F5E6D3", text: "#8B6914" },
      features: [
        { text: "Jusqu'à 5 matchings par jour", icon: Users },
        { text: "Jusqu'à 5 demandes de connexion", icon: MessageCircle },
        { text: "Parfait pour découvrir la plateforme", icon: Search },
      ],
      cta: "Choisir Bronze",
      popular: false,
      gold: false,
    },
    {
      name: "Silver",
      icon: "🥈",
      price: "5 000",
      currency: "F",
      badge: "Le plus populaire",
      badgeColor: { bg: "#EEF5EC", text: "#486B46" },
      features: [
        { text: "Jusqu'à 10 matchings aléatoires", icon: Sparkles },
        { text: "Plus de profils à découvrir", icon: Users },
        { text: "Plus d'opportunités de trouver la bonne personne", icon: Heart },
      ],
      cta: "Choisir Silver",
      popular: true,
      gold: false,
    },
    {
      name: "Gold",
      icon: "🥇",
      price: "10 000",
      currency: "F",
      badge: "Premium",
      badgeColor: { bg: "#FDF6E3", text: "#9B7C15" },
      features: [
        { text: "Matching géographique ciblé", icon: MapPin },
        { text: "Découvrez les personnes proches de vous", icon: Globe },
        { text: "Recommandations plus intelligentes et pertinentes", icon: Target },
        { text: "La meilleure expérience pour les relations sérieuses", icon: Star },
      ],
      cta: "Passer au Premium",
      popular: false,
      gold: true,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#FAF9F6" }}>
      <Navigation />

      <main className="flex-1">
        {/* ══ HERO SECTION ══ */}
        <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none opacity-20"
            style={{ background: "radial-gradient(circle, #C6A15B 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div className="absolute top-20 left-10 w-[200px] h-[200px] rounded-full pointer-events-none opacity-10"
            style={{ background: "radial-gradient(circle, #486B46 0%, transparent 70%)", filter: "blur(60px)" }} />
          <div className="absolute top-20 right-10 w-[200px] h-[200px] rounded-full pointer-events-none opacity-10"
            style={{ background: "radial-gradient(circle, #486B46 0%, transparent 70%)", filter: "blur(60px)" }} />

          <div className="relative z-10 container mx-auto px-4 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6"
              style={{ background: "rgba(198,161,91,0.1)", border: "1px solid rgba(198,161,91,0.25)" }}>
              <Sparkles className="w-4 h-4" style={{ color: "#C6A15B" }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#9B7C15" }}>
                Holy Match — Tarifs
              </span>
            </div>
            <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-bold mb-6" style={{ color: "#2F2F2F" }}>
              ✨ Choisissez le plan{" "}
              <span className="italic" style={{ color: "#486B46" }}>fait pour vous</span>
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: "#777777" }}>
              Trouvez des connexions significatives grâce à un plan adapté à vos besoins.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="h-px w-16" style={{ background: "linear-gradient(to right, transparent, #C6D4C0)" }} />
              <Heart className="w-5 h-5" style={{ color: "#C6A15B" }} />
              <div className="h-px w-16" style={{ background: "linear-gradient(to left, transparent, #C6D4C0)" }} />
            </div>
          </div>
        </section>

        {/* ══ PRICING CARDS ══ */}
        <section className="pb-16 sm:pb-24 -mt-4">
          <div className="container mx-auto px-4">
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
                    <div className="flex items-center justify-between mb-6">
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

                    {/* Price */}
                    <div className="mb-6 pb-6" style={{ borderBottom: "1px solid #F0EDE8" }}>
                      <div className="flex items-baseline gap-1">
                        <span
                          className="font-headline font-black"
                          style={{
                            fontSize: plan.popular ? "3.25rem" : "2.75rem",
                            color: plan.gold ? "#9B7C15" : plan.popular ? "#486B46" : "#2F2F2F",
                          }}
                        >
                          {plan.price}
                        </span>
                        <span className="text-base font-medium ml-1" style={{ color: "#9CA3AF" }}>
                          {plan.currency}
                        </span>
                      </div>
                    </div>

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
                        Paiement 100% sécurisé
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ BOTTOM CTA SECTION ══ */}
        <section className="pb-24 sm:pb-32">
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
                  💖 Trouvez la bonne personne plus rapidement
                </h2>
                <p
                  className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-2"
                  style={{ color: "#555555" }}
                >
                  Choisissez le plan qui correspond à vos objectifs et profitez d'une expérience
                  de mise en relation personnalisée, conçue pour vous aider à construire des
                  relations chrétiennes significatives.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══ TRUST BADGES ══ */}
        <section className="pb-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 max-w-2xl mx-auto">
              {[
                { icon: ShieldCheck, label: "Paiement sécurisé" },
                { icon: Lock, label: "Données chiffrées" },
                { icon: Heart, label: "Résiliable à tout moment" },
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