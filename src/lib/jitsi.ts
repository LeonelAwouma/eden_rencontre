// ── Visioconférences Jitsi (JaaS — 8x8) ──────────────────────
// Remplace Google Meet pour les réunions créées depuis l'admin.
//
// Chaque réunion reçoit une salle Jitsi au nom imprévisible. On n'y entre
// qu'avec un jeton (JWT) signé par notre serveur : l'admin comme modérateur,
// les membres invités comme participants. Un inconnu qui devinerait le nom
// de la salle ne pourrait donc pas la rejoindre.
//
// Variables d'environnement (console JaaS → API Keys) :
//   JAAS_APP_ID       vpaas-magic-cookie-xxxxxxxx…
//   JAAS_API_KEY_ID   vpaas-magic-cookie-xxxxxxxx…/abcdef  (identifiant de la clé)
//   JAAS_PRIVATE_KEY  clé privée RSA au format PEM (les « \n » échappés sont acceptés)
//
// SERVEUR UNIQUEMENT : la clé privée ne doit jamais atteindre le navigateur.

import crypto from "crypto";
import { JITSI_SPACE_PREFIX } from "./jitsi-shared";

export const JAAS_DOMAIN = "8x8.vc";

export { JITSI_SPACE_PREFIX };

interface JaasConfig {
  appId: string;
  keyId: string;
  privateKey: string;
}

function getConfig(): JaasConfig | null {
  const appId = process.env.JAAS_APP_ID?.trim();
  const keyId = process.env.JAAS_API_KEY_ID?.trim();
  const privateKey = process.env.JAAS_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!appId || !keyId || !privateKey) return null;
  return { appId, keyId, privateKey };
}

export function isJitsiConfigured(): boolean {
  return getConfig() !== null;
}

/** Nom de salle : lisible (tiré du titre) + suffixe aléatoire impossible à deviner. */
export function newRoomName(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    .slice(0, 40) || "reunion";
  return `${slug}-${crypto.randomBytes(8).toString("hex")}`;
}

/** Salle Jitsi d'une réunion, ou null si c'est une ancienne réunion Google Meet. */
export function roomOf(meet: { space_name: string | null }): string | null {
  return meet.space_name?.startsWith(JITSI_SPACE_PREFIX)
    ? meet.space_name.slice(JITSI_SPACE_PREFIX.length)
    : null;
}

/** Page du site par laquelle un membre invité rejoint la réunion. */
export function memberJoinUrl(meetId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://www.gardenofalliance.com").replace(/\/$/, "");
  return `${base}/reunion/${meetId}`;
}

const b64url = (input: string | Buffer) =>
  Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

export interface JitsiParticipant {
  id: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
}

/**
 * Jeton d'accès JaaS (JWT RS256) pour une salle donnée.
 * `moderator` : l'équipe admin peut exclure, couper les micros, ouvrir la salle d'attente…
 */
function signJaasToken(cfg: JaasConfig, room: string, user: JitsiParticipant, moderator: boolean, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: cfg.keyId };
  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: cfg.appId,
    room,
    iat: now,
    nbf: now - 10,
    exp: now + ttlSeconds,
    context: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email || undefined,
        avatar: user.avatar || undefined,
        moderator: moderator ? "true" : "false",
      },
      features: {
        livestreaming: "false",
        recording: "false",
        transcription: "false",
        "outbound-call": "false",
      },
    },
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), cfg.privateKey);
  return `${unsigned}.${b64url(signature)}`;
}

export interface JitsiJoinInfo {
  domain: string;
  /** Nom complet attendu par l'API Jitsi : « <appId>/<salle> ». */
  roomName: string;
  jwt: string;
  scriptSrc: string;
}

/** Tout ce dont le navigateur a besoin pour ouvrir la salle. Lève une erreur si JaaS n'est pas configuré. */
export function buildJoinInfo(room: string, user: JitsiParticipant, moderator: boolean, ttlSeconds = 4 * 3600): JitsiJoinInfo {
  const cfg = getConfig();
  if (!cfg) throw new Error("JITSI_NOT_CONFIGURED");
  return {
    domain: JAAS_DOMAIN,
    roomName: `${cfg.appId}/${room}`,
    jwt: signJaasToken(cfg, room, user, moderator, ttlSeconds),
    scriptSrc: `https://${JAAS_DOMAIN}/${cfg.appId}/external_api.js`,
  };
}
