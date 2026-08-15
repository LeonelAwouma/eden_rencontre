
"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, User, ArrowRight, Search, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { generateBlogIdeas, type GenerateBlogIdeasOutput } from "@/ai/flows/generate-blog-ideas-flow";
import { useToast } from "@/hooks/use-toast";

interface BlogPostItem {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; author: string; reading_time_minutes: number;
  published_at: string | null;
  category: { id: string; name: string; slug: string; color: string } | null;
}

export default function BlogPage() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<GenerateBlogIdeasOutput | null>(null);
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedCategory !== "all") p.set("category", selectedCategory);
    if (searchQuery) p.set("search", searchQuery);
    p.set("limit", "12");
    fetch(`/api/blog?${p}`)
      .then(r => r.json())
      .then(d => { setPosts(d.posts || []); setCategories(d.categories || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCategory, searchQuery]);

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <h2 className="font-headline text-3xl font-bold">Articles Récents</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-card border-none" />
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10">
              <Badge onClick={() => setSelectedCategory("all")} className={`cursor-pointer ${selectedCategory==="all" ? "bg-accent text-background" : "bg-card text-foreground/60 hover:bg-accent/10"} border-none`}>Tous</Badge>
              {categories.map((c: any) => (
                <Badge key={c.id} onClick={() => setSelectedCategory(c.slug)} className={`cursor-pointer ${selectedCategory===c.slug ? "bg-accent text-background" : "bg-card text-foreground/60 hover:bg-accent/10"} border-none`}>{c.name}</Badge>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => <div key={i} className="h-80 bg-card rounded-2xl animate-pulse" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto text-foreground/20 mb-4" />
              <p className="text-foreground/50">Aucun article trouvé.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <Card className="group overflow-hidden border-foreground/5 bg-card hover:border-accent/30 transition-all flex flex-col h-full">
                    <div className="relative h-56 overflow-hidden">
                      {post.cover_image_url ? (
                        <Image src={post.cover_image_url} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-card flex items-center justify-center"><BookOpen className="w-12 h-12 text-foreground/20" /></div>
                      )}
                      {post.category && (
                        <Badge className="absolute top-4 left-4 bg-background/80 backdrop-blur-md text-foreground border-none">{post.category.name}</Badge>
                      )}
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-4 text-xs text-foreground/40 mb-4">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.published_at ? new Date(post.published_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : ""}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.reading_time_minutes} min</span>
                      </div>
                      <h3 className="font-headline text-2xl font-bold text-foreground mb-4 group-hover:text-accent transition-colors line-clamp-2">{post.title}</h3>
                      <p className="text-foreground/60 text-sm leading-relaxed mb-6 line-clamp-3">{post.excerpt}</p>
                      <Button variant="link" className="mt-auto p-0 text-accent hover:text-accent/80 justify-start gap-2">Lire la suite <ArrowRight className="w-4 h-4" /></Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
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
