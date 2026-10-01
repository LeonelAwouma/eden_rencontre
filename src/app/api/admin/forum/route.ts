/**
 * GET  /api/admin/forum — liste des sujets (filtres, statistiques, signalements)
 * POST /api/admin/forum — nouveau sujet publié au nom de l'équipe
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminAccountId } from "@/lib/admin-system-user";
import { FORUM_CATEGORY_KEYS, FORUM_LIMITS } from "@/lib/forum-shared";
import { ADMIN_AUTHOR, forumError, openReportCounts } from "@/lib/forum-admin";

const TOPIC_COLUMNS =
  "id, author_id, category, lesson_slug, title, body, status, is_pinned, is_locked, is_staff, reply_count, last_activity_at, created_at, updated_at, " +
  ADMIN_AUTHOR.replace("%s", "forum_topics");

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all"; // all | reported | hidden | pinned | locked
  const category = searchParams.get("category");
  const search = (searchParams.get("search") || "").replace(/[,()%*\\]/g, " ").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));
  const offset = (page - 1) * limit;

  const db = getSupabaseAdmin();

  // Signalements en attente : servent au filtre « Signalés » et aux pastilles.
  const reports = await openReportCounts(db);
  if (reports.error) return forumError(reports.error);
  const reportedIds = Object.keys(reports.byTopic);

  let q = db.from("forum_topics").select(TOPIC_COLUMNS, { count: "exact" })
    .order("is_pinned", { ascending: false })
    .order("last_activity_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (filter === "hidden") q = q.eq("status", "hidden");
  if (filter === "pinned") q = q.eq("is_pinned", true);
  if (filter === "locked") q = q.eq("is_locked", true);
  if (filter === "reported") q = q.in("id", reportedIds.length ? reportedIds : ["00000000-0000-0000-0000-000000000000"]);
  if (category && FORUM_CATEGORY_KEYS.has(category)) q = q.eq("category", category);
  if (search) q = q.or(`title.ilike.%${search}%,body.ilike.%${search}%`);

  const { data, error, count } = await q;
  if (error) return forumError(error);

  const [topicsCount, repliesCount, hiddenCount] = await Promise.all([
    db.from("forum_topics").select("id", { count: "exact", head: true }),
    db.from("forum_replies").select("id", { count: "exact", head: true }),
    db.from("forum_topics").select("id", { count: "exact", head: true }).eq("status", "hidden"),
  ]);

  const rows = (data || []) as unknown as ({ id: string } & Record<string, unknown>)[];
  const topics = rows.map((t) => ({ ...t, open_reports: reports.byTopic[t.id] || 0 }));

  return NextResponse.json({
    topics,
    total: count || 0,
    page,
    totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
    stats: {
      topics: topicsCount.count || 0,
      replies: repliesCount.count || 0,
      reported: reportedIds.length,
      hidden: hiddenCount.count || 0,
    },
  });
}

export async function POST(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const category = FORUM_CATEGORY_KEYS.has(body.category) ? body.category : "general";
  const lesson_slug = typeof body.lesson_slug === "string" && body.lesson_slug ? body.lesson_slug : null;
  if (title.length < FORUM_LIMITS.titleMin || title.length > FORUM_LIMITS.titleMax) {
    return NextResponse.json({ error: `Le titre doit faire entre ${FORUM_LIMITS.titleMin} et ${FORUM_LIMITS.titleMax} caractères.` }, { status: 400 });
  }
  if (!text || text.length > FORUM_LIMITS.bodyMax) {
    return NextResponse.json({ error: "Écrivez un message (8 000 caractères maximum)." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  let authorId: string;
  try { authorId = await getAdminAccountId(db); } catch (e) {
    console.error("[Admin forum] compte équipe indisponible:", e);
    return NextResponse.json({ error: "Le compte de l'équipe n'a pas pu être préparé." }, { status: 500 });
  }

  const { data, error } = await db.from("forum_topics").insert({
    author_id: authorId, category, lesson_slug, title, body: text,
    is_staff: true, is_pinned: !!body.is_pinned,
  }).select("id").single();
  if (error) return forumError(error);

  try { await logAdminAction(admin.adminId, admin.email, "forum_topic_created", "system", data.id, { title }); } catch { /* non bloquant */ }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
