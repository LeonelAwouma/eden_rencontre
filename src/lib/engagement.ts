"use client";

// Demande d'engagement envoyée depuis une conversation de chat — voir
// supabase/engagement-schema.sql et src/app/api/engagement/*.

export type EngagementRequestStatus = "none" | "pending" | "accepted" | "declined";

export interface EngagementStatus {
  status: EngagementRequestStatus;
  requestId?: string;
  requesterId?: string;
  recipientId?: string;
}

export async function getEngagementStatus(conversationId: string, userId: string): Promise<EngagementStatus> {
  if (!conversationId || !userId) return { status: "none" };
  try {
    const res = await fetch(`/api/engagement/status?conversationId=${encodeURIComponent(conversationId)}&userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return { status: "none" };
    return await res.json();
  } catch {
    return { status: "none" };
  }
}

export async function sendEngagementRequest(
  conversationId: string,
  requesterId: string,
  recipientId: string
): Promise<{ ok: boolean; requestId?: string; error?: string }> {
  try {
    const res = await fetch("/api/engagement/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, requesterId, recipientId }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Erreur lors de l'envoi de la demande." };
    return { ok: true, requestId: data.requestId };
  } catch {
    return { ok: false, error: "Erreur de connexion au serveur." };
  }
}

export async function respondToEngagementRequest(
  requestId: string,
  responderId: string,
  accept: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/engagement/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, responderId, accept }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Erreur lors de la réponse." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur de connexion au serveur." };
  }
}
