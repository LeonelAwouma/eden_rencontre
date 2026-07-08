import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OrganicSeparator } from "@/components/garden";

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">Support</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                Nous <span className="italic text-primary">Contacter</span>
              </h1>
              <OrganicSeparator />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                Notre équipe est à votre écoute pour répondre à toutes vos questions.
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-8">
              <div className="garden-card p-8 rounded-2xl text-center">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">Par Email</h3>
                <p className="text-muted-foreground font-body mb-4">Écrivez-nous à :</p>
                <a href="mailto:support@edenrencontre.com" className="text-primary font-headline text-xl font-bold hover:text-deep-eden transition-colors">
                  support@edenrencontre.com
                </a>
                <p className="text-muted-foreground text-sm font-body mt-3">Réponse sous 24 à 48 heures</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="garden-card p-6 rounded-2xl text-center">
                  <h3 className="font-headline text-lg font-bold text-deep-eden mb-3">Signaler un Problème</h3>
                  <p className="text-muted-foreground text-sm font-body">Vous avez rencontré un bug ou un comportement inapproprié ? Contactez-nous immédiatement.</p>
                </div>
                <div className="garden-card p-6 rounded-2xl text-center">
                  <h3 className="font-headline text-lg font-bold text-deep-eden mb-3">Demande de Partenariat</h3>
                  <p className="text-muted-foreground text-sm font-body">Vous souhaitez collaborer avec Eden Rencontre ? Écrivez-nous votre proposition.</p>
                </div>
              </div>

              <div className="text-center pt-4">
                <p className="text-muted-foreground text-sm font-body">
                  Vous pouvez également consulter notre <a href="/faq" className="text-primary hover:text-deep-eden transition-colors underline">FAQ</a> pour des réponses immédiates.
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