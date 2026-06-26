
"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  BookOpen, 
  Quote, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb,
  Heart,
  Church,
  Calendar,
  ChevronRight,
  Flame,
  Scale
} from "lucide-react";
import { Monogram } from "@/components/ornaments";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DiscernementPage() {
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
            La Prière de Discernement
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Un guide spirituel pour apprendre à écouter la voix de Dieu avant de s'engager sur le chemin de l'alliance.
          </p>
        </section>

        {/* Intro Card - Premium Dark */}
        <Card className="border-none shadow-2xl rounded-2xl overflow-hidden bg-muted text-foreground">
          <CardContent className="p-12 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-secondary">
                <Flame className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Qu'est-ce que le discernement chrétien ?</h2>
              </div>
              <p className="text-foreground/75 leading-relaxed text-lg">
                Le discernement est l'art de <span className="text-foreground font-bold">chercher la volonté de Dieu</span> avant de prendre une décision importante. Il ne s'agit pas d'un rituel magique, mais d'une disposition intérieure d'écoute et de confiance en Dieu.
              </p>
            </div>

            <div className="bg-foreground/5 border-l-4 border-secondary p-8 rounded-r-3xl italic text-foreground/85 relative">
              <Quote className="absolute top-4 right-4 w-12 h-12 text-secondary/10" />
              <p className="text-2xl font-headline leading-relaxed">
                "Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse ; reconnais-le dans toutes tes voies, et il aplanira tes sentiers."
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="h-px bg-primary w-8" />
                <p className="text-xs font-bold text-secondary uppercase tracking-widest">Proverbes 3:5-6</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* When Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-xl rounded-2xl bg-card p-8">
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-4">Quand pratiquer ?</h3>
            <ul className="space-y-4">
              {[
                "Mariage ou engagement relationnel",
                "Choix de carrière important",
                "Déménagement ou lieu de vie",
                "Besoin pressant de guidance divine"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-muted-foreground text-sm">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" /> {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-none shadow-xl rounded-2xl bg-muted p-8 text-foreground">
            <div className="w-12 h-12 bg-foreground/5 rounded-2xl flex items-center justify-center mb-6">
              <Lightbulb className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-bold mb-4">Les Signes de Paix</h3>
            <p className="text-foreground/60 text-sm leading-relaxed mb-6">
              Le discernement apporte une clarté intérieure. Si une décision vous cause une angoisse persistante malgré la prière, prenez le temps de questionner vos motivations.
            </p>
            <Separator className="bg-foreground/5 mb-6" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Conseil Eden</p>
          </Card>
        </div>

        {/* Practical Steps */}
        <div className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-headline font-bold text-foreground">Les étapes pratiques</h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {[
              { 
                step: "01", 
                title: "Se disposer intérieurement", 
                content: "Commencez par un temps de **silence et de recueillement**. Écartez les distractions. Demandez à l'Esprit Saint de purifier vos motivations et de vous ouvrir à sa volonté.",
                icon: Flame
              },
              { 
                step: "02", 
                title: "Lire la Parole", 
                content: "Ouvrez la Bible et lisez des passages liés à votre situation. La Parole de Dieu est une lampe pour nos pas (Psaume 119:105). Laissez un verset vous interpeller.",
                icon: BookOpen
              },
              { 
                step: "03", 
                title: "Prier explicitement", 
                content: "Adressez-vous à Dieu avec simplicité : 'Seigneur, je ne veux pas ma volonté, mais la tienne. Éclaire mon chemin, ferme les portes que tu ne veux pas.'",
                icon: Church
              },
              { 
                step: "04", 
                title: "Chercher les confirmations", 
                content: "Dieu confirme sa volonté par la paix intérieure, les circonstances, et le conseil de chrétiens matures et bienveillants.",
                icon: CheckCircle2
              }
            ].map((item) => (
              <Card key={item.step} className="border-none shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all bg-card">
                <div className="flex">
                  <div className="w-24 bg-muted flex items-center justify-center text-secondary text-3xl font-black shrink-0">
                    {item.step}
                  </div>
                  <div className="p-8 space-y-3">
                    <h3 className="font-bold text-xl text-foreground flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-secondary" /> {item.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{item.content}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-headline font-bold text-foreground">Signes de discernement</h2>
            <p className="text-muted-foreground">Apprendre à différencier la voix de Dieu de nos propres désirs.</p>
          </div>
          <div className="bg-muted rounded-2xl overflow-hidden shadow-2xl border-none">
            <Table>
              <TableHeader className="bg-foreground/5">
                <TableRow className="border-foreground/5 hover:bg-transparent">
                  <TableHead className="font-bold text-secondary h-16 px-10">Signe positif ✅</TableHead>
                  <TableHead className="font-bold text-secondary h-16 px-10">Signe d'alerte ⚠️</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { pos: "Paix profonde malgré l'incertitude", neg: "Agitation, précipitation" },
                  { pos: "Confirmations convergentes", neg: "Contradiction avec la Parole" },
                  { pos: "Ouverture des circonstances", neg: "Avis négatif de conseillers sages" },
                  { pos: "Fruit spirituel anticipé", neg: "Motivations égoïstes ou impures" }
                ].map((row, i) => (
                  <TableRow key={i} className="border-foreground/5 hover:bg-foreground/5">
                    <TableCell className="px-10 py-6 text-foreground/85 font-medium">{row.pos}</TableCell>
                    <TableCell className="px-10 py-6 text-foreground/60 italic">{row.neg}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Final Prayer Card */}
        <Card className="border-none bg-card text-foreground rounded-2xl p-16 text-center space-y-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full -ml-24 -mb-24" />
          
          <div className="space-y-6 relative z-10">
            <Badge className="bg-secondary/15 text-secondary border-none px-6 py-1.5 rounded-full font-bold uppercase tracking-widest text-[10px]">
              Prière de remise
            </Badge>
            <p className="text-3xl md:text-4xl font-headline italic leading-relaxed text-foreground">
              "Père, je te remets cette décision. Tu connais le début et la fin. Je choisis de te faire confiance plutôt qu'à mes propres calculs. Que ta volonté soit faite. Amen."
            </p>
          </div>
          
          <Separator className="bg-foreground/10" />
          
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-center gap-2 text-secondary">
              <Scale className="w-5 h-5" />
              <h4 className="font-bold uppercase tracking-[0.2em] text-xs">Le mot de la fin</h4>
            </div>
            <p className="text-foreground/60 text-sm max-w-xl mx-auto leading-relaxed">
              Le discernement chrétien n'est pas une formule à exécuter, mais une **relation à entretenir**. Plus vous marchez avec Dieu au quotidien, plus vous reconnaîtrez sa voix.
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
