
"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, User, ArrowRight, Search, Clock, CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader, GardenIllustration } from "@/components/garden";
import { useI18n } from "@/lib/i18n";
import { getMyAccountStatus } from "@/lib/auth";

interface BlogPostItem {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; author: string; reading_time_minutes: number;
  published_at: string | null;
  category: { id: string; name: string; slug: string; color: string } | null;
}

export default function BlogPage() {
  const { t, locale } = useI18n();
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  // Newsletter : les membres approuvés sont abonnés d'office, les visiteurs s'inscrivent avec leur e-mail.
  const [isMember, setIsMember] = useState(false);
  const [nlEmail, setNlEmail] = useState("");
  const [nlTrap, setNlTrap] = useState("");
  const [nlState, setNlState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [nlError, setNlError] = useState("");

  useEffect(() => {
    getMyAccountStatus().then(s => setIsMember(s?.status === "approved")).catch(() => {});
  }, []);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setNlState("loading"); setNlError("");
    try {
      const res = await fetch("/api/blog/newsletter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nlEmail, website: nlTrap }),
      });
      if (res.ok) { setNlState("done"); return; }
      const d = await res.json().catch(() => ({}));
      setNlError(t(d.error === "invalid_email" ? "blog.newsletterInvalidEmail" : d.error === "rate_limited" ? "blog.newsletterRateLimited" : "blog.newsletterError"));
      setNlState("error");
    } catch { setNlError(t("blog.newsletterError")); setNlState("error"); }
  };

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

  return (
    <div className="eden-public flex flex-col min-h-screen bg-background">
      <Navigation />
      
      <main className="flex-1">
        {/* ═══ Hero ═══ */}
        <section className="relative py-14 sm:py-20 overflow-hidden">

          <div className="container mx-auto px-4 sm:px-6 relative z-20">
            <PageHeader
              eyebrow={t("blog.eyebrow")}
              title={t("blog.pageTitle")}
              subtitle={t("blog.pageSubtitle")}
            />

            <GardenIllustration
              src="/image_four_garden.webp"
              placement="hero-frame"
              opacity={0.85}
              fringe="none"
              width={1254}
              height={1254}
              className="w-[85vw] sm:w-[55vw] lg:w-[640px] mx-auto mt-10 sm:mt-14"
            />
          </div>

          <div className="absolute bottom-0 left-0 right-0 eden-hairline z-20" aria-hidden="true" />
        </section>

        {/* Blog Posts Grid */}
        <section className="py-16 container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <h2 className="font-headline text-3xl font-bold">{t("blog.title")} {t("blog.titleHighlight")}</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <Input placeholder={t("blog.searchPlaceholder")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-card border border-sage/25 rounded-xl focus-visible:ring-primary/30" />
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10">
              <Badge onClick={() => setSelectedCategory("all")} className={`cursor-pointer ${selectedCategory==="all" ? "bg-deep-eden text-background" : "bg-card text-foreground/60 hover:bg-accent/10"} border-none`}>{t("blog.allCategories")}</Badge>
              {categories.map((c: any) => (
                <Badge key={c.id} onClick={() => setSelectedCategory(c.slug)} className={`cursor-pointer ${selectedCategory===c.slug ? "bg-deep-eden text-background" : "bg-card text-foreground/60 hover:bg-accent/10"} border-none`}>{c.name}</Badge>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => <div key={i} className="h-80 rounded-2xl animate-pulse bg-muted/70" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto text-foreground/20 mb-4" />
              <p className="text-foreground/50">{t("blog.noArticles")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <Card className="eden-leaf-card group overflow-hidden border-none shadow-none bg-transparent flex flex-col h-full">
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
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.published_at ? new Date(post.published_at).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : ""}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t("blog.readTime", {min: post.reading_time_minutes})}</span>
                      </div>
                      <h3 className="font-headline text-2xl font-bold text-foreground mb-4 group-hover:text-accent transition-colors line-clamp-2">{post.title}</h3>
                      <p className="text-foreground/60 text-sm leading-relaxed mb-6 line-clamp-3">{post.excerpt}</p>
                      <Button variant="link" className="mt-auto p-0 text-accent hover:text-accent/80 justify-start gap-2">{t("blog.readMore")} <ArrowRight className="w-4 h-4" /></Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Newsletter */}
        <section className="py-16 bg-card border-y border-foreground/5">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <BookOpen className="w-8 h-8 text-accent" />
            </div>
            <h2 className="font-headline text-4xl font-bold mb-6">{t("blog.newsletterTitle")}</h2>
            <p className="text-lg text-foreground/60 mb-10">
              {t("blog.newsletterDesc")}
            </p>
            {isMember || nlState === "done" ? (
              <div className="flex items-start sm:items-center justify-center gap-3 rounded-xl bg-background border border-sage/25 px-6 py-5 text-left sm:text-center" role="status">
                <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-foreground/80">{t(isMember ? "blog.newsletterMember" : "blog.newsletterSuccess")}</p>
              </div>
            ) : (
              <form onSubmit={subscribe} className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input value={nlEmail} onChange={e => setNlEmail(e.target.value)} placeholder={t("blog.emailPlaceholder")}
                    aria-label={t("blog.emailPlaceholder")} className="h-14 bg-background border-foreground/10" required type="email" autoComplete="email" />
                  {/* Champ piège pour les robots, invisible pour les visiteurs. */}
                  <input type="text" name="website" value={nlTrap} onChange={e => setNlTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                  <Button type="submit" size="lg" disabled={nlState === "loading"} className="bg-deep-eden hover:bg-deep-eden/90 text-background font-bold h-14 px-8 shrink-0">
                    {nlState === "loading" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t("blog.subscribe")}
                  </Button>
                </div>
                {nlState === "error" && <p className="text-sm text-destructive" role="alert">{nlError}</p>}
                <p className="text-xs text-foreground/50">{t("blog.newsletterNote")}</p>
              </form>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
