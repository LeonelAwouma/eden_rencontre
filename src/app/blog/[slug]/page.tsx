"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, Clock, ArrowLeft, BookOpen, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface BlogPostData {
  id: string; title: string; slug: string; excerpt: string | null; content: string | null;
  cover_image_url: string | null; author: string; reading_time_minutes: number;
  published_at: string | null; view_count: number;
  category: { id: string; name: string; slug: string; color: string } | null;
  tags: { id: string; name: string; slug: string }[];
}

export default function BlogPostPage() {
  const params = useParams();
  const { t, locale } = useI18n();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/blog/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setPost(d.post); setRelated(d.related || []); })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation /><main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-8 bg-card rounded animate-pulse w-3/4" />
          <div className="h-64 bg-card rounded-2xl animate-pulse" />
          <div className="h-4 bg-card rounded animate-pulse" />
        </div>
      </main><Footer />
    </div>
  );

  if (!post) return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation /><main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <BookOpen className="w-16 h-16 mx-auto text-foreground/20" />
          <h1 className="font-headline text-3xl font-bold">{t("blogPost.notFoundTitle")}</h1>
          <Link href="/blog"><Button>{t("blogPost.backToBlog")}</Button></Link>
        </div>
      </main><Footer />
    </div>
  );

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />
      <main className="flex-1">
        <section className="relative py-16 sm:py-24 bg-card">
          <div className="container mx-auto px-4"><div className="max-w-3xl mx-auto">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-accent mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> {t("blogPost.backToBlog")}
            </Link>
            {post.category && <Badge className="mb-4 bg-accent/10 text-accent border-none">{post.category.name}</Badge>}
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/50">
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{post.author}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formattedDate}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{post.reading_time_minutes} min</span>
            </div>
          </div></div>
        </section>

        {post.cover_image_url && (
          <div className="container mx-auto px-4 -mt-8 relative z-20">
            <div className="max-w-4xl mx-auto">
              <div className="relative h-64 sm:h-96 rounded-2xl overflow-hidden shadow-xl">
                <Image src={post.cover_image_url} alt={post.title} fill className="object-cover" />
              </div>
            </div>
          </div>
        )}

        <section className="py-12 sm:py-16 container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {post.excerpt && (
              <p className="text-lg text-foreground/70 leading-relaxed mb-8 italic border-l-4 border-accent pl-4">{post.excerpt}</p>
            )}
            <article className="blog-content prose prose-lg max-w-none" style={{color:"#2F2F2F",lineHeight:"1.8"}}
              dangerouslySetInnerHTML={{ __html: post.content || "" }} />
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-10 pt-8 border-t border-foreground/10">
                <Tag className="w-4 h-4 text-foreground/40" />
                {post.tags.map((t: any) => <Badge key={t.id} variant="outline" className="text-xs">{t.name}</Badge>)}
              </div>
            )}
          </div>
        </section>

        {related.length > 0 && (
          <section className="py-16 bg-card border-t border-foreground/5">
            <div className="container mx-auto px-4">
              <h2 className="font-headline text-2xl font-bold text-center mb-10">{t("blogPost.similarArticles")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {related.map((r: any) => (
                  <Link key={r.id} href={`/blog/${r.slug}`}>
                    <Card className="group overflow-hidden border-foreground/5 bg-background hover:border-accent/30 transition-all h-full">
                      {r.cover_image_url && (
                        <div className="relative h-40 overflow-hidden">
                          <Image src={r.cover_image_url} alt={r.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-headline text-base font-bold mb-2 group-hover:text-accent line-clamp-2">{r.title}</h3>
                        <div className="flex items-center gap-2 mt-2 text-xs text-foreground/40">
                          <Clock className="w-3 h-3" />{r.reading_time_minutes} min
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

