import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { sendMeetInvitationEmail } from "@/lib/email";

// ── POST — Resend a failed invitation ─────────────────────────
export async function POST(
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
    const { id: meetId } = await params;
    const body = await req.json();
    const { invitation_id } = body;

    if (!invitation_id) {
      return NextResponse.json(
        { error: "Champ requis: invitation_id" },
        { status: 400 }
      );
    }

    // Fetch the meet
    const { data: meet, error: meetError } = await supabase
      .from("meets")
      .select("*")
      .eq("id", meetId)
      .single();

    if (meetError || !meet) {
      return NextResponse.json({ error: "Meeting introuvable" }, { status: 404 });
    }

    // Fetch the invitation
    const { data: invitation, error: invError } = await supabase
      .from("meet_invitations")
      .select(`
        *,
        user:profiles!meet_invitations_user_id_fkey(id, name, email)
      `)
      .eq("id", invitation_id)
      .eq("meet_id", meetId)
      .single();

    if (invError || !invitation) {
      return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
    }

    const userProfile = invitation.user as unknown as { id: string; name: string; email: string } | null;

    if (!userProfile?.email) {
      return NextResponse.json(
        { error: "L'utilisateur n'a pas d'adresse email" },
        { status: 400 }
      );
    }

    // Send the email
    const meetDate = new Date(meet.start_time);
    const emailSent = await sendMeetInvitationEmail({
      to: userProfile.email,
      userName: userProfile.name || "Membre",
      meetingTitle: meet.title,
      meetingDescription: meet.description,
      meetingDate: meetDate,
      duration: meet.duration,
      meetLink: meet.meeting_uri,
      meetingCode: meet.meeting_code,
      adminMessage: meet.description,
    });

    // Update invitation status
    const newStatus = emailSent ? "sent" : "failed";
    const updateData: Record<string, unknown> = { status: newStatus };
    if (emailSent) {
      updateData.email_sent_at = new Date().toISOString();
      updateData.error_message = null;
    } else {
      updateData.error_message = "Échec de l'envoi (renvoi)";
    }

    await supabase
      .from("meet_invitations")
      .update(updateData)
      .eq("id", invitation_id);

    return NextResponse.json({
      success: emailSent,
      status: newStatus,
      message: emailSent
        ? "Email renvoyé avec succès"
        : "Échec de l'envoi de l'email",
    });
  } catch (err: any) {
    console.error("[Admin Meet Resend Invitation]", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}