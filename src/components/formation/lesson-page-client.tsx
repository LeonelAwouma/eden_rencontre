"use client";

// Coquille cliente de la page de leçon — récupère le contenu réel depuis
// /api/formation/lesson/[slug] (Authorization: Bearer, même schéma que
// src/components/profile-photo-gallery.tsx) au lieu d'un import statique du
// contenu complet. Tant que `commercial_restrictions_enabled=false` (défaut),
// le comportement observé est strictement identique à l'ancien rendu statique
// : tout le monde voit tout, piliers 2-3 compris.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LessonReader } from "./lesson-reader";
import { FORMATION_BASE_PATH } from "@/lib/formation/paths";
import { useFormationLocale } from "@/lib/formation/ui";
import type { Lesson, Pillar } from "@/lib/formation/types";

export function LessonPageClient({ slug }: { slug: string }) {
  const { ui } = useFormationLocale();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "locked"; pillar: number }
    | { status: "error" }
    | { status: "ok"; lesson: Lesson; pillar: Pillar; previous: Lesson | null; next: Lesson | null }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
        const token = data.session?.access_token;
        const res = await fetch(`/api/formation/lesson/${slug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error" });
          return;
        }
        const json = await res.json();
        if (json.locked) {
          setState({ status: "locked", pillar: json.pillar });
        } else {
          setState({ status: "ok", lesson: json.lesson, pillar: json.pillar, previous: json.previous ?? null, next: json.next ?? null });
        }
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (state.status === "loading") {
    return <div className="eden-public min-h-screen bg-background flex items-center justify-center text-[14px] text-[#56615A]">…</div>;
  }
  if (state.status === "error") {
    return (
      <div className="eden-public min-h-screen bg-background flex items-center justify-center text-center px-6">
        <p className="text-[15px] text-[#56615A]">{ui.audioError}</p>
      </div>
    );
  }
  if (state.status === "locked") {
    return (
      <div className="eden-public min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
        <span className="w-14 h-14 rounded-2xl bg-card border border-border text-[#56615A] flex items-center justify-center"><Lock className="w-6 h-6" /></span>
        <h1 className="font-headline text-[24px] font-bold text-foreground">{ui.pillarLockedTitle(state.pillar)}</h1>
        <Link href={FORMATION_BASE_PATH} className="inline-flex items-center h-11 px-5 rounded-full bg-primary text-white text-[14px] font-bold hover:bg-primary/90">
          {ui.backToCourse}
        </Link>
      </div>
    );
  }
  return <LessonReader lesson={state.lesson} pillar={state.pillar} previous={state.previous} next={state.next} />;
}
