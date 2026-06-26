
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
  HandHeart,
  Clock,
  Zap
} from "lucide-react";
import { Monogram } from "@/components/ornaments";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PeriodeConnaissancePage() {
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
            Réussir la période de connaissance
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Naviguer dans le "courtship" avec sagesse, pureté et clarté spirituelle.
          </p>
        </section>

        {/* Intro Card */}
        <Card className="border-none shadow-2xl rounded-2xl overflow-hidden bg-muted text-foreground">
          <CardContent className="p-12 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-secondary">
                <Clock className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Un temps de discernement actif</h2>
              </div>
              <p className="text-foreground/75 leading-relaxed text-lg">
                La période de connaissance (souvent appelée "fréquentations" ou "courtship") est une étape charnière. Ce n'est plus simplement de l'amitié, mais ce n'est pas encore l'engagement du mariage. C'est un temps de discernement.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Content Steps */}
        <div className="space-y-10">
          <div className="grid grid-cols-1 gap-8">
            {[
              { 
                title: "1. Définir l'intention dès le départ", 
                content: "Dans une perspective chrétienne, on ne 'sort' pas avec quelqu'un juste pour passer le temps. Il est important d'être au clair sur le fait que l'objectif est d'**évaluer la possibilité d'un mariage**.",
                icon: Zap,
                details: "Ne vous précipitez pas. Observez la personne dans la joie et le stress."
              },
              { 
                title: "2. Privilégier la connexion intellectuelle et spirituelle", 
                content: "Le piège classique est de laisser l'attirance physique prendre toute la place. Abordez les sujets profonds : la foi, l'argent, l'éducation, les blessures du passé.",
                icon: Compass,
                details: "Priez ensemble, mais gardez une réserve pour ne pas brouiller le jugement."
              },
              { 
                title: "3. Fixer des limites saines (La Pureté)", 
                content: "La pureté est une protection pour votre cœur. Discutez des **limites physiques** dès le début pour éviter les zones de flou. Évitez de vous comporter comme si vous étiez déjà mariés.",
                icon: ShieldCheck,
                details: "L'objectif est d'honorer Dieu et l'autre."
              },
              { 
                title: "4. Ne pas rester 'dans une bulle'", 
                content: "L'isolement est un danger. Présentez l'autre à vos **amis de confiance et à votre famille**. Continuez d'être actifs dans votre église locale.",
                icon: Users,
                details: "Si vos mentors ont des doutes, écoutez-les attentivement."
              },
              { 
                title: "5. Observer le 'vrai' caractère", 
                content: "Il est facile de porter un masque au début. Variez les contextes : faites du service ensemble, du sport, ou rendez visite à des familles. Comment gérez-vous votre premier désaccord ?",
                icon: Eye,
                details: "Le test de la réalité révèle les fruits de l'Esprit."
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

        {/* Questions Section */}
        <Card className="border-none bg-secondary/10 rounded-2xl p-12 space-y-8">
          <div className="flex items-center gap-3 text-secondary">
            <Quote className="w-6 h-6" />
            <h3 className="text-xl font-bold uppercase tracking-widest">Questions à se poser seul(e)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              "Est-ce que cette personne m'encourage à aimer Dieu davantage ?",
              "Est-ce que je peux lui faire confiance sur mes points vulnérables ?",
              "Est-ce que je l'aime pour ce qu'elle est vraiment, ou pour son potentiel ?",
              "Avons-nous la même vision du service et de l'Église ?"
            ].map((q, i) => (
              <div key={i} className="flex gap-4 items-start">
                <CheckCircle2 className="w-5 h-5 text-secondary mt-1 shrink-0" />
                <p className="text-foreground/80 font-medium">{q}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Conclusion Advice */}
        <section className="space-y-8">
           <Card className="border-none bg-muted text-foreground rounded-2xl p-12">
            <h3 className="text-2xl font-bold text-secondary mb-6">Savoir s'arrêter si nécessaire</h3>
            <p className="text-foreground/75 leading-relaxed text-lg">
              Réussir une période de connaissance, ce n'est pas forcément finir par un mariage. C'est réussir à **discerner la volonté de Dieu**. Rompre pendant cette période n'est pas un échec, c'est une victoire du discernement. Il vaut mieux une rupture honnête qu'un mariage fragile.
            </p>
          </Card>
        </section>

        {/* Golden Rule */}
        <Card className="border-none bg-card text-foreground rounded-2xl p-16 text-center space-y-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full -mr-32 -mt-32" />
          <div className="space-y-6 relative z-10">
            <Badge className="bg-secondary/15 text-secondary border-none px-6 py-1.5 rounded-full font-bold uppercase tracking-widest text-[10px]">
              Le conseil d'or
            </Badge>
            <p className="text-2xl md:text-3xl font-headline italic leading-relaxed text-foreground">
              « Gardez votre garde-fou spirituel. Si la relation vous éloigne de votre vie de prière ou de vos responsabilités, c'est un signal d'alarme. Une relation bénie apporte de la clarté. »
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
