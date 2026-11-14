/**
 * Accompagnement « première alliance » : où en est un membre vérifié ?
 *
 * Logique pure (aucun accès réseau), alimentée par /api/member/first-alliance
 * à partir de données réelles (profiles, friendships, conversation_members, messages).
 * Aucune de ces étapes n'accorde de droit supplémentaire : la découverte, les demandes
 * d'alliance et la messagerie restent protégées côté serveur (are_friends, quotas, modération).
 */

export type FirstAllianceStep =
  /** Rien à afficher : profil non vérifié, incomplet, ou premier échange déjà fait. */
  | "hidden"
  /** Vérifié, mais le pilier 1 de « Bâtir sur le roc » n'est pas terminé : le matching reste verrouillé. */
  | "locked_formation"
  /** Vérifié, aucune demande envoyée ni reçue. */
  | "none"
  /** Demande envoyée, pas encore de réponse. */
  | "request_pending"
  /** Des demandes reçues attendent une réponse. */
  | "request_received"
  /** Alliance acceptée, pas encore de conversation. */
  | "alliance_accepted"
  /** Alliance acceptée, conversation créée mais aucun message de ce membre. */
  | "conversation_empty";

export interface FirstAllianceInput {
  /** verification_status === "verified" */
  verified: boolean;
  /** Profil complet à 100 % (isProfileFullyComplete). */
  profileComplete: boolean;
  /** Pilier 1 terminé (isPillarOneCompleteLight). */
  pillarOneDone: boolean;
  /** Alliances acceptées avec de vrais membres (compte technique Admin exclu), plus récentes d'abord. */
  acceptedFriendIds: string[];
  /** Demandes d'alliance reçues en attente (hors Admin). */
  pendingIncoming: number;
  /** Demandes d'alliance envoyées en attente (hors Admin). */
  pendingOutgoing: number;
  /** Ce membre a déjà écrit au moins un message à un vrai membre (hors Admin). */
  hasSentMessageToMember: boolean;
  /** Conversation directe déjà créée avec un ami accepté : { ami → id de conversation }. */
  conversationByFriend: Record<string, string>;
}

export interface FirstAllianceResult {
  step: FirstAllianceStep;
  /** Ami vers qui proposer le premier message (alliance_accepted / conversation_empty). */
  friendId: string | null;
  conversationId: string | null;
}

export function computeFirstAllianceStep(i: FirstAllianceInput): FirstAllianceResult {
  const out = (step: FirstAllianceStep, friendId: string | null = null, conversationId: string | null = null): FirstAllianceResult =>
    ({ step, friendId, conversationId });

  if (!i.verified || !i.profileComplete) return out("hidden");
  // Premier échange réel déjà fait : l'accompagnement initial n'a plus lieu d'être.
  if (i.hasSentMessageToMember) return out("hidden");

  const friendId = i.acceptedFriendIds[0] ?? null;
  if (friendId) {
    const conversationId = i.conversationByFriend[friendId] ?? null;
    return out(conversationId ? "conversation_empty" : "alliance_accepted", friendId, conversationId);
  }
  if (i.pendingIncoming > 0) return out("request_received");
  if (i.pendingOutgoing > 0) return out("request_pending");
  // Le badge n'ouvre jamais le matching à lui seul : le pilier 1 reste obligatoire.
  return out(i.pillarOneDone ? "none" : "locked_formation");
}
