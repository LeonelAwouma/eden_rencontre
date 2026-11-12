"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, ExternalLink, FileText, Library, Star, User } from "lucide-react";
import { Card } from "@/components/admin/admin-ui";
import { DataState, PageTitle } from "@/components/coach/coach-ui";
import { useCoachData } from "@/components/coach/use-coach-data";
import { LEVEL_CONFIG, RESOURCE_TYPE_CONFIG, type ResourceLevel, type ResourceType } from "@/lib/mediatheque";
import { extractEmbedUrl } from "@/lib/mediatheque/embed";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Resource {
  id: string; title: string; slug: string; description: string; content: string | null; type: ResourceType;
  author: string | null; file_url: string | null; external_url: string | null;
  thumbnail_url: string | null; cover_url: string | null; duration: string | null; page_count: number | null;
  level: ResourceLevel; view_count: number; featured: boolean;
  category: { id: string; name: string; color: string } | null;
  tags: { id: string; name: string; slug: string }[];
}
interface RelatedResource { id: string; title: string; slug: string; type: ResourceType; thumbnail_url: string | null; duration: string | null }

/** Détail d'une ressource de la médiathèque, vue coach : aucun favori, aucune progression, aucun bouton membre. */
export default function CoachMediathequeDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const slug = params.slug as string;
  const { state, reload } = useCoachData<{ resource: Resource; related: RelatedResource[] }>(`/api/coach/mediatheque/${slug}`);

  return (
    <>
      <Link href="/coach/mediatheque" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#56615A] hover:text-[#1C241F]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("coachMediatheque.back")}
      </Link>
      <DataState state={state} reload={reload}
        notFound={<Card className="p-8 text-center text-sm text-[#56615A]">{t("coachMediatheque.notFound")}</Card>}>
        {({ resource, related }) => {
          const tc = RESOURCE_TYPE_CONFIG[resource.type] ?? RESOURCE_TYPE_CONFIG.external;
          const lc = LEVEL_CONFIG[resource.level];
          const embed = extractEmbedUrl(resource.external_url);
          return (
            <>
              <PageTitle title={resource.title} />
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={cn("rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", tc.bgColor, tc.color)}>{tc.label}</span>
                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", lc.color)}>{lc.label}</span>
                {resource.category && <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: resource.category.color || "#486B46" }}>{resource.category.name}</span>}
                {resource.featured && <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />}
              </div>

              <div className="mb-5 flex flex-wrap items-center gap-4 text-[13px] text-[#56615A]">
                {resource.author && <span className="flex items-center gap-1.5"><User className="h-4 w-4" aria-hidden="true" />{resource.author}</span>}
                {resource.duration && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" />{resource.duration}</span>}
                {resource.page_count && <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" aria-hidden="true" />{t("coachMediatheque.pages", { n: resource.page_count })}</span>}
              </div>

              <p className="mb-6 text-[15px] leading-relaxed text-[#1C241F]">{resource.description}</p>

              {resource.external_url && (
                <a href={resource.external_url} target="_blank" rel="noopener noreferrer"
                  className="mb-6 inline-flex items-center gap-2 rounded-xl border border-[#D5DBD6] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C241F] hover:bg-[#F6FAF5]">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" /> {t("coachMediatheque.openLink")}
                </a>
              )}

              {embed && (
                <div className="mb-6 overflow-hidden rounded-2xl bg-black shadow-lg">
                  <iframe src={embed.embedUrl} className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={resource.title} />
                </div>
              )}
              {!embed && resource.type === "audio" && resource.file_url && (
                <Card className="mb-6 p-5"><audio controls className="w-full"><source src={resource.file_url} /></audio></Card>
              )}
              {!embed && (resource.thumbnail_url || resource.cover_url) && (
                resource.type === "book" ? (
                  <div className="mb-6 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element -- image du bucket public, dimensions variables */}
                    <img src={resource.cover_url || resource.thumbnail_url || ""} alt={resource.title} className="h-auto w-[70%] max-w-[280px] rounded-xl ring-1 ring-black/5" />
                  </div>
                ) : (
                  <div className="mb-6 overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element -- image du bucket public, dimensions variables */}
                    <img src={resource.thumbnail_url || resource.cover_url || ""} alt={resource.title} className="max-h-[420px] w-full object-cover" />
                  </div>
                )
              )}

              {resource.content && <Card className="mb-6 p-5 sm:p-6"><p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#1C241F]">{resource.content}</p></Card>}

              {resource.tags.length > 0 && (
                <div className="mb-8 flex flex-wrap gap-2">
                  {resource.tags.map((tag) => <span key={tag.id} className="rounded-lg bg-[#EEF5EC] px-3 py-1.5 text-[12px] font-medium text-[#28543C]">#{tag.name}</span>)}
                </div>
              )}

              {related.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-bold text-[#1C241F]">{t("coachMediatheque.related")}</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {related.map((r) => (
                      <Link key={r.id} href={`/coach/mediatheque/${r.slug}`} className="group overflow-hidden rounded-xl border border-[#E6EAE5] bg-white hover:shadow-md">
                        <div className="h-24 bg-gradient-to-br from-[#F6FAF5] to-[#EEF5EC]">
                          {r.thumbnail_url
                            // eslint-disable-next-line @next/next/no-img-element -- image du bucket public, dimensions variables
                            ? <img src={r.thumbnail_url} alt="" className="h-full w-full object-cover" />
                            : <div className="flex h-full w-full items-center justify-center"><Library className="h-5 w-5 text-[#9CA3AF]" aria-hidden="true" /></div>}
                        </div>
                        <p className="line-clamp-2 p-2.5 text-[12px] font-semibold text-[#1C241F] group-hover:text-[#28543C]">{r.title}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          );
        }}
      </DataState>
    </>
  );
}
