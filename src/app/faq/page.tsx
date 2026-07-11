import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OrganicSeparator } from "@/components/garden";

const faqs = [
  {
    q: "Qu'est-ce qu'Eden Connexion ?",
    a: "Eden Connexion est une plateforme matrimoniale haut de gamme dédiée aux célibataires chrétiens d'Afrique et de la diaspora. Notre mission est de faciliter des rencontres sérieuses basées sur la foi, les valeurs bibliques et l'engagement envers le mariage.",
  },
  {
    q: "Comment fonctionne la modération des profils ?",
    a: "Chaque profil est vérifié manuellement par notre équipe. Nous comparons la photo de profil avec une pièce d'identité pour garantir l'authenticité. Les comportements inappropriés sont immédiatement signalés et traités.",
  },
  {
    q: "Les échanges sont-ils sécurisés ?",
    a: "Oui. Notre système bloque automatiquement le partage de liens externes et de numéros de téléphone lors des premiers échanges. Cette protection permet de créer un climat de confiance et de protéger nos membres contre les arnaques.",
  },
  {
    q: "Puis-je utiliser Eden Connexion gratuitement ?",
    a: "L'inscription et la création de profil sont gratuites. Vous pouvez parcourir les profils et recevoir des suggestions. Pour accéder aux fonctionnalités de messagerie avancées, nous proposons différents abonnements adaptés à vos besoins.",
  },
  {
    q: "Comment fonctionne l'algorithme de suggestion ?",
    a: "Notre algorithme prend en compte vos critères de foi, vos valeurs, votre localisation et vos préférences personnelles pour vous suggérer des profils compatibles. L'objectif est de favoriser des unions fondées sur une vision commune du mariage.",
  },
  {
    q: "Puis-je supprimer mon compte ?",
    a: "Oui, vous pouvez supprimer votre compte à tout moment depuis les paramètres de votre profil. Toutes vos données seront supprimées conformément au RGPD dans un délai de 30 jours.",
  },
  {
    q: "Comment contacter le support ?",
    a: "Vous pouvez nous écrire via la page Contact ou par email à support@edenconnexion.com. Notre équipe vous répondra sous 24 à 48 heures.",
  },
];

export default function FAQPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">Aide</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Questions <span className="italic text-primary">Fréquentes</span>
              </h1>
              <OrganicSeparator />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                Trouvez rapidement les réponses à vos questions sur Eden Connexion.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-6">
              {faqs.map((faq, i) => (
                <div key={i} className="garden-card p-6 sm:p-8 rounded-2xl">
                  <h3 className="font-headline text-lg sm:text-xl font-bold text-deep-eden mb-3">{faq.q}</h3>
                  <p className="text-muted-foreground leading-relaxed font-body">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </GardenSection>
      </main>

      <Footer />
    </div>
  );
}