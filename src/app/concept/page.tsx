
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ShieldCheck, Scale, HandHeart, MessageCircleCode } from "lucide-react";

export default function ConceptPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />
      
      <main className="flex-1">
        {/* Hero Concept */}
        <section className="py-24 bg-card relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h1 className="font-headline text-5xl md:text-6xl font-bold text-foreground">Notre Vision Sacrée</h1>
              <p className="text-xl text-foreground/70 leading-relaxed">
                Eden Rencontre n'est pas un simple site de rencontre. C'est un sanctuaire numérique dédié à l'édification de foyers chrétiens solides, basés sur la vérité, le respect et l'amour divin.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-12">
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-accent">
                  <Scale className="w-8 h-8" />
                  <h3 className="font-headline text-3xl font-bold">Éthique & Intégrité</h3>
                </div>
                <p className="text-foreground/60 text-lg leading-relaxed pl-12">
                  Nous croyons que chaque interaction doit être empreinte de respect. Notre charte éthique bannit les comportements légers et encourage la sincérité dès les premiers échanges.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-accent">
                  <ShieldCheck className="w-8 h-8" />
                  <h3 className="font-headline text-3xl font-bold">Protection des Profils</h3>
                </div>
                <p className="text-foreground/60 text-lg leading-relaxed pl-12">
                  Nous luttons activement contre la fraude. Chaque membre est encouragé à vérifier son identité, créant ainsi un climat de confiance mutuelle.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-accent">
                  <HandHeart className="w-8 h-8" />
                  <h3 className="font-headline text-3xl font-bold">Valeurs Bibliques</h3>
                </div>
                <p className="text-foreground/60 text-lg leading-relaxed pl-12">
                  Le mariage est une institution sacrée. Nous facilitons les rencontres entre personnes partageant la même vision du foyer, de l'éducation et de la spiritualité.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-foreground/5">
                <img 
                  src="/mariage_one.png" 
                  alt="Concept Visual" 
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="bg-card p-10 rounded-2xl border border-foreground/5 text-center shadow-xl">
                <h4 className="font-headline text-2xl font-bold text-accent mb-4">"L'alliance bénie commence par une rencontre vraie."</h4>
                <p className="text-foreground/60 italic">Fondatrice d'Eden Rencontre</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security / Anti-Brouteur */}
        <section className="py-24 bg-accent/5">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="inline-block p-4 bg-foreground/5 rounded-full mb-4">
                <MessageCircleCode className="w-12 h-12 text-accent" />
              </div>
              <h2 className="font-headline text-4xl font-bold text-foreground">Sécurité Maximale</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                <div className="bg-card p-8 rounded-2xl border border-foreground/5">
                  <h4 className="text-accent font-bold mb-3">Communication Modérée</h4>
                  <p className="text-foreground/60 text-sm">Notre système bloque automatiquement le partage de liens externes et de numéros lors des premiers messages pour vous protéger des arnaques.</p>
                </div>
                <div className="bg-card p-8 rounded-2xl border border-foreground/5">
                  <h4 className="text-accent font-bold mb-3">Vérification en temps réel</h4>
                  <p className="text-foreground/60 text-sm">Notre vérification compare votre photo de profil avec votre pièce d'identité pour garantir que vous êtes bien qui vous prétendez être.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
