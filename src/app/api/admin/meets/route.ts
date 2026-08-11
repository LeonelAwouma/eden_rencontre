import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createMeetSpace } from "@/lib/google-meet";
import { requireAdmin } from "@/lib/admin-auth";
import { sendMeetInvitationEmail } from "@/lib/email";

// ── GET — List all meets with invitations summary ─────────────
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    let admin;
    try {
      admin = await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabase
      .from("meets")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: meets, error } = await query;
    if (error) throw error;

    // Fetch invitation counts for each meet
    const meetsWithCounts = await Promise.all(
      (meets || []).map(async (meet) => {
        const { count: totalInvitations } = await supabase
          .from("meet_invitations")
          .select("*", { count: "exact", head: true })
          .eq("meet_id", meet.id);

        const { count: sentInvitations } = await supabase
          .from("meet_invitations")
          .select("*", { count: "exact", head: true })
          .eq("meet_id", meet.id)
          .eq("status", "sent");

        const { count: failedInvitations } = await supabase
          .from("meet_invitations")
          .select("*", { count: "exact", head: true })
          .eq("meet_id", meet.id)
          .eq("status", "failed");

        const { count: pendingInvitations } = await supabase
          .from("meet_invitations")
          .select("*", { count: "exact", head: true })
          .eq("meet_id", meet.id)
          .eq("status", "pending");

        return {
          ...meet,
          invitation_stats: {
            total: totalInvitations || 0,
            sent: sentInvitations || 0,
            failed: failedInvitations || 0,
            pending: pendingInvitations || 0,
          },
        };
      })
    );

    // Get overall stats
    const { data: stats } = await supabase.rpc("get_meet_space_stats");

    return NextResponse.json({
      meets: meetsWithCounts,
      stats: stats?.[0] || {
        total_meets: 0,
        active_meets: 0,
        cancelled_meets: 0,
        completed_meets: 0,
        total_invitations: 0,
        sent_invitations: 0,
        pending_invitations: 0,
        failed_invitations: 0,
      },
    });
  } catch (err: any) {
    console.error("[Admin Meets GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ── POST — Create a new meet with Google Meet space ───────────
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    let admin;
    try {
      admin = await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const {
      title,
      description,
      start_time,
      duration = 60,
      user_ids,
    } = body;

    // Validate required fields
    if (!title || !start_time) {
      return NextResponse.json(
        { error: "Champs requis: title, start_time" },
        { status: 400 }
      );
    }

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: "Au moins un utilisateur doit être invité" },
        { status: 400 }
      );
    }

    // Sanitize title and description
    const cleanTitle = title.trim().substring(0, 255);
    const cleanDescription = description ? description.trim().substring(0, 2000) : null;

    let googleError: string | null = null;

    // Try to create the Google Meet space
    const meetSpaceResult = await createMeetSpace(admin.adminId);

    if (!meetSpaceResult.success) {
      googleError = meetSpaceResult.error || "Impossible de créer l'espace Google Meet";
      console.warn("[Admin Meets POST] Google Meet creation failed:", googleError);
    }

    // Insert meet into database (even if Google Meet failed)
    const { data: meet, error: insertError } = await supabase
      .from("meets")
      .insert({
        title: cleanTitle,
        description: cleanDescription,
        meeting_uri: meetSpaceResult?.meetingUri || null,
        meeting_code: meetSpaceResult?.meetingCode || null,
        space_name: meetSpaceResult?.spaceName || null,
        start_time: new Date(start_time).toISOString(),
        duration,
        created_by: admin.adminId === "env-admin" ? null : admin.adminId,
        status: "active",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Fetch user profiles for invitations
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", user_ids);

    if (profilesError) {
      console.error("[Admin Meets POST] Error fetching profiles:", profilesError);
    }

    const profileMap = new Map(
      (profiles || []).map((p: { id: string; email: string; name: string }) => [p.id, p])
    );

    // Create invitation records
    const invitationRows = user_ids.map((userId: string) => {
      const profile = profileMap.get(userId);
      return {
        meet_id: meet.id,
        user_id: userId,
        email: profile?.email || "",
        status: "pending" as const,
      };
    });

    const { data: invitations, error: invError } = await supabase
      .from("meet_invitations")
      .insert(invitationRows)
      .select();

    if (invError) {
      console.error("[Admin Meets POST] Error creating invitations:", invError);
    }

    // Send email invitations asynchronously
    let emailsSent = 0;
    let emailsFailed = 0;
    const meetLink = meetSpaceResult?.meetingUri || null;
    const meetDate = new Date(start_time);

    if (invitations && invitations.length > 0) {
      const emailPromises = invitations.map(async (invitation) => {
        const profile = profileMap.get(invitation.user_id);
        if (!profile?.email) {
          // No email — mark as failed
          await supabase
            .from("meet_invitations")
            .update({ status: "failed", error_message: "Adresse email manquante" })
            .eq("id", invitation.id);
          emailsFailed++;
          return;
        }

        const emailSent = await sendMeetInvitationEmail({
          to: profile.email,
          userName: profile.name || "Membre",
          meetingTitle: cleanTitle,
          meetingDescription: cleanDescription,
          meetingDate: meetDate,
          duration,
          meetLink,
          meetingCode: meetSpaceResult?.meetingCode || null,
          adminMessage: cleanDescription,
        });

        if (emailSent) {
          await supabase
            .from("meet_invitations")
            .update({ status: "sent", email_sent_at: new Date().toISOString() })
            .eq("id", invitation.id);
          emailsSent++;
        } else {
          await supabase
            .from("meet_invitations")
            .update({ status: "failed", error_message: "Échec de l'envoi de l'email" })
            .eq("id", invitation.id);
          emailsFailed++;
        }
      });

      await Promise.allSettled(emailPromises);
    }

    // Create admin notification
    try {
      await supabase.from("admin_notifications").insert({
        type: "meeting",
        title: "Nouveau Google Meet créé",
        message: `Le meeting "${cleanTitle}" a été créé avec ${user_ids.length} invitation(s). ${emailsSent} email(s) envoyé(s).`,
        link: `/admin/meets`,
        metadata: { meet_id: meet.id, title: cleanTitle, invitations_count: user_ids.length },
      });
    } catch (notifErr) {
      console.error("Failed to create admin notification:", notifErr);
    }

    return NextResponse.json({
      meet: {
        ...meet,
        invitation_stats: {
          total: user_ids.length,
          sent: emailsSent,
          failed: emailsFailed,
          pending: 0,
        },
      },
      google_meet_url: meetLink,
      google_meet_code: meetSpaceResult?.meetingCode || null,
      google_configured: meetSpaceResult?.success || false,
      google_error: googleError,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
    });
  } catch (err: any) {
    console.error("[Admin Meets POST]", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}