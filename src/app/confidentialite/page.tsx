import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OrganicSeparator } from "@/components/garden";

export default function ConfidentialitePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">Données</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Politique de <span className="italic text-primary">Confidentialité</span>
              </h1>
              <OrganicSeparator />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                Dernière mise à jour : Janvier 2025
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">1. Collecte des Données</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Nous collectons les données que vous nous fournissez directement lors de votre inscription : nom, prénom, adresse email, date de naissance, photo de profil et informations de profil. Nous collectons également des données de navigation (adresse IP, type de navigateur) pour assurer le bon fonctionnement du service.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">2. Utilisation des Données</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Vos données sont utilisées exclusivement pour : la gestion de votre compte, la mise en relation avec d'autres membres compatibles, l'amélioration de nos services, et la communication concernant votre activité sur la plateforme. Nous ne vendons jamais vos données à des tiers.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">3. Partage des Données</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Vos données personnelles ne sont partagées qu'avec nos prestataires techniques (hébergement Firebase, paiement sécurisé) qui sont contractuellement tenus de respecter la confidentialité de vos informations. Aucune donnée n'est cédée à des fins publicitaires.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">4. Sécurité</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, modification, divulgation ou destruction. Les communications sont chiffrées via HTTPS/TLS.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">5. Vos Droits (RGPD)</h3>
                <p className="text-muted-foreground leading-relaxed font-body mb-4">
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-2 list-disc list-inside">
                  <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles</li>
                  <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
                  <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
                  <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                  <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
                  <li><strong>Droit de limitation :</strong> demander la limitation du traitement</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed font-body mt-4">
                  Pour exercer vos droits, contactez-nous à : <a href="mailto:privacy@edenconnexion.com" className="text-primary hover:text-deep-eden transition-colors underline">privacy@edenconnexion.com</a>
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">6. Conservation des Données</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Vos données sont conservées pendant la durée de votre inscription. En cas de suppression de compte, vos données sont supprimées dans un délai de 30 jours, sauf obligation légale de conservation.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">7. Cookies</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement du site (session utilisateur, préférences). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">8. Contact DPO</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Pour toute question relative à la protection de vos données, vous pouvez contacter notre Délégué à la Protection des Données à : <a href="mailto:privacy@edenconnexion.com" className="text-primary hover:text-deep-eden transition-colors underline">privacy@edenconnexion.com</a>
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