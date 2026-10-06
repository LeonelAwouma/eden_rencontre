"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Video, Headphones, BookOpen, FileText, File, Heart, Clock, User, Star,
  CheckCircle, Play, ExternalLink, Library, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { RESOURCE_TYPE_CONFIG, LEVEL_CONFIG, type ResourceType, type ResourceLevel } from "@/lib/mediatheque";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

interface Resource {
  id: string; title: string; slug: string; description: string; content: string | null;
  type: ResourceType; author: string | null; source: string | null;
  file_url: string | null; external_url: string | null;
  thumbnail_url: string | null; cover_url: string | null;
  duration: string | null; page_count: number | null; level: ResourceLevel;
  language: string; target_audience: string | null; featured: boolean; view_count: number;
  category: { id: string; name: string; slug: string; icon: string | null; color: string } | null;
  tags: { id: string; name: string; slug: string }[];
}

function extractEmbedUrl(url: string): { type: string; embedUrl: string } | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  return null;
}

export default function ResourceDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t } = useI18n();
  const [resource, setResource] = useState<Resource | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getSession().then(u => { if (u?.id) setUserId(u.id); });
  }, []);

  const fetchResource = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/mediatheque/${slug}`);
      const d = await r.json();
      if (r.ok) { setResource(d.resource); setRelated(d.related || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { fetchResource(); }, [fetchResource]);

  useEffect(() => {
    if (!userId || !resource || !supabase) return;
    (async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) return;
      const headers = { Authorization: `Bearer ${session.access_token}` };
      fetch(`/api/mediatheque/progress?resource_id=${resource!.id}`, { headers })
        .then(r => r.json()).then(d => { if (d.progress?.status === "completed") setCompleted(true); }).catch(() => {});
      fetch(`/api/mediatheque/favorites`, { headers })
        .then(r => r.json()).then(d => {
          if (d.favorites?.some((f: any) => f.resource_id === resource!.id)) setFavorited(true);
        }).catch(() => {});
    })();
  }, [userId, resource]);

  const toggleFavorite = async () => {
    if (!userId || !resource || !supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const r = await fetch("/api/mediatheque/favorites", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ resource_id: resource.id }),
    });
    const d = await r.json();
    if (r.ok) setFavorited(d.favorited);
  };

  const markComplete = async () => {
    if (!userId || !resource || !supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const r = await fetch("/api/mediatheque/progress", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ resource_id: resource.id, status: "completed", progress_percent: 100 }),
    });
    if (r.ok) setCompleted(true);
  };

  if (loading) return (
    <div className="eden-public min-h-screen bg-background"><Navigation/>
      <div className="flex items-center justify-center py-40"><div className="w-10 h-10 rounded-full border-[3px] border-[#E8E5E0] border-t-[#486B46] animate-spin"/></div>
    <Footer/></div>
  );

  if (!resource) return (
    <div className="eden-public min-h-screen bg-background"><Navigation/>
      <div className="text-center py-40"><Library className="w-12 h-12 text-[#D1D5DB] mx-auto mb-4"/>
        <h2 className="text-xl font-bold text-[#2F2F2F] mb-2">Ressource introuvable</h2>
        <Link href="/mediatheque" className="text-[#486B46] font-medium hover:underline">← Retour à la médiathèque</Link>
      </div>
    <Footer/></div>
  );

  const tc = RESOURCE_TYPE_CONFIG[resource.type] || RESOURCE_TYPE_CONFIG.external;
  const lc = LEVEL_CONFIG[resource.level];
  const embed = resource.external_url ? extractEmbedUrl(resource.external_url) : null;

  return (
    <div className="eden-public min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/mediatheque" className="flex items-center gap-2 text-[13px] text-[#6B7280] hover:text-[#2F2F2F] mb-6 font-medium">
          <ArrowLeft className="w-4 h-4"/> Retour à la médiathèque
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", tc.bgColor, tc.color)}>{tc.label}</span>
            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", lc.color)}>{lc.label}</span>
            {resource.category && (
              <Link href={`/mediatheque?category=${resource.category.id}`} className="text-[11px] font-bold tracking-wider uppercase" style={{ color: resource.category.color || "#486B46" }}>{resource.category.name}</Link>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1a1a1a] mb-4">{resource.title}</h1>

          <div className="flex flex-wrap items-center gap-4 mb-6 text-[13px] text-[#6B7280]">
            {resource.author && <span className="flex items-center gap-1.5"><User className="w-4 h-4"/>{resource.author}</span>}
            {resource.duration && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/>{resource.duration}</span>}
            {resource.page_count && <span className="flex items-center gap-1.5"><FileText className="w-4 h-4"/>{resource.page_count} pages</span>}
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4"/>{resource.view_count} vues</span>
          </div>

          <p className="text-[15px] text-[#555] leading-relaxed mb-6">{resource.description}</p>

          <div className="flex flex-wrap gap-3 mb-8">
            {userId && (
              <button onClick={toggleFavorite}
                className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all",
                  favorited ? "bg-[#F56565]/10 border-[#F56565]/30 text-[#F56565]" : "bg-white border-[#E8E5E0] text-[#6B7280] hover:bg-[#F9FAFB]")}>
                <Heart className={cn("w-4 h-4", favorited && "fill-current")}/>{favorited ? "Favori" : "Ajouter aux favoris"}
              </button>
            )}
            {userId && (
              <button onClick={markComplete}
                className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all",
                  completed ? "bg-[#38C172]/10 border-[#38C172]/30 text-[#38C172]" : "bg-white border-[#E8E5E0] text-[#6B7280] hover:bg-[#F9FAFB]")}>
                <CheckCircle className={cn("w-4 h-4", completed && "fill-current")}/>{completed ? "Terminé" : "Marquer comme terminé"}
              </button>
            )}
            {resource.external_url && (
              <a href={resource.external_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-white border border-[#E8E5E0] text-[#6B7280] hover:bg-[#F9FAFB]">
                <ExternalLink className="w-4 h-4"/> Ouvrir le lien
              </a>
            )}
            {resource.file_url && (
              <a href={resource.file_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#486B46] text-white hover:bg-[#3A5A38]">
                <Download className="w-4 h-4"/> Télécharger
              </a>
            )}
          </div>

          {/* Media Player */}
          {embed && (
            <div className="mb-8 rounded-2xl overflow-hidden bg-black shadow-lg">
              <iframe src={embed.embedUrl} className="w-full aspect-video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={resource.title}/>
            </div>
          )}
          {!embed && resource.type === "audio" && resource.file_url && (
            <div className="mb-8 bg-white rounded-2xl border border-[#E8E5E0] p-6">
              <audio controls className="w-full"><source src={resource.file_url}/></audio>
            </div>
          )}
          {!embed && (resource.thumbnail_url || resource.cover_url) && (
            resource.type === "book" ? (
              // Livre : la couverture entière, comme un livre posé, sans recadrage.
              <div className="mb-8 flex justify-center">
                <img src={resource.cover_url || resource.thumbnail_url || ""} alt={resource.title}
                  className="w-[70%] max-w-[320px] h-auto rounded-xl ring-1 ring-black/5 shadow-[0_18px_44px_rgba(38,70,52,0.18)]"/>
              </div>
            ) : (
              <div className="mb-8 rounded-2xl overflow-hidden">
                <img src={resource.thumbnail_url || resource.cover_url || ""} alt={resource.title} className="w-full h-auto max-h-[500px] object-cover"/>
              </div>
            )
          )}

          {/* Content */}
          {resource.content && (
            <div className="bg-white rounded-2xl border border-[#E8E5E0] p-6 sm:p-8 mb-8">
              <div className="prose prose-green max-w-none text-[15px] text-[#333] leading-relaxed whitespace-pre-wrap">{resource.content}</div>
            </div>
          )}

          {/* Tags */}
          {resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {resource.tags.map(tag => (
                <span key={tag.id} className="px-3 py-1.5 bg-[#EEF5EC] text-[#486B46] rounded-lg text-[12px] font-medium">#{tag.name}</span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Related Resources */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-[#1a1a1a] mb-6">{t("mediatheque.relatedResources")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r: any) => {
                const rtc = RESOURCE_TYPE_CONFIG[r.type as ResourceType] || RESOURCE_TYPE_CONFIG.external;
                return (
                  <Link key={r.id} href={`/mediatheque/${r.slug}`}
                    className="group bg-white rounded-xl border border-[#E8E5E0] overflow-hidden hover:shadow-md transition-all">
                    <div className="h-32 bg-gradient-to-br from-[#F8F5F2] to-[#EEF5EC] overflow-hidden">
                      {r.thumbnail_url ? <img src={r.thumbnail_url} alt={r.title} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Library className="w-6 h-6 text-[#D1D5DB]"/></div>}
                    </div>
                    <div className="p-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold uppercase", rtc.bgColor, rtc.color)}>{rtc.label}</span>
                      <h3 className="text-[13px] font-semibold text-[#2F2F2F] mt-1.5 line-clamp-2 group-hover:text-[#486B46]">{r.title}</h3>
                      {r.duration && <p className="text-[11px] text-[#9CA3AF] mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/>{r.duration}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}