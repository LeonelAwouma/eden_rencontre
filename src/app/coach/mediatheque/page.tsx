"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, FileText, Headphones, Library, Link2, Search, Star, Video } from "lucide-react";
import { DataState, EmptyBlock, PageTitle, Pager } from "@/components/coach/coach-ui";
import { useCoachData } from "@/components/coach/use-coach-data";
import { LEVEL_CONFIG, RESOURCE_TYPE_CONFIG, type ResourceLevel, type ResourceType } from "@/lib/mediatheque";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CardResource {
  id: string; title: string; slug: string; description: string; type: ResourceType; author: string | null;
  thumbnail_url: string | null; cover_url: string | null; duration: string | null; level: ResourceLevel;
  category: { id: string; name: string; color: string } | null; featured: boolean;
}
interface Category { id: string; name: string; icon: string | null }
interface Catalog { resources: CardResource[]; total: number; page: number; totalPages: number; categories: Category[] }

const TYPES: (ResourceType | "all")[] = ["all", "video", "audio", "book", "pdf", "article", "guide", "testimony", "external"];
const LEVELS: (ResourceLevel | "all")[] = ["all", "beginner", "intermediate", "advanced"];

const TYPE_ICONS: Record<ResourceType, typeof Video> = {
  video: Video, audio: Headphones, book: BookOpen, pdf: FileText, article: FileText,
  testimony: FileText, guide: BookOpen, external: Link2,
};

/** Médiathèque générale, réservée aux ressources publiées et consultables (lecture seule, aucun favori ni progression). */
export default function CoachMediathequePage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState<ResourceType | "all">("all");
  const [level, setLevel] = useState<ResourceLevel | "all">("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => { const id = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(id); }, [q]);
  useEffect(() => { setPage(1); }, [debounced, type, level, category]);

  const params = new URLSearchParams();
  if (debounced) params.set("search", debounced);
  if (type !== "all") params.set("type", type);
  if (level !== "all") params.set("level", level);
  if (category !== "all") params.set("category", category);
  params.set("page", String(page));
  const { state, reload } = useCoachData<Catalog>(`/api/coach/mediatheque?${params.toString()}`);

  return (
    <>
      <PageTitle title={t("coachMediatheque.title")} subtitle={t("coachMediatheque.subtitle")} />

      <label className="relative mb-4 block max-w-xl">
        <Search className="absolute left-3 top-3 h-4 w-4 text-[#56615A]" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} aria-label={t("coachMediatheque.searchLabel")}
          placeholder={t("coachMediatheque.searchPlaceholder")} className="w-full rounded-xl border border-[#E6EAE5] bg-white py-2.5 pl-9 pr-3 text-sm" />
      </label>

      <DataState state={state} reload={reload}>
        {(data) => (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select aria-label={t("coachMediatheque.filterType")} value={type} onChange={(e) => setType(e.target.value as ResourceType | "all")}
                className="rounded-xl border border-[#E6EAE5] bg-white px-3 py-2 text-sm">
                {TYPES.map((v) => <option key={v} value={v}>{v === "all" ? t("coachMediatheque.allTypes") : RESOURCE_TYPE_CONFIG[v].label}</option>)}
              </select>
              <select aria-label={t("coachMediatheque.filterLevel")} value={level} onChange={(e) => setLevel(e.target.value as ResourceLevel | "all")}
                className="rounded-xl border border-[#E6EAE5] bg-white px-3 py-2 text-sm">
                {LEVELS.map((v) => <option key={v} value={v}>{v === "all" ? t("coachMediatheque.allLevels") : LEVEL_CONFIG[v].label}</option>)}
              </select>
              {data.categories.length > 0 && (
                <select aria-label={t("coachMediatheque.filterCategory")} value={category} onChange={(e) => setCategory(e.target.value)}
                  className="rounded-xl border border-[#E6EAE5] bg-white px-3 py-2 text-sm">
                  <option value="all">{t("coachMediatheque.allCategories")}</option>
                  {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            {data.resources.length === 0 ? (
              <EmptyBlock icon={Library} title={t("coachMediatheque.empty")} description={t("coachMediatheque.emptyDesc")} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.resources.map((r) => {
                  const tc = RESOURCE_TYPE_CONFIG[r.type] ?? RESOURCE_TYPE_CONFIG.external;
                  const Icon = TYPE_ICONS[r.type] ?? Library;
                  const img = r.thumbnail_url || r.cover_url;
                  return (
                    <Link key={r.id} href={`/coach/mediatheque/${r.slug}`}
                      className="group overflow-hidden rounded-2xl border border-[#E6EAE5] bg-white transition-shadow hover:shadow-md">
                      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#F6FAF5] to-[#EEF5EC]">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element -- image du bucket public, dimensions variables
                          <img src={img} alt="" className={cn("h-full w-full", r.type === "book" ? "object-contain p-3" : "object-cover")} />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center"><Icon className="h-8 w-8 text-[#9CA3AF]" aria-hidden="true" /></div>
                        )}
                        <span className={cn("absolute left-2 top-2 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", tc.bgColor, tc.color)}>{tc.label}</span>
                        {r.featured && <Star className="absolute right-2 top-2 h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />}
                        {r.duration && (
                          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                            <Clock className="h-3 w-3" aria-hidden="true" />{r.duration}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        {r.category && <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: r.category.color || "#486B46" }}>{r.category.name}</p>}
                        <h3 className="line-clamp-2 text-sm font-semibold text-[#1C241F] group-hover:text-[#28543C]">{r.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-[#56615A]">{r.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />
          </>
        )}
      </DataState>
    </>
  );
}
