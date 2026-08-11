import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

// ── GET — Get a single meet with all its invitations ──────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let admin;
    try {
      admin = await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { id } = await params;

    // Fetch the meet
    const { data: meet, error: meetError } = await supabase
      .from("meets")
      .select("*")
      .eq("id", id)
      .single();

    if (meetError || !meet) {
      return NextResponse.json({ error: "Meeting introuvable" }, { status: 404 });
    }

    // Fetch invitations with user details
    const { data: invitations, error: invError } = await supabase
      .from("meet_invitations")
      .select(`
        *,
        user:profiles!meet_invitations_user_id_fkey(id, name, email, avatar_url)
      `)
      .eq("meet_id", id)
      .order("invited_at", { ascending: true });

    if (invError) {
      console.error("[Admin Meet GET] Error fetching invitations:", invError);
    }

    // Calculate invitation stats
    const allInvitations = invitations || [];
    const invitationStats = {
      total: allInvitations.length,
      sent: allInvitations.filter((i) => i.status === "sent").length,
      failed: allInvitations.filter((i) => i.status === "failed").length,
      pending: allInvitations.filter((i) => i.status === "pending").length,
    };

    return NextResponse.json({
      meet: {
        ...meet,
        invitations: allInvitations,
        invitation_stats: invitationStats,
      },
    });
  } catch (err: any) {
    console.error("[Admin Meet GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ── DELETE — Delete a meet and its invitations ────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let admin;
    try {
      admin = await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { id } = await params;

    // Verify the meet exists
    const { data: meet, error: meetError } = await supabase
      .from("meets")
      .select("id, title")
      .eq("id", id)
      .single();

    if (meetError || !meet) {
      return NextResponse.json({ error: "Meeting introuvable" }, { status: 404 });
    }

    // Delete the meet (invitations will cascade delete)
    const { error: deleteError } = await supabase
      .from("meets")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: "Meeting supprimé" });
  } catch (err: any) {
    console.error("[Admin Meet DELETE]", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}

// ── PATCH — Update meet status (cancel, complete) ─────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let admin;
    try {
      admin = await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["active", "cancelled", "completed"].includes(status)) {
      return NextResponse.json(
        { error: "Statut invalide. Valeurs acceptées: active, cancelled, completed" },
        { status: 400 }
      );
    }

    const { data: meet, error: updateError } = await supabase
      .from("meets")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (updateError || !meet) {
      return NextResponse.json({ error: "Meeting introuvable" }, { status: 404 });
    }

    return NextResponse.json({ meet });
  } catch (err: any) {
    console.error("[Admin Meet PATCH]", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}