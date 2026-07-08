import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OrganicSeparator } from "@/components/garden";

export default function CGUPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">Légal</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Conditions Générales <span className="italic text-primary">d'Utilisation</span>
              </h1>
              <OrganicSeparator />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                Dernière mise à jour : Janvier 2025
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">1. Objet</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Eden Rencontre, un service de mise en relation matrimoniale destiné aux célibataires chrétiens. En créant un compte, vous acceptez sans réserve les présentes conditions.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">2. Inscription</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  L'inscription est réservée aux personnes majeures (18 ans et plus). Vous vous engagez à fournir des informations exactes et à jour lors de la création de votre profil. Chaque personne ne peut posséder qu'un seul compte. Les comptes multiples seront supprimés.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">3. Comportement Attendu</h3>
                <p className="text-muted-foreground leading-relaxed font-body mb-4">
                  En tant que membre d'Eden Rencontre, vous vous engagez à :
                </p>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-2 list-disc list-inside">
                  <li>Respecter tous les membres avec courtoisie et bienveillance</li>
                  <li>Être sincère dans vos intentions matrimoniales</li>
                  <li>Ne pas tenir de propos offensants, discriminatoires ou inappropriés</li>
                  <li>Ne pas harceler ou importuner d'autres membres</li>
                  <li>Respecter la vie privée des autres membres</li>
                  <li>Utiliser des photos authentiques vous représentant</li>
                </ul>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">4. Interdictions</h3>
                <p className="text-muted-foreground leading-relaxed font-body mb-4">
                  Il est strictement interdit de :
                </p>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-2 list-disc list-inside">
                  <li>Utiliser la plateforme à des fins commerciales ou publicitaires</li>
                  <li>Publier du contenu à caractère pornographique, violent ou illégal</li>
                  <li>Usurper l'identité d'une autre personne</li>
                  <li>Tenter de collecter des données personnelles d'autres membres</li>
                  <li>Utiliser des robots, scrapers ou tout outil automatisé</li>
                  <li>Contourner les mesures de sécurité de la plateforme</li>
                </ul>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">5. Abonnements et Paiements</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  L'accès aux fonctionnalités premium nécessite un abonnement payant. Les tarifs sont indiqués sur la page Tarifs. Les abonnements sont renouvelés automatiquement sauf annulation de votre part au moins 24 heures avant la fin de la période en cours. Conformément à la législation, vous disposez d'un droit de rétractation de 14 jours après la souscription.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">6. Résiliation</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Vous pouvez supprimer votre compte à tout moment depuis les paramètres. Eden Rencontre se réserve le droit de suspendre ou supprimer tout compte en cas de non-respect des présentes CGU ou de la Charte Éthique, sans préavis ni remboursement.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">7. Responsabilité</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Eden Rencontre s'efforce d'assurer un service de qualité mais ne peut garantir la réussite d'une rencontre ni l'exactitude des profils publiés par les membres. La responsabilité de la plateforme ne saurait être engagée en cas de dommages résultant de rencontres effectuées via le service.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">8. Droit Applicable</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Les présentes CGU sont régies par le droit camerounais. Tout litige relatif à leur interprétation ou exécution sera soumis aux tribunaux compétents de Douala, Cameroun, à défaut d'accord amiable.
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