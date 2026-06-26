
"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, User, ArrowRight, Search } from "lucide-react";
import Image from "next/image";
import { generateBlogIdeas, type GenerateBlogIdeasOutput } from "@/ai/flows/generate-blog-ideas-flow";
import { useToast } from "@/hooks/use-toast";

export default function BlogPage() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<GenerateBlogIdeasOutput | null>(null);

  const posts = [
    {
      id: 1,
      title: "Les 5 piliers d'un foyer fondé sur le Roc",
      excerpt: "Découvrez comment la prière, la communication et le respect mutuel forment la base inébranlable d'une alliance bénie.",
      author: "Pasteur Samuel K.",
      date: "12 Mai 2024",
      category: "Mariage",
      image: "https://picsum.photos/seed/blog1/800/500"
    },
    {
      id: 2,
      title: "Célibat et Foi : Une saison de préparation",
      excerpt: "Le célibat n'est pas une attente passive, mais un temps sacré pour cultiver sa relation avec Dieu et se préparer à l'union.",
      author: "Sœur Esther M.",
      date: "8 Mai 2024",
      category: "Célibat",
      image: "https://picsum.photos/seed/blog2/800/500"
    },
    {
      id: 3,
      title: "Gérer les conflits dans le couple selon la Bible",
      excerpt: "L'art du pardon et de la réconciliation : comment transformer les épreuves en opportunités de croissance spirituelle.",
      author: "Dr. Jean-Pierre N.",
      date: "1 Mai 2024",
      category: "Vie de Couple",
      image: "https://picsum.photos/seed/blog3/800/500"
    }
  ];

  async function handleGenerateIdeas() {
    if (!topic.trim()) {
      toast({
        title: "Champ requis",
        description: "Veuillez entrer un sujet pour générer des idées.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateBlogIdeas({ topic });
      setAiIdeas(result);
      toast({
        title: "Idées générées !",
        description: "L'IA a préparé des pistes de réflexion pour vous.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer les idées pour le moment.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 bg-card overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <Image 
              src="https://picsum.photos/seed/blog-hero/1200/800"
              alt="Background"
              fill
              className="object-cover"
              data-ai-hint="bible study"
            />
          </div>
          <div className="container mx-auto px-4 relative z-10 text-center space-y-6">
            <Badge className="bg-accent text-background border-none px-4 py-1">Édification</Badge>
            <h1 className="font-headline text-5xl md:text-6xl font-bold text-foreground">Le Blog d'Eden</h1>
            <p className="text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed">
              Conseils bibliques, témoignages inspirants et réflexions pour bâtir des foyers chrétiens solides.
            </p>
          </div>
        </section>

        {/* AI Ideas Section */}
        <section className="py-16 bg-accent/5">
          <div className="container mx-auto px-4">
            <Card className="max-w-4xl mx-auto border-accent/20 bg-background/50 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="text-accent" />
                </div>
                <CardTitle className="font-headline text-2xl">Assistant d'Étude Biblique (IA)</CardTitle>
                <p className="text-foreground/60 text-sm">Entrez un sujet (ex: "le pardon dans le couple") pour recevoir des pistes de réflexion personnalisées.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <Input 
                    placeholder="Sujet de réflexion..." 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="bg-background border-foreground/10"
                  />
                  <Button 
                    onClick={handleGenerateIdeas} 
                    disabled={isGenerating}
                    className="bg-accent text-background font-bold px-8"
                  >
                    {isGenerating ? "Génération..." : "Générer des pistes"}
                  </Button>
                </div>

                {aiIdeas && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 animate-in fade-in slide-in-from-bottom-4">
                    {aiIdeas.ideas.map((idea, index) => (
                      <Card key={index} className="bg-card/50 border-foreground/5">
                        <CardHeader>
                          <CardTitle className="text-lg text-accent">{idea.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-foreground/70">{idea.description}</p>
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase text-foreground/40">Points clés :</p>
                            <ul className="text-xs text-foreground/60 list-disc pl-4 space-y-1">
                              {idea.outline.map((point, pIdx) => (
                                <li key={pIdx}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-24 container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="font-headline text-3xl font-bold">Articles Récents</h2>
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <Input placeholder="Rechercher..." className="pl-10 bg-card border-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Card key={post.id} className="group overflow-hidden border-foreground/5 bg-card hover:border-accent/30 transition-all flex flex-col">
                <div className="relative h-56 overflow-hidden">
                  <Image 
                    src={post.image} 
                    alt={post.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <Badge className="absolute top-4 left-4 bg-background/80 backdrop-blur-md text-foreground border-none">
                    {post.category}
                  </Badge>
                </div>
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 text-xs text-foreground/40 mb-4">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {post.author}</span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-foreground mb-4 group-hover:text-accent transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-foreground/60 text-sm leading-relaxed mb-6 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <Button variant="link" className="mt-auto p-0 text-accent hover:text-accent/80 justify-start gap-2">
                    Lire la suite <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-24 bg-card border-y border-foreground/5">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <BookOpen className="w-8 h-8 text-accent" />
            </div>
            <h2 className="font-headline text-4xl font-bold mb-6">Restez Édifié</h2>
            <p className="text-lg text-foreground/60 mb-10">
              Recevez chaque semaine nos meilleurs conseils et méditations directement dans votre boîte mail.
            </p>
            <form className="flex flex-col sm:flex-row gap-4">
              <Input placeholder="votre@email.com" className="h-14 bg-background border-foreground/10" required type="email" />
              <Button size="lg" className="bg-accent text-background font-bold h-14 px-8 shrink-0">
                S'abonner
              </Button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
