import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OrganicSeparator } from "@/components/garden";

export default function SecuritePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">Confiance</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Sécurité & <span className="italic text-primary">Confiance</span>
              </h1>
              <OrganicSeparator />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                Votre sécurité est notre priorité absolue. Découvrez les mesures que nous prenons pour vous protéger.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-10">
              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Vérification des Profils</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Chaque membre est encouragé à vérifier son identité en fournissant une pièce d'identité. Notre équipe compare la photo de profil avec le document fourni. Les profils vérifiés bénéficient d'un badge de confiance visible par tous les membres.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Communication Modérée</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Notre système bloque automatiquement le partage de liens externes, numéros de téléphone et coordonnées bancaires lors des premiers échanges. Cette protection intelligente permet de prévenir les tentatives d'arnaque et de créer un espace d'échange serein.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Signalement & Modération</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Chaque membre peut signaler un comportement suspect en un clic. Notre équipe de modération examine chaque signalement sous 24 heures. Les comptes enfreignant notre charte éthique sont immédiatement suspendus ou supprimés.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Protection des Données</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Vos données personnelles sont chiffrées et stockées de manière sécurisée. Nous respectons strictement le RGPD (Règlement Général sur la Protection des Données). Vos informations ne sont jamais partagées avec des tiers à des fins commerciales.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Conseils de Prudence</h3>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-2 list-disc list-inside">
                  <li>Ne partagez jamais vos informations bancaires avec un autre membre.</li>
                  <li>Prenez le temps de connaître la personne avant de partager des coordonnées personnelles.</li>
                  <li>Signalez immédiatement tout comportement suspect.</li>
                  <li>Rencontrez-vous dans un lieu public pour une première rencontre.</li>
                  <li>Informez un proche de vos rendez-vous.</li>
                </ul>
              </div>
            </div>
          </div>
        </GardenSection>
      </main>

      <Footer />
    </div>
  );
}