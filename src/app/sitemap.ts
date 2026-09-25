import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// /sitemap.xml : pages publiques + articles du blog et ressources publiées.
// Régénéré au plus toutes les heures.
export const revalidate = 3600;

const STATIC_PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/concept", priority: 0.8, changeFrequency: "monthly" },
  { path: "/parcours", priority: 0.8, changeFrequency: "monthly" },
  { path: "/tarifs", priority: 0.8, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.8, changeFrequency: "daily" },
  { path: "/mediatheque", priority: 0.7, changeFrequency: "weekly" },
  { path: "/temoignages", priority: 0.7, changeFrequency: "weekly" },
  { path: "/charte", priority: 0.6, changeFrequency: "yearly" },
  { path: "/securite", priority: 0.6, changeFrequency: "yearly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/register", priority: 0.6, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/cgu", priority: 0.3, changeFrequency: "yearly" },
  { path: "/mentions", priority: 0.3, changeFrequency: "yearly" },
  { path: "/confidentialite", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path === "/" ? "" : p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  try {
    const db = getSupabaseAdmin();
    const [posts, resources] = await Promise.all([
      db.from("blog_posts").select("slug, updated_at, published_at").eq("status", "published"),
      db.from("mediatheque_resources").select("slug, updated_at, published_at").eq("status", "published"),
    ]);
    for (const p of posts.data || []) {
      entries.push({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updated_at || p.published_at || undefined, changeFrequency: "monthly", priority: 0.6 });
    }
    for (const r of resources.data || []) {
      entries.push({ url: `${SITE_URL}/mediatheque/${r.slug}`, lastModified: r.updated_at || r.published_at || undefined, changeFrequency: "monthly", priority: 0.5 });
    }
  } catch (err) {
    console.error("[sitemap] contenus dynamiques indisponibles :", err);
  }
  return entries;
}
