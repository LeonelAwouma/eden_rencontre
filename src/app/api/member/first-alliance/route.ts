import { NextRequest, NextResponse } from "next/server";
import { requireApprovedMember } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import { isProfileFullyComplete } from "@/lib/profile-completion";
import { isPillarOneCompleteLight } from "@/lib/formation/structure";
import { computeFirstAllianceStep } from "@/lib/first-alliance-journey";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/member/first-alliance — où en est le membre connecté dans sa première alliance.
 * L'identité vient UNIQUEMENT de la session. Lecture seule : aucune demande, aucun message,
 * aucune conversation n'est créé ici. Le compte technique Admin est exclu de toute détection.
 */
export async function GET(req: NextRequest) {
  const user = await requireApprovedMember(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });
  const me = user.id;
  const fail = () => NextResponse.json({ error: "Impossible de charger le parcours." }, { status: 500, headers: NO_STORE });

  const db = getSupabaseAdmin();
  const [{ data: profile, error: pErr }, { data: adminRow }] = await Promise.all([
    db.from("profiles")
      .select("verification_status, avatar_url, name, bio, city, profession, civil_status, marriage_vision, formation_completed")
      .eq("id", me).maybeSingle(),
    db.from("profiles").select("id").eq("email", ADMIN_SYSTEM_EMAIL).maybeSingle(),
  ]);
  if (pErr) return fail();
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404, headers: NO_STORE });
  const adminId: string | null = adminRow?.id ?? null;

  const verified = profile.verification_status === "verified";
  const profileComplete = isProfileFullyComplete(profile);
  const completed = Array.isArray(profile.formation_completed) ? (profile.formation_completed as string[]) : [];
  const pillarOneDone = isPillarOneCompleteLight(completed);

  // Inutile d'aller plus loin : l'accompagnement n'est pas affiché.
  if (!verified || !profileComplete) {
    return NextResponse.json({ step: "hidden", friendId: null, conversationId: null, pendingIncoming: 0, pendingOutgoing: 0 }, { headers: NO_STORE });
  }

  const { data: friendships, error: fErr } = await db.from("friendships")
    .select("requester_id, addressee_id, status, updated_at")
    .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
    .in("status", ["pending", "accepted"])
    .order("updated_at", { ascending: false })
    .limit(500);
  if (fErr) return fail();

  const acceptedFriendIds: string[] = [];
  let pendingIncoming = 0;
  let pendingOutgoing = 0;
  for (const f of friendships || []) {
    const other = f.requester_id === me ? f.addressee_id : f.requester_id;
    if (other === adminId) continue;
    if (f.status === "accepted") acceptedFriendIds.push(other);
    else if (f.addressee_id === me) pendingIncoming++;
    else pendingOutgoing++;
  }

  // Conversations directes avec les amis acceptés, et existence d'un message écrit par ce membre.
  const conversationByFriend: Record<string, string> = {};
  let hasSentMessageToMember = false;
  if (acceptedFriendIds.length) {
    const { data: mine, error: mErr } = await db.from("conversation_members").select("conversation_id").eq("user_id", me);
    if (mErr) return fail();
    const myConvIds = (mine || []).map((m) => m.conversation_id as string);
    if (myConvIds.length) {
      const { data: others, error: oErr } = await db.from("conversation_members")
        .select("conversation_id, user_id").in("conversation_id", myConvIds).in("user_id", acceptedFriendIds);
      if (oErr) return fail();
      for (const o of others || []) conversationByFriend[o.user_id as string] = o.conversation_id as string;
      const friendConvIds = Object.values(conversationByFriend);
      if (friendConvIds.length) {
        const { data: sent, error: sErr } = await db.from("messages").select("id")
          .eq("sender_id", me).in("conversation_id", friendConvIds).limit(1);
        if (sErr) return fail();
        hasSentMessageToMember = (sent || []).length > 0;
      }
    }
  }

  const result = computeFirstAllianceStep({
    verified, profileComplete, pillarOneDone, acceptedFriendIds, pendingIncoming, pendingOutgoing,
    hasSentMessageToMember, conversationByFriend,
  });
  return NextResponse.json({ ...result, pendingIncoming, pendingOutgoing }, { headers: NO_STORE });
}
