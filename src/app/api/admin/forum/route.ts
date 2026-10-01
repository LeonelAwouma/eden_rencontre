/**
 * Forum (groupe de discussion) — administration.
 * GET   /api/admin/forum?before=ISO|after=ISO&search=…&reported=1 — réglages, messages, statistiques, signalements, sourdines
 *       (after : uniquement les messages arrivés depuis, pour le rafraîchissement automatique)
 * PATCH /api/admin/forum — réglages { name?, description?, admins_only?, pinned_message_id? }
 * POST  /api/admin/forum — message de l'équipe { body?, sticker?, reply_to_id? }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminAccountId } from "@/lib/admin-system-user";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import { DEFAULT_FORUM_SETTINGS, FORUM_LIMITS, findSticker, forumMessageColumns } from "@/lib/forum-shared";
import { ADMIN_AUTHOR_COLUMNS, forumError } from "@/lib/forum-admin";

const PAGE = 80;
const NO_MATCH = ["00000000-0000-0000-0000-000000000000"];

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const before = searchParams.get("before");
  const after = searchParams.get("after");
  const reportedOnly = searchParams.get("reported") === "1";
  const search = (searchParams.get("search") || "").replace(/[,()%*\\]/g, " ").trim();
  const db = getSupabaseAdmin();

  const settingsRes = await db.from("forum_settings").select("name, description, admins_only, pinned_message_id").eq("id", 1).maybeSingle();
  if (settingsRes.error) return forumError(settingsRes.error);

  // Signalements en attente, avec leur auteur.
  const reportsRes = await db.from("forum_reports")
    .select("id, message_id, reason, created_at, reporter:profiles!forum_reports_reporter_id_fkey(id, pseudo, name)")
    .eq("resolved", false).order("created_at", { ascending: false });
  if (reportsRes.error) return forumError(reportsRes.error);
  const reports = reportsRes.data || [];
  const reportCount: Record<string, number> = {};
  for (const r of reports) reportCount[r.message_id] = (reportCount[r.message_id] || 0) + 1;

  let q = db.from("forum_messages").select(forumMessageColumns(ADMIN_AUTHOR_COLUMNS))
    .order("created_at", { ascending: false }).limit(PAGE + 1);
  if (before) q = q.lt("created_at", before);
  if (after) q = q.gt("created_at", after);
  if (search) q = q.ilike("body", `%${search}%`);
  if (reportedOnly) q = q.in("id", Object.keys(reportCount).length ? Object.keys(reportCount) : NO_MATCH);
  const msgRes = await q;
  if (msgRes.error) return forumError(msgRes.error);
  const rows = (msgRes.data || []) as unknown as ({ id: string } & Record<string, unknown>)[];
  const messages = rows.slice(0, PAGE).reverse().map((m) => ({ ...m, open_reports: reportCount[m.id] || 0 }));

  // Message épinglé (peut être plus ancien que la page chargée).
  let pinned = null;
  if (settingsRes.data?.pinned_message_id) {
    const p = await db.from("forum_messages").select(forumMessageColumns(ADMIN_AUTHOR_COLUMNS)).eq("id", settingsRes.data.pinned_message_id).maybeSingle();
    pinned = p.data ?? null;
  }

  // Statistiques.
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [total, week, recentAuthors, members, mutesRes] = await Promise.all([
    db.from("forum_messages").select("id", { count: "exact", head: true }),
    db.from("forum_messages").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    db.from("forum_messages").select("author_id").gte("created_at", monthAgo).eq("is_staff", false).limit(10000),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved").neq("email", ADMIN_SYSTEM_EMAIL),
    db.from("forum_mutes").select("user_id, until, reason, created_at, profile:profiles!forum_mutes_user_id_fkey(id, pseudo, name, email)")
      .order("created_at", { ascending: false }),
  ]);
  const now = Date.now();
  const mutes = (mutesRes.data || []).filter((m) => !m.until || new Date(m.until).getTime() > now);

  return NextResponse.json({
    settings: settingsRes.data ?? DEFAULT_FORUM_SETTINGS,
    messages,
    hasMore: rows.length > PAGE,
    pinned,
    reports,
    mutes,
    stats: {
      messages: total.count || 0,
      week: week.count || 0,
      participants: new Set((recentAuthors.data || []).map((r) => r.author_id)).size,
      members: members.count || 0,
      reported: Object.keys(reportCount).length,
      muted: mutes.length,
    },
  });
}

export async function PATCH(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Le nom du groupe doit faire entre 2 et 80 caractères." }, { status: 400 });
    update.name = name;
  }
  if (typeof body.description === "string") {
    if (body.description.length > 500) return NextResponse.json({ error: "Description trop longue (500 caractères maximum)." }, { status: 400 });
    update.description = body.description.trim();
  }
  if (typeof body.admins_only === "boolean") update.admins_only = body.admins_only;
  if (body.pinned_message_id === null || typeof body.pinned_message_id === "string") update.pinned_message_id = body.pinned_message_id;

  const db = getSupabaseAdmin();
  const { error } = await db.from("forum_settings").upsert({ id: 1, ...update });
  if (error) return forumError(error);

  try { await logAdminAction(admin.adminId, admin.email, "forum_settings_updated", "system", undefined, update); } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const sticker = typeof body.sticker === "string" && findSticker(body.sticker) ? body.sticker : null;
  const replyTo = typeof body.reply_to_id === "string" ? body.reply_to_id : null;
  if (!text && !sticker) return NextResponse.json({ error: "Écrivez un message ou choisissez un sticker." }, { status: 400 });
  if (text.length > FORUM_LIMITS.bodyMax) return NextResponse.json({ error: "Message trop long (2 000 caractères maximum)." }, { status: 400 });

  const db = getSupabaseAdmin();
  let authorId: string;
  try { authorId = await getAdminAccountId(db); } catch (e) {
    console.error("[Admin forum] compte équipe indisponible:", e);
    return NextResponse.json({ error: "Le compte de l'équipe n'a pas pu être préparé." }, { status: 500 });
  }

  const { data, error } = await db.from("forum_messages")
    .insert({ author_id: authorId, body: text, sticker, reply_to_id: replyTo, is_staff: true })
    .select("id").single();
  if (error) return forumError(error);

  try { await logAdminAction(admin.adminId, admin.email, "forum_message_sent", "system", data.id, { preview: text.slice(0, 100) || sticker }); } catch { /* non bloquant */ }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
