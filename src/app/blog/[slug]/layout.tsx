import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { pageMetadata } from "@/lib/site";

// Métadonnées de chaque article (la page est un composant client) : titre,
// extrait et image de couverture pour Google et les aperçus WhatsApp / Facebook.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const path = `/blog/${slug}`;
  try {
    const { data: post } = await getSupabaseAdmin().from("blog_posts")
      .select("title, excerpt, cover_image_url, author, published_at, updated_at")
      .eq("slug", slug).eq("status", "published").maybeSingle();
    if (!post) return pageMetadata({ path, title: "Article introuvable", description: "Cet article n'existe pas ou n'est plus publié.", noindex: true });
    const meta = pageMetadata({
      path, type: "article", title: post.title,
      description: post.excerpt || "Un article du blog Garden of Alliance.",
      image: post.cover_image_url ? { url: post.cover_image_url, alt: post.title } : null,
    });
    return {
      ...meta,
      authors: post.author ? [{ name: post.author }] : undefined,
      openGraph: { ...meta.openGraph, type: "article", publishedTime: post.published_at || undefined, modifiedTime: post.updated_at || undefined },
    };
  } catch {
    return pageMetadata({ path, title: "Blog", description: "Un article du blog Garden of Alliance." });
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
