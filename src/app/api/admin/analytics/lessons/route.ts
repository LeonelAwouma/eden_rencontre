import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import { BATIR_SUR_LE_ROC } from "@/lib/formation/batir-sur-le-roc";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  name: string | null;
  pseudo: string | null;
  email: string | null;
  formation_completed: string[] | null;
};
type CompletionStatus = "done" | "partial" | "none";
const PILLARS = BATIR_SUR_LE_ROC.pillars.filter((pillar) => pillar.lessons.length > 0);
const KNOWN_SLUGS = new Set(PILLARS.flatMap((p) => p.lessons.map((l) => l.slug)));
const TOTAL_LESSONS = KNOWN_SLUGS.size;
const BATCH_SIZE = 500;
const MAX_BATCHES = 200;

function percentage(n: number, total: number) {
  return total > 0 ? Math.round((n * 100) / total) : 0;
}

function classify(done: number, total: number): CompletionStatus {
  return done === total && total > 0 ? "done" : done > 0 ? "partial" : "none";
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const params = request.nextUrl.searchParams;
    const requestedPage = Number(params.get("page"));
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100000) : 1;
    const rawPillar = Number(params.get("pillar"));
    const pillarFilter = PILLARS.some((p) => p.number === rawPillar) ? rawPillar : 0;
    const rawState = params.get("state");
    const stateFilter = rawState === "done" || rawState === "partial" || rawState === "none" ? rawState : "all";
    const search = (params.get("search") || "").trim().toLocaleLowerCase("fr").slice(0, 80);
    const limit = 20;
    const db = getSupabaseAdmin();
    const profiles: ProfileRow[] = [];

    // PostgREST limite par défaut chaque réponse à 1 000 lignes.
    // Parcourir toutes les pages évite de sous-estimer les membres et les taux.
    let finished = false;
    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const start = batch * BATCH_SIZE;
      const { data, error } = await db
        .from("profiles")
        .select("id, name, pseudo, email, formation_completed")
        .eq("status", "approved")
        .order("id", { ascending: true })
        .range(start, start + BATCH_SIZE - 1);
      if (error) throw error;
      profiles.push(...((data || []) as ProfileRow[]));
      if (!data || data.length < BATCH_SIZE) {
        finished = true;
        break;
      }
    }
    if (!finished) throw new Error("Volume de profils supérieur à la limite d'analyse ; pagination serveur à optimiser.");

    const eligible = profiles.filter((p) => p.email?.toLowerCase() !== ADMIN_SYSTEM_EMAIL.toLowerCase());
    const users = eligible.length;
    const pillarCounts = PILLARS.map((pillar) => ({
      number: pillar.number,
      title: pillar.title,
      totalLessons: pillar.lessons.length,
      done: 0,
      partial: 0,
      none: 0,
      lessons: pillar.lessons.map((lesson) => ({
        slug: lesson.slug, number: lesson.number, title: lesson.title,
        completed: 0, remaining: 0, rate: 0,
      })),
    }));
    let withoutValidatedLessons = 0;
    let fullyCompleted = 0;
    let totalValidations = 0;
    let unknownSlugs = 0;

    const memberRows = eligible.map((profile) => {
      const raw = Array.isArray(profile.formation_completed) ? profile.formation_completed : [];
      const completed = new Set(raw.filter((v): v is string => typeof v === "string" && KNOWN_SLUGS.has(v)));
      unknownSlugs += new Set(raw.filter((v): v is string => typeof v === "string" && !KNOWN_SLUGS.has(v))).size;
      const totalDone = completed.size;
      totalValidations += totalDone;
      if (totalDone === 0) withoutValidatedLessons++;
      if (TOTAL_LESSONS > 0 && totalDone === TOTAL_LESSONS) fullyCompleted++;

      const pillars = pillarCounts.map((pillar, index) => {
        const count = pillar.lessons.filter((lesson) => completed.has(lesson.slug)).length;
        const status = classify(count, pillar.totalLessons);
        pillar[status]++;
        pillar.lessons.forEach((lesson, lessonIndex) => {
          if (completed.has(lesson.slug)) pillarCounts[index].lessons[lessonIndex].completed++;
        });
        return { number: pillar.number, done: count, total: pillar.totalLessons, status };
      });

      return {
        id: profile.id,
        name: profile.pseudo?.trim() || profile.name?.trim() || "Membre sans nom",
        done: totalDone,
        total: TOTAL_LESSONS,
        percent: percentage(totalDone, TOTAL_LESSONS),
        pillars,
      };
    });

    for (const pillar of pillarCounts) {
      for (const lesson of pillar.lessons) {
        lesson.remaining = users - lesson.completed;
        lesson.rate = percentage(lesson.completed, users);
      }
    }

    const filtered = memberRows.filter((member) => {
      if (search && !member.name.toLocaleLowerCase("fr").includes(search)) return false;
      if (stateFilter !== "all") {
        const status = pillarFilter
          ? member.pillars.find((p) => p.number === pillarFilter)?.status
          : classify(member.done, member.total);
        if (status !== stateFilter) return false;
      }
      return true;
    }).sort((a, b) => b.done - a.done || a.name.localeCompare(b.name, "fr"));

    const totalFiltered = filtered.length;
    const pages = Math.max(1, Math.ceil(totalFiltered / limit));
    const currentPage = Math.min(page, pages);
    const response = NextResponse.json({
      scope: "approved",
      updatedAt: new Date().toISOString(),
      totals: {
        users,
        withValidatedLessons: users - withoutValidatedLessons,
        withoutValidatedLessons,
        fullyCompleted,
        totalLessons: TOTAL_LESSONS,
        totalValidations,
        averageProgress: percentage(totalValidations, users * TOTAL_LESSONS),
        unknownSlugs,
      },
      pillars: pillarCounts,
      members: filtered.slice((currentPage - 1) * limit, currentPage * limit),
      pagination: { page: currentPage, limit, total: totalFiltered, totalPages: pages },
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    console.error("[Admin] lesson analytics:", error);
    return NextResponse.json({ error: "Impossible de charger la progression des leçons. Vérifiez la migration formation_completed et les droits Supabase." }, { status: 500 });
  }
}
