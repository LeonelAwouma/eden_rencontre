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
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">EDEN CONNEXIONS</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Charte d&#39;Utilisation, d&#39;Engagement Spirituel<br />
                <span className="italic text-primary">et de Confidentialité</span>
              </h1>
              <OrganicSeparator />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                La plateforme Eden Connexions est un espace sacré, conçu exclusivement pour les célibataires chrétiens nés de nouveau, désireux de bâtir une relation amoureuse sérieuse devant mener au mariage chrétien. L&#39;adhésion à la plateforme requiert l&#39;acceptation sans réserve de la présente charte, visant à préserver la sainteté, la sécurité et le respect mutuel au sein de notre communauté.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-12">
              {/* AXE I */}
              <div className="space-y-6">
                <h2 className="font-headline text-2xl font-bold text-deep-eden border-b border-sage/20 pb-3">
                  AXE I : Authenticité et Vérification des Informations
                </h2>

                <div className="garden-card p-8 rounded-2xl">
                  <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Article 1 — Sincérité des données fournies</h3>
                  <p className="text-muted-foreground leading-relaxed font-body">
                    L&#39;utilisateur s&#39;engage formellement à fournir des informations rigoureusement exactes, à jour et conformes à sa situation réelle lors de son inscription et dans les questionnaires de compatibilité (identité, âge, statut matrimonial, situation professionnelle, niveau d&#39;études, engagement ecclésial). Tout mensonge ou omission volontaire entraînera l&#39;exclusion immédiate.
                  </p>
                </div>

                <div className="garden-card p-8 rounded-2xl">
                  <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Article 2 — Autorisation expresse de vérification (Accord d&#39;Audit Profil)</h3>
                  <p className="text-muted-foreground leading-relaxed font-body">
                    Par la signature de la présente charte, l&#39;utilisateur donne son accord formel et exprès aux administrateurs de la plateforme pour procéder à la vérification de l&#39;ensemble des informations fournies. Les administrateurs se réservent le droit d&#39;exiger des pièces justificatives (copie de la CNI, justificatifs professionnels/diplômes) ou de contacter les référents pastoraux et ecclésiaux mentionnés par l&#39;utilisateur pour confirmer son statut et son engagement chrétien.
                  </p>
                </div>
              </div>

              {/* AXE II */}
              <div className="space-y-6">
                <h2 className="font-headline text-2xl font-bold text-deep-eden border-b border-sage/20 pb-3">
                  AXE II : Alignement Spirituel et Valeurs du Site
                </h2>

                <div className="garden-card p-8 rounded-2xl">
                  <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Article 3 — Soumission absolue à la Parole de Dieu</h3>
                  <p className="text-muted-foreground leading-relaxed font-body">
                    L&#39;utilisateur déclare reconnaître la Bible comme l&#39;autorité suprême infaillible. Il s&#39;engage à ce que sa démarche, ses motivations et ses critères de recherche soient pleinement alignés et soumis aux principes et instructions des Saintes Écritures concernant la pureté, le mariage et les relations humaines.
                  </p>
                </div>

                <div className="garden-card p-8 rounded-2xl">
                  <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Article 4 — Conversations saines, pures et respectueuses</h3>
                  <p className="text-muted-foreground leading-relaxed font-body">
                    Toutes les interactions, qu&#39;elles soient publiques ou privées (messagerie intégrée), doivent être empreintes de dignité, de tempérance et de bienveillance chrétienne. Sont strictement interdits : les propos grossiers, les insinuations ou demandes à caractère sexuel, le harcèlement, l&#39;intimidation et le chantage. L&#39;utilisateur s&#39;engage à préserver une totale pureté (abstinence et sanctification) au cours des échanges.
                  </p>
                </div>
              </div>

              {/* AXE III */}
              <div className="space-y-6">
                <h2 className="font-headline text-2xl font-bold text-deep-eden border-b border-sage/20 pb-3">
                  AXE III : Sécurité et Confidentialité
                </h2>

                <div className="garden-card p-8 rounded-2xl">
                  <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Article 5 — Protection des données d&#39;autrui</h3>
                  <p className="text-muted-foreground leading-relaxed font-body">
                    Toutes les informations, photographies ou détails personnels concernant d&#39;autres membres découverts sur la plateforme doivent rester strictement confidentiels. Il est formellement interdit de capturer, copier ou divulguer à des tiers extérieurs des éléments de profil sans l&#39;accord écrit de la personne concernée et des administrateurs.
                  </p>
                </div>
              </div>

              {/* Engagement */}
              <div className="garden-card p-8 rounded-2xl border-2 border-sage/30">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Engagement du Membre</h3>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-3 list-none">
                  <li className="flex items-start gap-3">
                    <span className="text-sage mt-1">✦</span>
                    <span>J&#39;autorise expressément les administrateurs à vérifier la véracité de mes informations personnelles et ecclésiales.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-sage mt-1">✦</span>
                    <span>Je m&#39;engage à maintenir des conversations saines et respectueuses, soumises à la Parole de Dieu.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-sage mt-1">✦</span>
                    <span>J&#39;ai lu, compris et j&#39;accepte l&#39;intégralité de la présente charte d&#39;engagement.</span>
                  </li>
                </ul>
              </div>

              {/* Sanctions */}
              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Sanctions</h3>
                <p className="text-muted-foreground leading-relaxed font-body mb-4">
                  En rejoignant Eden Connexion, vous vous engagez à respecter cette charte. Tout manquement peut entraîner :
                </p>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-2 list-disc list-inside">
                  <li>Un avertissement de l&#39;équipe de modération</li>
                  <li>Une suspension temporaire du compte</li>
                  <li>La suppression définitive du compte en cas de récidive</li>
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