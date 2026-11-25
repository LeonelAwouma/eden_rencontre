// Forum — aide côté serveur pour les routes /api/forum/messages (envoi et modification).

import { validateMessage } from "@/lib/moderation";

export { FORUM_CANNOT_POST, FORUM_CONTACT_BLOCKED } from "@/lib/forum-shared";

/** Identique à la contrainte SQL de forum_messages.body. */
export const FORUM_BODY_MAX = 2000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

/**
 * Modération du texte d'un message du forum. Le groupe est lu par tous les membres :
 * aucune coordonnée n'y est jamais admise, quel que soit le niveau de confiance.
 * Renvoie la raison du refus, ou null si le texte peut être publié.
 */
export async function moderateForumText(userId: string, text: string): Promise<string | null> {
  try {
    const mod = await validateMessage({
      senderId: userId,
      receiverId: "",
      conversationId: "forum",
      content: text,
      alwaysBlockContacts: true,
    });
    if (mod.allowed) return null;
    return mod.blockReason || mod.warnings?.[0] || "Message bloqué par le système de modération.";
  } catch (err) {
    // Panne du moteur : même règle que le chat privé, le message part et l'incident est journalisé.
    console.error("[forum] modération indisponible, message autorisé:", err);
    return null;
  }
}
