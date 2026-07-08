import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OrganicSeparator } from "@/components/garden";

export default function ChartePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">Nos Valeurs</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Charte <span className="italic text-primary">Éthique</span>
              </h1>
              <OrganicSeparator />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                Eden Rencontre repose sur des valeurs fondamentales inspirées de la Parole de Dieu. Cette charte guide chacun de nos membres et de nos actions.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Sincérité et Transparence</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Chaque membre s'engage à présenter un profil authentique et sincère. Les photos doivent être récentes et les informations exactes. La tromperie, sous toutes ses formes, est contraire à l'esprit d'Eden Rencontre. Nous encourageons la vérité dans chaque interaction, car un mariage solide ne peut se construire que sur des fondations honnêtes.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Respect et Bienveillance</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Chaque être humain est créé à l'image de Dieu et mérite d'être traité avec dignité. Tout comportement irrespectueux, grossier ou blessant est inacceptable. Les échanges doivent refléter l'amour fraternel et la courtoisie que nous prônons.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Intention Matrimoniale</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Eden Rencontre est réservé aux personnes dont l'intention est le mariage. Les relations superficielles, les aventures ou les comportements frivoles n'ont pas leur place sur notre plateforme. Chaque membre est invité à s'engager dans une démarche sérieuse et réfléchie.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Foi et Spiritualité</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Nous croyons que la prière et la guidance divine sont essentielles dans le choix d'un conjoint. Nous encourageons chaque membre à placer Dieu au centre de sa recherche et à prier pour les personnes qu'il rencontre. Le Parcours de Foi est un outil conçu pour accompagner cette démarche spirituelle.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Protection et Modération</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Nous assurons la sécurité de nos membres par une modération active et des outils de protection sophistiqués. Les tentatives d'escroquerie, les faux profils et les comportements prédateurs sont détectés et sanctionnés. Nous combattons activement les brouteurs et toute forme de fraude sentimentale.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Confidentialité</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  Les échanges privés entre membres restent confidentiels. Nous ne lisons pas les messages privés sauf en cas de signalement pour comportement inapproprié. Les données personnelles sont protégées conformément au RGPD et à notre politique de confidentialité.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Engagement de la Communauté</h3>
                <p className="text-muted-foreground leading-relaxed font-body mb-4">
                  En rejoignant Eden Rencontre, vous vous engagez à respecter cette charte. Tout manquement peut entraîner :
                </p>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-2 list-disc list-inside">
                  <li>Un avertissement de l'équipe de modération</li>
                  <li>Une suspension temporaire du compte</li>
                  <li>La suppression définitive du compte en cas de récidive</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed font-body mt-4">
                  Nous comptons sur chaque membre pour faire d'Eden Rencontre un espace sûr, respectueux et bénit par Dieu.
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