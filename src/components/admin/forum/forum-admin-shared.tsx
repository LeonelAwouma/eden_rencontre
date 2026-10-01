"use client";

import fr from "@/locales/fr.json";
import { ALL_LESSONS } from "@/lib/formation/batir-sur-le-roc";
import { forumCategory } from "@/lib/forum-shared";
import { cn } from "@/lib/utils";

/** Libellé français d'une clé i18n (l'admin est en français). */
export function frLabel(key: string): string {
  let cur: unknown = fr;
  for (const part of key.split(".")) {
    if (typeof cur !== "object" || cur === null) return key;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : key;
}

export const categoryLabel = (key: string) => frLabel(forumCategory(key).labelKey);

export const LESSON_OPTIONS = ALL_LESSONS.map(({ lesson }) => ({ slug: lesson.slug, label: `Leçon ${lesson.number} — ${lesson.title}` }));
export const lessonLabel = (slug: string | null) => (slug ? LESSON_OPTIONS.find((l) => l.slug === slug)?.label ?? `Leçon ${slug}` : null);

export interface AdminForumAuthor { id: string; pseudo: string | null; name: string | null; email: string | null; avatar_url: string | null; status: string | null }

/** Pseudo public (ce que voient les membres) + nom réel pour l'admin. */
export function AuthorName({ author, isStaff, className }: { author: AdminForumAuthor | null; isStaff: boolean; className?: string }) {
  if (isStaff) return <span className={cn("font-semibold text-primary", className)}>Équipe Garden of Alliance</span>;
  return (
    <span className={className}>
      <span className="font-semibold text-foreground">{author?.pseudo || "Membre"}</span>
      {author?.name && <span className="text-[#6B746E]"> · {author.name}</span>}
    </span>
  );
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
