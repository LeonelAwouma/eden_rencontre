import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OrganicSeparator } from "@/components/garden";

export default function MentionsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">Légal</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Mentions <span className="italic text-primary">Légales</span>
              </h1>
              <OrganicSeparator />
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Éditeur du Site</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Eden Connexion<br />
                  Plateforme matrimoniale chrétienne<br />
                  Email : contact@edenconnexion.com<br />
                  Directeur de la publication : Direction Eden Connexion
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Hébergement</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Le site est hébergé par Firebase (Google Cloud Platform), dont le siège social est situé au 1600 Amphitheatre Parkway, Mountain View, CA 94043, États-Unis.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Propriété Intellectuelle</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  L'ensemble du contenu de ce site (textes, images, graphismes, logos, icônes) est la propriété exclusive d'Eden Connexion, sauf indication contraire. Toute reproduction, représentation, modification ou adaptation, totale ou partielle, est interdite sans autorisation préalable écrite.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Protection des Données</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez de droits sur vos données personnelles. Pour plus d'informations, consultez notre page <a href="/confidentialite" className="text-primary hover:text-deep-eden transition-colors underline">Confidentialité</a>.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Cookies</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Ce site utilise des cookies strictement nécessaires à son fonctionnement. Aucun cookie publicitaire n'est utilisé. Vous pouvez configurer votre navigateur pour refuser les cookies, mais certaines fonctionnalités pourraient ne plus être disponibles.
                </p>
              </div>
            </div>
          </div>
        </GardenSection>
      </main>

      <Footer />
    </div>
  );
}