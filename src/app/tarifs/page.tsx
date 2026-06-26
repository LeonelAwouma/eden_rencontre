
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Check, Heart } from "lucide-react";

export default function PricingPage() {
  const plans = [
    {
      name: "Standard",
      price: "0",
      description: "Pour commencer votre recherche spirituelle.",
      features: [
        "Création du Profil de Foi",
        "Recherche de membres",
        "5 Coups de Cœur par jour",
        "Messages limités",
      ],
      cta: "Commencer gratuitement",
      popular: false,
    },
    {
      name: "Premium Eden",
      price: "19.99",
      description: "L'expérience complète pour trouver l'alliance.",
      features: [
        "Tout du plan Standard",
        "Messages illimités",
        "Coups de Cœur illimités",
        "Badge 'Profil Certifié' offert",
        "Filtres de recherche avancés",
        "Voir qui a visité votre profil",
      ],
      cta: "Devenir Premium",
      popular: true,
    },
    {
      name: "Alliance Or",
      price: "49.99",
      description: "Pour un accompagnement personnalisé.",
      features: [
        "Tout du plan Premium",
        "Assistance prioritaire",
        "Visibilité boostée",
        "Conseils personnalisés (Blog exclusif)",
        "Accès aux événements privés",
      ],
      cta: "Choisir Alliance Or",
      popular: false,
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />
      
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-6">
            <h1 className="font-headline text-5xl font-bold text-foreground">Tarifs Transparents</h1>
            <p className="text-xl text-foreground/60">Investissez dans votre futur foyer. Des fonctionnalités premium pour des rencontres plus profondes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div 
                key={plan.name}
                className={`relative p-8 rounded-3xl border transition-all duration-300 flex flex-col ${
                  plan.popular 
                    ? 'bg-card border-accent scale-105 shadow-2xl shadow-accent/10 z-10' 
                    : 'bg-card/50 border-foreground/5 hover:border-foreground/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-background text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full">
                    Le plus choisi
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className="font-headline text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-foreground/40 text-sm">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-accent">{plan.price}€</span>
                    <span className="text-foreground/40">/mois</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-foreground/70">
                      <Check className="w-5 h-5 text-accent shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full h-12 font-bold ${
                    plan.popular 
                      ? 'bg-accent text-background hover:bg-accent/90' 
                      : 'bg-foreground/5 text-foreground hover:bg-foreground/10'
                  }`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-foreground/60">
              <Heart className="w-5 h-5 text-accent" />
              <span>Engagement mensuel, résiliable à tout moment.</span>
            </div>
            <p className="text-sm text-foreground/40">
              Tous nos paiements sont sécurisés par cryptage SSL.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
