import Image from "next/image";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Heart, ScrollText, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navigation />
      
      <main>
        {/* Hero Section */}
        <section className="relative min-h-[88vh] sm:min-h-[90vh] flex items-center overflow-hidden bg-background">
          {/* Conteneur de l'image mariage.png positionné à droite */}
          <div className="absolute top-0 right-0 w-full sm:w-[70%] lg:w-[45%] h-full z-0 pointer-events-none select-none opacity-40 sm:opacity-100">
            <Image
              src="/mariage.png"
              alt="Eden Rencontre Hero"
              fill
              className="object-contain object-bottom object-right"
              priority
            />
            {/* Dégradé horizontal sur le bord gauche (25-30% de largeur) pour la fusion douce avec le fond */}
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background to-transparent z-10" />
            
            {/* Dégradé vertical sur le bord supérieur (15% de hauteur) pour éviter la coupure avec la navbar */}
            <div className="absolute inset-x-0 top-0 h-[15%] bg-gradient-to-b from-background to-transparent z-10" />

            {/* Dégradé vertical sur le bord inférieur (15% de hauteur) pour une transition douce avec la suite */}
            <div className="absolute inset-x-0 bottom-0 h-[15%] bg-gradient-to-t from-background to-transparent z-10" />
          </div>

          {/* Dégradé global pour la lisibilité sur mobile */}
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/75 to-background/40 lg:hidden" />

          <div className="container mx-auto px-5 sm:px-6 lg:px-0 relative z-20">
            <div className="max-w-4xl lg:max-w-3xl space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-left-6 duration-1000 text-center lg:text-left pt-8 sm:pt-12 lg:pt-0 lg:pl-[80px]">

              {/* Headline */}
              <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.12] sm:leading-[1.1] text-foreground">
                L'union bénie,<br />
                <span className="text-primary italic font-normal">scellée par la foi,</span><br />
                commence ici.
              </h1>

              {/* Description */}
              <p className="text-base sm:text-xl md:text-2xl text-foreground/70 leading-relaxed max-w-xl font-body mx-auto lg:mx-0">
                Rejoignez la communauté de référence pour les célibataires chrétiens d'Afrique et de la diaspora. Un sanctuaire dédié à la vérité et à l'engagement sacré.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-8 pt-2 sm:pt-4 pb-10 lg:pb-0">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 sm:px-10 h-14 sm:h-16 text-base sm:text-lg font-bold rounded-xl w-full sm:w-auto shadow-2xl shadow-primary/20 transition-all hover:scale-105" asChild>
                  <Link href="/login">Chercher son alliance</Link>
                </Button>
                <Link href="/concept" className="text-foreground hover:text-primary font-bold text-base sm:text-lg flex items-center gap-3 group transition-colors">
                  Notre Vision Sacrée
                  <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 sm:py-32 bg-muted relative border-t border-foreground/5">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24 space-y-4">
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-primary italic">L'Art de la Rencontre Chrétienne</h2>
              <div className="w-16 sm:w-20 h-0.5 bg-primary/30 mx-auto rounded-full mt-4 sm:mt-6" />
              <p className="text-foreground/60 text-lg sm:text-xl leading-relaxed mt-4 sm:mt-6">Une plateforme d'exception pour ceux qui placent Dieu au centre de leur projet de vie.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              <div className="p-8 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] bg-card border border-foreground/5 hover:border-primary/20 transition-all duration-500 group shadow-xl">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 sm:mb-8 group-hover:bg-primary transition-colors duration-500">
                  <ScrollText className="w-7 h-7 sm:w-8 sm:h-8 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-headline text-xl sm:text-2xl font-bold mb-4 sm:mb-5 text-foreground">Profil de Foi</h3>
                <p className="text-foreground/50 leading-relaxed text-base sm:text-lg">Un espace pour exprimer votre spiritualité, votre engagement et votre vision de l'autel familial.</p>
              </div>

              <div className="p-8 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] bg-card border border-foreground/5 hover:border-primary/20 transition-all duration-500 group shadow-xl">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 sm:mb-8 group-hover:bg-primary transition-colors duration-500">
                  <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-headline text-xl sm:text-2xl font-bold mb-4 sm:mb-5 text-foreground">Sécurité &amp; confiance</h3>
                <p className="text-foreground/50 leading-relaxed text-base sm:text-lg">La sérénité avant tout. Profils modérés et signalement simple pour des échanges respectueux et apaisés.</p>
              </div>

              <div className="p-8 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] bg-card border border-foreground/5 hover:border-primary/20 transition-all duration-500 group shadow-xl">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 sm:mb-8 group-hover:bg-primary transition-colors duration-500">
                  <Users className="w-7 h-7 sm:w-8 sm:h-8 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-headline text-xl sm:text-2xl font-bold mb-4 sm:mb-5 text-foreground">Élite & Diaspora</h3>
                <p className="text-foreground/50 leading-relaxed text-base sm:text-lg">Accédez à un réseau exclusif de célibataires chrétiens de haut niveau en Afrique et à l'international.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Biblical Quote Section */}
        <section className="py-20 sm:py-40 relative overflow-hidden bg-background border-t border-foreground/5">
           <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]" />

           <div className="container mx-auto px-5 sm:px-6 relative z-10 text-center">
             <div className="max-w-4xl mx-auto space-y-6 sm:space-y-12">
               <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-8">
                 <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-primary fill-primary" />
               </div>
               <h2 className="font-headline text-[1.7rem] leading-snug sm:text-5xl md:text-7xl font-bold text-foreground sm:leading-tight italic">
                 "Ce que Dieu a uni, que l'homme ne le sépare pas."
               </h2>
               <p className="text-lg sm:text-3xl text-primary font-headline tracking-widest uppercase opacity-80">Matthieu 19:6</p>
               <div className="pt-4 sm:pt-8">
                 <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 sm:px-14 h-14 sm:h-20 text-lg sm:text-2xl font-bold rounded-full shadow-2xl shadow-primary/20 transition-transform hover:scale-105 w-full sm:w-auto" asChild>
                   <Link href="/login">Commencer mon histoire</Link>
                 </Button>
               </div>
             </div>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
