import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

// POST — Un membre signale un autre membre (depuis la messagerie).
// Le signalement apparaît dans Admin → Signalements (table user_reports).

const REPORT_TYPES = ["inappropriate_content", "harassment", "fake_profile", "spam", "other"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

const TYPE_LABELS: Record<ReportType, string> = {
  inappropriate_content: "Contenu inapproprié",
  harassment: "Harcèlement",
  fake_profile: "Faux profil",
  spam: "Spam",
  other: "Autre",
};

/** Au-delà de ce nombre de signalements ouverts sur un même membre, priorité critique. */
const ESCALATION_THRESHOLD = 3;

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const reportedId = typeof body.reported_user_id === "string" ? body.reported_user_id : "";
    const type = body.report_type as ReportType;
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 1000) : "";
    let conversationId = typeof body.conversation_id === "string" ? body.conversation_id : null;

    if (!reportedId || reportedId === user.id) return NextResponse.json({ error: "invalid_target" }, { status: 400 });
    if (!REPORT_TYPES.includes(type)) return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    if (type === "other" && !description) return NextResponse.json({ error: "description_required" }, { status: 400 });

    const db = getSupabaseAdmin();

    const { data: reported } = await db.from("profiles").select("id, name, pseudo").eq("id", reportedId).maybeSingle();
    if (!reported) return NextResponse.json({ error: "invalid_target" }, { status: 400 });

    // La conversation n'est retenue que si le membre qui signale y participe.
    if (conversationId) {
      const { data: member } = await db.from("conversation_members").select("user_id")
        .eq("conversation_id", conversationId).eq("user_id", user.id).maybeSingle();
      if (!member) conversationId = null;
    }

    // Anti-abus : 10 signalements par jour et par membre ; un seul signalement ouvert par personne signalée.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: today } = await db.from("user_reports").select("id", { count: "exact", head: true })
      .eq("reporter_id", user.id).gte("created_at", since);
    if ((today || 0) >= 10) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const { data: open } = await db.from("user_reports").select("id")
      .eq("reporter_id", user.id).eq("reported_user_id", reportedId).in("status", ["pending", "investigating"]).limit(1);
    if (open && open.length > 0) return NextResponse.json({ ok: true, duplicate: true });

    // Priorité : le harcèlement passe devant ; plusieurs signalements ouverts → critique.
    const { count: openOnUser } = await db.from("user_reports").select("id", { count: "exact", head: true })
      .eq("reported_user_id", reportedId).in("status", ["pending", "investigating"]);
    const priority = (openOnUser || 0) + 1 >= ESCALATION_THRESHOLD ? "critical" : type === "harassment" ? "high" : "normal";

    const row: Record<string, unknown> = {
      reporter_id: user.id, reported_user_id: reportedId, report_type: type,
      description: description || null, priority, status: "pending",
      source: "messages", conversation_id: conversationId,
    };
    let { data: report, error } = await db.from("user_reports").insert(row).select("id").single();
    if (error && /source|conversation_id/.test(error.message || "")) {
      // Migration 20260925_user_reports_source.sql pas encore appliquée.
      delete row.source; delete row.conversation_id;
      ({ data: report, error } = await db.from("user_reports").insert(row).select("id").single());
    }
    if (error) throw error;

    const who = reported.pseudo || reported.name || "un membre";
    try {
      await db.from("admin_notifications").insert({
        type: "report",
        title: priority === "critical" ? "Signalement critique" : "Nouveau signalement",
        message: `${TYPE_LABELS[type]} — ${who} a été signalé(e) depuis la messagerie.`,
        link: "/admin/reports",
        metadata: { report_id: report?.id, reported_user_id: reportedId, conversation_id: conversationId },
      });
    } catch (e) { console.error("[Reports] Notification admin impossible :", e); }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Reports] Signalement impossible :", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
