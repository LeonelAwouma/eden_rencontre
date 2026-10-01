"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Monogram } from "@/components/ornaments";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { avatarSrc } from "@/lib/avatar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { forumCategory, forumRelativeTime, type ForumAuthor } from "@/lib/forum-shared";

/** En-tête des pages du forum, sur le modèle de l'Académie. */
export function ForumHeader({ backHref = "/dashboard", backLabel }: { backHref?: string; backLabel?: string }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/dashboard/forum" className="flex items-center gap-2.5 min-w-0">
          <Monogram className="w-8 h-7 text-primary shrink-0" />
          <span className="font-headline text-lg sm:text-xl font-bold text-foreground truncate">
            Garden of Alliance <span className="text-primary italic font-normal">{t("forum.title")}</span>
          </span>
        </Link>
        <Link href={backHref}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-[13px] font-semibold text-[#3F4A43] hover:bg-muted transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">{backLabel || t("academie.backToDashboard")}</span>
        </Link>
      </div>
    </header>
  );
}

export function CategoryChip({ category, className }: { category: string; className?: string }) {
  const { t } = useI18n();
  const c = forumCategory(category);
  return (
    <span className={cn("inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-primary/10 text-primary text-[11.5px] font-semibold max-w-full", className)}>
      <c.icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{t(c.labelKey)}</span>
    </span>
  );
}

/** Auteur d'un message : pseudo public uniquement, ou « l'équipe » pour l'admin. */
export function AuthorLine({ author, isStaff, date, size = "md" }: {
  author: ForumAuthor | null; isStaff: boolean; date: string; size?: "sm" | "md";
}) {
  const { t, locale } = useI18n();
  const name = isStaff ? t("forum.staff") : author?.pseudo || t("forum.member");
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <Avatar className={cn("shrink-0 border border-border", size === "sm" ? "w-7 h-7" : "w-9 h-9")}>
        {!isStaff && <AvatarImage src={avatarSrc(author?.avatar_url ?? undefined)} />}
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
          {isStaff ? <ShieldCheck className="w-4 h-4" /> : name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 leading-tight">
        <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-foreground truncate">
          {name}
          {isStaff && <span className="px-1.5 py-px rounded bg-primary text-white text-[10px] font-bold uppercase tracking-wide">{t("forum.staffBadge")}</span>}
        </span>
        <span className="block text-[12px] text-[#6B746E]">{forumRelativeTime(date, locale)}</span>
      </span>
    </span>
  );
}
