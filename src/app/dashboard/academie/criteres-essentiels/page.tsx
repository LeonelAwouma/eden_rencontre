
"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  BookOpen, 
  Quote, 
  CheckCircle2, 
  Lightbulb,
  Heart,
  ChevronRight,
  Flame,
  Scale,
  Compass,
  ShieldCheck,
  Eye,
  Users,
  HandHeart
} from "lucide-react";
import { Monogram } from "@/components/ornaments";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CriteresEssentielsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-card border-b border-secondary/15 px-6 h-20 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Monogram className="w-9 h-8 text-primary shrink-0" />
          <span className="font-headline text-2xl font-bold text-foreground">Eden <span className="text-primary italic font-normal">Rencontre</span></span>
        </Link>
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground gap-2 hover:bg-foreground/5 hover:text-secondary">
          <ArrowLeft className="w-4 h-4" /> Retour au Dashboard
        </Button>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-4xl space-y-16">
        {/* Header Section */}
        <section className="text-center space-y-6">
          <div className="flex justify-center mb-4">
             <Badge className="bg-secondary/10 text-secondary border-none font-bold px-6 py-1.5 uppercase tracking-[0.2em] text-[10px] rounded-full">
               Académie du Mariage
             </Badge>
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-bold text-foreground leading-tight">
            Les Critères Essentiels du Choix
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Le choix d'un conjoint est l'une des décisions les plus importantes de la vie d'un croyant. Apprenez à bâtir sur le Roc.
          </p>
        </section>

        {/* Intro Card - Premium Dark */}
        <Card className="border-none shadow-2xl rounded-2xl overflow-hidden bg-muted text-foreground">
          <CardContent className="p-12 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-secondary">
                <Scale className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Une alliance pour l'éternité</h2>
              </div>
              <p className="text-foreground/75 leading-relaxed text-lg">
                La Bible et la sagesse chrétienne suggèrent plusieurs critères fondamentaux pour bâtir un foyer solide. Voici une synthèse pour vous guider dans votre discernement.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Criteria Grid */}
        <div className="space-y-10">
          <div className="grid grid-cols-1 gap-8">
            {[
              { 
                title: "1. La fondation spirituelle", 
                content: "Le critère numéro un est le partage d'une **foi commune et active**. Veillez au 'Joug Égal' (2 Cor 6:14) et observez les fruits de l'Esprit dans sa vie.",
                icon: Compass,
                details: "Est-ce que cette personne cherche Dieu par elle-même ?"
              },
              { 
                title: "2. Le caractère et l'intégrité", 
                content: "La beauté est passagère, le caractère demeure. Recherchez **l'honnêteté, l'humilité** et la capacité de demander pardon.",
                icon: ShieldCheck,
                details: "Regardez comment elle traite ceux qui ne peuvent rien lui apporter."
              },
              { 
                title: "3. La vision commune", 
                content: "Deux hommes marchent-ils ensemble sans en être convenus ? Assurez-vous d'être sur la même longueur d'onde sur **l'appel, la famille et les finances**.",
                icon: Eye,
                details: "L'argent est l'une des premières causes de conflit."
              },
              { 
                title: "4. La compatibilité relationnelle", 
                content: "Le conjoint doit être votre **meilleur ami**. Pouvez-vous parler de tout avec respect ? L'amitié est le ciment de l'alliance.",
                icon: Heart,
                details: "L'attirance physique est un cadeau, mais l'amitié dure."
              },
              { 
                title: "5. L'approbation de la communauté", 
                content: "Dieu parle souvent à travers les autres. Que pensent vos **mentors et parents spirituels** de cette relation ?",
                icon: Users,
                details: "Si tout votre entourage émet des réserves, c'est un signal d'alarme."
              },
              { 
                title: "6. La capacité au sacrifice (Agape)", 
                content: "Le mariage chrétien est une image de Christ et de l'Église. Recherchez quelqu'un prêt au **don de soi** et à la loyauté.",
                icon: HandHeart,
                details: "L'amour n'est pas qu'un sentiment, c'est un choix."
              }
            ].map((item, i) => (
              <Card key={i} className="border-none shadow-sm rounded-3xl overflow-hidden bg-card hover:shadow-md transition-all">
                <div className="p-8 flex gap-6">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center text-secondary shrink-0">
                    <item.icon className="w-8 h-8" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-bold text-2xl text-foreground">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: item.content.replace(/\*\*(.*?)\*\*/g, '<span class="text-foreground font-bold">$1</span>') }} />
                    <div className="bg-foreground/5 p-4 rounded-xl flex items-center gap-3">
                      <Lightbulb className="w-4 h-4 text-secondary" />
                      <p className="text-xs font-medium text-foreground/70 italic">{item.details}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Conclusion Card */}
        <Card className="border-none bg-secondary/10 rounded-2xl p-12 space-y-6">
          <div className="flex items-center gap-3 text-secondary mb-4">
            <Quote className="w-6 h-6" />
            <h3 className="text-xl font-bold uppercase tracking-widest">Conseil Pratique</h3>
          </div>
          <p className="text-xl text-foreground/80 leading-relaxed">
            Ne cherchez pas la **"personne parfaite"**, car elle n'existe pas. Cherchez plutôt une personne qui court dans la même direction que vous, vers le Christ, et avec qui vous pourrez grandir et vous sanctifier mutuellement.
          </p>
        </Card>

        {/* Final Prayer Card */}
        <Card className="border-none bg-card text-foreground rounded-2xl p-16 text-center space-y-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full -ml-24 -mb-24" />
          
          <div className="space-y-6 relative z-10">
            <Badge className="bg-secondary/15 text-secondary border-none px-6 py-1.5 rounded-full font-bold uppercase tracking-widest text-[10px]">
              Prière Suggérée
            </Badge>
            <p className="text-2xl md:text-3xl font-headline italic leading-relaxed text-foreground">
              « Seigneur, aide-moi à devenir d'abord la personne que le conjoint que je recherche mérite de trouver. Donne-moi le discernement pour voir au-delà des apparences et la patience d'attendre Ton temps. Amen. »
            </p>
          </div>
        </Card>

        {/* Bottom CTA */}
        <div className="text-center pt-8">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/academie')}
            className="border-secondary/20 text-muted-foreground hover:text-secondary hover:bg-foreground/5 rounded-2xl h-16 px-12 gap-3 transition-all font-bold text-lg"
          >
            Terminer la lecture <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
