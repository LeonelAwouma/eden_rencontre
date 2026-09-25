import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { pageMetadata } from "@/lib/site";

// Métadonnées de chaque ressource de la médiathèque (la page est un composant client).
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const path = `/mediatheque/${slug}`;
  try {
    const { data: r } = await getSupabaseAdmin().from("mediatheque_resources")
      .select("title, description, cover_url, thumbnail_url")
      .eq("slug", slug).eq("status", "published").maybeSingle();
    if (!r) return pageMetadata({ path, title: "Ressource introuvable", description: "Cette ressource n'existe pas ou n'est plus publiée.", noindex: true });
    const img = r.cover_url || r.thumbnail_url;
    return pageMetadata({
      path, title: r.title,
      description: r.description || "Une ressource de la médiathèque Garden of Alliance.",
      image: img ? { url: img, alt: r.title } : null,
    });
  } catch {
    return pageMetadata({ path, title: "Médiathèque", description: "Une ressource de la médiathèque Garden of Alliance." });
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
