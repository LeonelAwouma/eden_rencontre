"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ResourceForm, EMPTY_RESOURCE, type ResourceFormValues } from "@/components/admin/mediatheque/resource-form";

interface LoadedResource {
  values: ResourceFormValues; slug: string; publishedAt: string | null;
}

export default function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loaded, setLoaded] = useState<LoadedResource | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/mediatheque/resources/${id}`)
      .then(async (res) => {
        const d = await res.json();
        const r = d.resource;
        if (!res.ok || !r) { setError(d.error || "Ressource introuvable."); return; }
        setLoaded({
          slug: r.slug,
          publishedAt: r.published_at || null,
          values: {
            ...EMPTY_RESOURCE,
            title: r.title || "", description: r.description || "", content: r.content || "",
            type: r.type || "article", category_id: r.category_id || "", author: r.author || "", source: r.source || "",
            external_url: r.external_url || "", file_url: r.file_url || "",
            thumbnail_url: r.thumbnail_url || "", cover_url: r.cover_url || "",
            duration: r.duration || "", page_count: r.page_count?.toString() || "",
            language: r.language || "fr", level: r.level || "beginner", target_audience: r.target_audience || "",
            status: r.status || "draft", featured: !!r.featured, recommended: !!r.recommended,
            tags: (r.tags || []).map((t: { name: string }) => t.name),
            learning_paths: r.learning_paths || [],
          },
        });
      })
      .catch(() => setError("Impossible de charger la ressource."));
  }, [id]);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={loaded?.values.title || "Modifier la ressource"}
        subtitle={loaded ? "Modifier la ressource" : undefined}
        backHref="/admin/mediatheque"
        backLabel="Médiathèque"
      />
      {error ? (
        <div className="bg-white rounded-2xl border border-border py-14 px-6 text-center">
          <AlertCircle className="w-6 h-6 text-[#B42318] mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-foreground">{error}</p>
          <Link href="/admin/mediatheque" className="inline-block mt-3 text-[13px] font-semibold text-primary hover:underline">Retour à la médiathèque</Link>
        </div>
      ) : !loaded ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-[#56615A]">
          <Loader2 className="w-5 h-5 text-primary animate-spin" /> Chargement de la ressource…
        </div>
      ) : (
        <ResourceForm key={id} initial={loaded.values} resourceId={id} slug={loaded.slug} publishedAt={loaded.publishedAt} />
      )}
    </div>
  );
}
