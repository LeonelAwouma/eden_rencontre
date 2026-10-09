"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { FORMATION_COVER_SRC } from "@/lib/formation/paths";
import { motion } from "framer-motion";
import { Search, Library, Video, Headphones, BookOpen, FileText, File, Star, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { RESOURCE_TYPE_CONFIG, LEVEL_CONFIG, type ResourceType, type ResourceLevel } from "@/lib/mediatheque";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

interface Resource { id: string; title: string; slug: string; description: string; type: ResourceType; author: string | null; thumbnail_url: string | null; cover_url: string | null; duration: string | null; page_count: number | null; level: ResourceLevel; category: { id: string; name: string; slug: string; icon: string | null; color: string } | null; tags: { id: string; name: string; slug: string }[]; view_count: number; featured: boolean; }
interface Category { id: string; name: string; slug: string; icon: string | null; }

const TYPES = ["all","video","audio","book","pdf","article","guide"] as const;
const LEVELS = ["all","beginner","intermediate","advanced"] as const;
const SORTS = [{v:"newest",l:"Plus récent"},{v:"popular",l:"Populaire"},{v:"recommended",l:"Recommandé"}];

const TypeIcon = ({type}:{type:string}) => { const m:Record<string,React.ReactNode>={video:<Video className="w-4 h-4"/>,audio:<Headphones className="w-4 h-4"/>,book:<BookOpen className="w-4 h-4"/>,pdf:<File className="w-4 h-4"/>,article:<FileText className="w-4 h-4"/>}; return <>{m[type]||<Library className="w-4 h-4"/>}</>; };

export default function MediathequePage() {
  const { t } = useI18n();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search); if (typeFilter!=="all") p.set("type", typeFilter);
      if (categoryFilter!=="all") p.set("category", categoryFilter); if (levelFilter!=="all") p.set("level", levelFilter);
      p.set("sort", sort); p.set("page", page.toString()); p.set("limit", "12");
      const r = await fetch(`/api/mediatheque?${p}`); const d = await r.json();
      if (r.ok) { setResources(d.resources||[]); setTotalPages(d.totalPages||1); if (d.categories) setCategories(d.categories); }
    } catch(e){console.error(e);} finally{setLoading(false);}
  }, [search, typeFilter, categoryFilter, levelFilter, sort, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="eden-public min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#486B46] mb-3">Ressources</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-bold text-[#2F2F2F] tracking-tight mb-4">
            Médiathèque <span className="text-[#486B46]">Chrétienne</span>
          </h1>
          <p className="text-[15px] text-[#777777] max-w-2xl mx-auto mb-8">{t("mediatheque.subtitle")}</p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
            <input type="text" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              placeholder={t("mediatheque.searchPlaceholder")}
              className="w-full pl-12 pr-4 py-4 bg-white border border-[#E8E5E0] rounded-2xl text-[15px] placeholder:text-[#D1D5DB] outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/10 shadow-sm" />
          </div>
        </motion.div>

        {/* Formation « Bâtir sur le roc » : la formation phare, avec son image */}
        <Link href="/dashboard/academie"
          className="group mb-10 grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] rounded-3xl border border-[#E8E5E0] bg-white overflow-hidden shadow-sm hover:shadow-lg hover:border-[#C6D4C0] transition-all">
          <span className="relative block aspect-[4/3] md:aspect-auto md:min-h-[260px] bg-[#F4F3EF] overflow-hidden">
            <Image src={FORMATION_COVER_SRC} alt={t("mediatheque.formationAlt")} fill sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover object-[center_45%] group-hover:scale-[1.03] transition-transform duration-700" />
          </span>
          <span className="flex flex-col justify-center p-6 sm:p-8">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#486B46]">{t("mediatheque.formationEyebrow")}</span>
            <span className="mt-2 font-headline text-[28px] sm:text-[34px] font-bold leading-tight text-[#2F2F2F] group-hover:text-[#486B46] transition-colors">
              {t("mediatheque.formationTitle")}
            </span>
            <span className="mt-2 text-[15px] leading-relaxed text-[#56615A]">{t("mediatheque.formationDesc")}</span>
            <span className="mt-5 inline-flex items-center gap-2 self-start h-11 px-5 rounded-full bg-deep-eden text-white text-[14px] font-bold group-hover:bg-deep-eden/90 transition-colors">
              <BookOpen className="w-4 h-4" /> {t("mediatheque.formationCta")}
            </span>
          </span>
        </Link>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button onClick={()=>{setCategoryFilter("all");setPage(1);}} className={cn("px-4 py-2 rounded-xl text-[13px] font-semibold", categoryFilter==="all"?"bg-deep-eden hover:bg-deep-eden/90 text-white":"bg-white border border-[#E8E5E0]")}>{t("mediatheque.allContent")}</button>
          {categories.map(c=>(<button key={c.id} onClick={()=>{setCategoryFilter(c.id);setPage(1);}} className={cn("px-4 py-2 rounded-xl text-[13px] font-semibold", categoryFilter===c.id?"bg-deep-eden hover:bg-deep-eden/90 text-white":"bg-white border border-[#E8E5E0]")}>{c.name}</button>))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
          <div className="flex items-center gap-1 bg-white rounded-xl border border-[#E8E5E0] p-1 overflow-x-auto">
            {TYPES.map(t=>(<button key={t} onClick={()=>{setTypeFilter(t);setPage(1);}} className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap", typeFilter===t?"bg-deep-eden text-white":"text-[#6B7280] hover:bg-[#F9FAFB]")}>{t==="all"?"Tous":RESOURCE_TYPE_CONFIG[t]?.label||t}</button>))}
          </div>
          <select value={levelFilter} onChange={e=>{setLevelFilter(e.target.value);setPage(1);}} className="px-3 py-2 bg-white border border-[#E8E5E0] rounded-xl text-[13px] font-medium outline-none">
            {LEVELS.map(l=>(<option key={l} value={l}>{l==="all"?"Niveaux":LEVEL_CONFIG[l]?.label||l}</option>))}
          </select>
          <div className="flex-1"/>
          <select value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}} className="px-3 py-2 bg-white border border-[#E8E5E0] rounded-xl text-[13px] font-medium outline-none">
            {SORTS.map(s=>(<option key={s.v} value={s.v}>{s.l}</option>))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-10 h-10 rounded-full border-[3px] border-[#E8E5E0] border-t-[#486B46] animate-spin"/></div>
        ) : resources.length === 0 ? (
          <div className="text-center py-20">
            <Library className="w-12 h-12 text-[#D1D5DB] mx-auto mb-4"/>
            <p className="text-[16px] font-semibold text-[#777777]">{t("mediatheque.noResources")}</p>
            <p className="text-[14px] text-[#9CA3AF] mt-1">{t("mediatheque.noResourcesDesc")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {resources.map((r, i) => {
              const tc = RESOURCE_TYPE_CONFIG[r.type] || RESOURCE_TYPE_CONFIG.external;
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="group bg-white rounded-2xl border border-[#E8E5E0] overflow-hidden hover:shadow-lg hover:border-[#C6D4C0] transition-all duration-300 hover:-translate-y-0.5">
                  <Link href={`/mediatheque/${r.slug}`}>
                    <div className="relative h-44 bg-gradient-to-br from-[#F8F5F2] to-[#EEF5EC] overflow-hidden">
                      {r.thumbnail_url || r.cover_url ? (
                        <img src={r.thumbnail_url || r.cover_url || ""} alt={r.title}
                          className={`w-full h-full group-hover:scale-105 transition-transform duration-500 ${r.type === "book" ? "object-contain p-3" : "object-cover"}`}/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><TypeIcon type={r.type}/></div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", tc.bgColor, tc.color)}>{tc.label}</span>
                      </div>
                      {r.featured && <div className="absolute top-3 right-3"><Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]"/></div>}
                      {r.duration && <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 rounded-lg text-white text-[10px] font-semibold"><Clock className="w-3 h-3"/>{r.duration}</div>}
                    </div>
                  </Link>
                  <div className="p-4">
                    {r.category && <p className="text-[10px] font-bold tracking-wider uppercase mb-1.5" style={{color:r.category.color||"#486B46"}}>{r.category.name}</p>}
                    <Link href={`/mediatheque/${r.slug}`}>
                      <h3 className="text-[15px] font-bold text-[#2F2F2F] line-clamp-2 group-hover:text-[#486B46] transition-colors mb-2">{r.title}</h3>
                    </Link>
                    <p className="text-[13px] text-[#9CA3AF] line-clamp-2 mb-3 leading-relaxed">{r.description}</p>
                    <div className="flex items-center justify-between">
                      {r.author && <p className="text-[11px] text-[#6B7280] font-medium truncate max-w-[60%]">{r.author}</p>}
                      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", LEVEL_CONFIG[r.level]?.color)}>{LEVEL_CONFIG[r.level]?.label}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-[#E5E7EB] disabled:opacity-30">
              <ChevronLeft className="w-5 h-5"/></button>
            <span className="text-[13px] font-medium text-[#6B7280] px-4">Page {page} / {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-[#E5E7EB] disabled:opacity-30">
              <ChevronRight className="w-5 h-5"/></button>
          </div>
        )}
      </main>
      <Footer/>
    </div>
  );
}