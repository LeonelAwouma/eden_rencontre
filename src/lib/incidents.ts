// Pannes vécues par les membres, lues dans les notifications admin « système ».
//
// Les pannes arrivent de trois endroits (toutes dans admin_notifications, type « system ») :
//  - /api/client-incident : « Panne vécue par un membre » (metadata.kind) ;
//  - src/lib/registration-incident.ts : « Inscription en échec » (metadata.step) ;
//  - /api/cron/account-health : « Contrôle des comptes » (e-mails en panne, comptes sans profil).
// Ce module les reconnaît, les explique en français et regroupe les répétitions.
// Il ne lit ni n'écrit rien : la base est interrogée par /api/admin/incidents.

export type IncidentCategory = "access" | "registration" | "health";
export type IncidentSeverity = "high" | "medium" | "low";

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  access: "Accès à l'espace membre",
  registration: "Inscription",
  health: "Contrôle des comptes",
};

interface KindInfo {
  category: IncidentCategory;
  label: string;
  severity: IncidentSeverity;
  explanation: string;
  advice: string;
}

const KINDS: Record<string, KindInfo> = {
  // ── Panne vécue par un membre (metadata.kind) ──
  account_status_unreadable: {
    category: "access", label: "Statut du compte illisible", severity: "high",
    explanation: "Le site n'a pas pu lire le statut du compte du membre (erreur technique, pas un refus). Le membre voit un écran d'erreur au lieu de son espace.",
    advice: "Lancez le contrôle des comptes (Admin → Utilisateurs → À traiter). Si plusieurs membres sont touchés en même temps, vérifiez l'état de la base de données.",
  },
  session_check_failed: {
    category: "access", label: "Vérification de session en échec", severity: "high",
    explanation: "La vérification de la session du membre a échoué : jeton refusé, jeton trop lourd ou connexion coupée. Un détail « Failed to fetch » signifie que le navigateur n'a pas pu joindre le serveur (réseau coupé ou instable).",
    advice: "Demandez au membre de recharger la page ou de se reconnecter. Si la cause revient pour le même membre, ouvrez sa fiche pour contrôler son compte.",
  },
  pending_status_unreadable: {
    category: "access", label: "Page d'attente : statut illisible", severity: "high",
    explanation: "Sur la page « en attente », le statut du compte n'a pas pu être relu : un membre déjà approuvé risque de rester bloqué sur l'attente.",
    advice: "Vérifiez le statut du membre sur sa fiche, puis lancez le contrôle des comptes (Admin → Utilisateurs → À traiter).",
  },
  registration_photo_failed: {
    category: "registration", label: "Inscription : photo impossible à préparer", severity: "high",
    explanation: "Une photo n'a pas pu être préparée (réduction de taille) sur l'appareil du membre. Le détail indique le type et le poids de l'image ainsi que le navigateur.",
    advice: "Le membre peut réessayer avec une autre photo. À défaut, importez ses photos depuis Admin → Photos pour le débloquer.",
  },
  registration_upload_failed: {
    category: "registration", label: "Inscription : envoi des photos en échec", severity: "high",
    explanation: "L'envoi des photos vers le serveur a échoué depuis le navigateur du membre. « Failed to fetch » signifie que la connexion a été interrompue (réseau mobile instable, photos lourdes).",
    advice: "Le membre peut réessayer avec une meilleure connexion. À défaut, importez ses photos depuis Admin → Photos pour le débloquer.",
  },
  // ── Inscription en échec (metadata.step) ──
  account_creation: {
    category: "registration", label: "Inscription : création du compte", severity: "high",
    explanation: "Le service d'authentification a refusé de créer le compte. La cause exacte (e-mail déjà utilisé, mot de passe refusé, limite atteinte…) figure dans le détail.",
    advice: "Lisez la cause ci-dessus : selon le cas, le membre doit changer d'adresse ou de mot de passe, ou se connecter s'il a déjà un compte.",
  },
  profile_save: {
    category: "registration", label: "Inscription : enregistrement du profil", severity: "high",
    explanation: "Le compte de connexion a été créé mais la fiche du membre n'a pas pu être enregistrée. Le détail donne la réponse de la base de données.",
    advice: "Ouvrez Admin → Utilisateurs → À traiter : le contrôle des comptes repère et répare les comptes sans profil.",
  },
  google_profile_save: {
    category: "registration", label: "Inscription : complément du profil Google", severity: "high",
    explanation: "Une inscription par Google a été interrompue au moment d'enregistrer le complément du profil (genre, pays, ville…).",
    advice: "Le membre peut se reconnecter et reprendre le formulaire « Complétez votre profil ». Vérifiez sa fiche si l'erreur se répète.",
  },
  unexpected: {
    category: "registration", label: "Inscription : erreur inattendue", severity: "high",
    explanation: "Une erreur non prévue a interrompu l'inscription. Le détail contient le message technique.",
    advice: "Notez le message ci-dessus et contactez le membre pour qu'il réessaie ; si l'erreur se répète, il s'agit d'un défaut du site à corriger.",
  },
};

const HEALTH: KindInfo = {
  category: "health", label: "Contrôle des comptes", severity: "low",
  explanation: "Le contrôle quotidien des comptes a relevé des anomalies : e-mails en panne, comptes de connexion sans profil, réparations faites ou à faire à la main.",
  advice: "Ouvrez Admin → Utilisateurs → À traiter pour voir ce qui reste à régler ; le détail ci-dessus liste ce qui a été réparé automatiquement.",
};

export interface RawNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DeviceInfo { browser: string; os: string; inApp: string | null }

export interface Incident {
  id: string;
  createdAt: string;
  category: IncidentCategory;
  kind: string;
  label: string;
  severity: IncidentSeverity;
  explanation: string;
  advice: string;
  userId: string | null;
  email: string | null;
  path: string | null;
  /** Cause technique brute, sans le navigateur (affichée à part). */
  cause: string;
  device: DeviceInfo | null;
  ip: string | null;
  /** Inscription classique ou Google, pour les échecs d'inscription. */
  flow: string | null;
}

const str = (v: unknown, max = 600) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Navigateur et système lus dans la chaîne user-agent, ainsi que les navigateurs intégrés à une application. */
export function parseUserAgent(ua: string | null): DeviceInfo | null {
  if (!ua) return null;
  const inApp = /FBAN|FBAV|FB_IAB/.test(ua) ? "Facebook" : /Instagram/.test(ua) ? "Instagram" : /Snapchat/.test(ua) ? "Snapchat" : /TikTok|musical_ly/i.test(ua) ? "TikTok" : /WhatsApp/i.test(ua) ? "WhatsApp" : null;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet"
    : /Firefox|FxiOS/.test(ua) ? "Firefox" : /CriOS|Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Navigateur inconnu";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Système inconnu";
  return { browser, os, inApp };
}

/** Sépare « cause — ua=… » : le navigateur est présenté à part, la cause reste lisible. */
export function splitDetail(detail: string | null): { cause: string; ua: string | null } {
  if (!detail) return { cause: "", ua: null };
  const m = /ua=([\s\S]+)$/.exec(detail);
  const ua = m ? m[1].trim() : null;
  const cause = (m ? detail.slice(0, m.index) : detail).replace(/[\s—-]+$/u, "").trim();
  return { cause, ua };
}

/** Reconnaît une notification de panne ; null pour toute autre notification système. */
export function classifyIncident(n: RawNotification): Incident | null {
  const meta = (n.metadata && typeof n.metadata === "object" ? n.metadata : {}) as Record<string, unknown>;
  const kindKey = str(meta.kind) ?? (n.title.startsWith("Inscription en échec") ? str(meta.step) : null);

  let info: KindInfo | undefined;
  let kind = kindKey ?? "";
  if (kindKey && KINDS[kindKey]) info = KINDS[kindKey];
  else if (n.title.startsWith("Contrôle des comptes")) {
    kind = "account_health";
    info = { ...HEALTH, severity: n.title.includes("action requise") ? "high" : "low" };
  }
  if (!info) return null;

  const rawDetail = str(meta.detail) ?? str(meta.cause) ?? (kind === "account_health" ? str(n.message, 1500) : null);
  const { cause, ua } = splitDetail(rawDetail);
  const userId = str(meta.user_id);
  return {
    id: n.id,
    createdAt: n.created_at,
    category: info.category,
    kind,
    label: info.label,
    severity: info.severity,
    explanation: info.explanation,
    advice: info.advice,
    userId: userId && UUID.test(userId) ? userId : null,
    email: str(meta.email, 200),
    path: str(meta.path, 200),
    cause,
    device: parseUserAgent(ua),
    ip: str(meta.ip, 80),
    flow: str(meta.flow, 40),
  };
}

export interface IncidentGroup extends Incident {
  /** Nombre de notifications regroupées (même membre, même type, même page). */
  count: number;
  firstSeen: string;
  lastSeen: string;
}

/** Regroupe les répétitions : même membre (ou, à défaut, même adresse IP), même type, même page. */
export function groupIncidents(list: Incident[]): IncidentGroup[] {
  const groups = new Map<string, IncidentGroup>();
  // Du plus récent au plus ancien : le premier rencontré porte le détail le plus à jour.
  for (const inc of [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const who = inc.userId || inc.email || inc.ip || "anonyme";
    const key = `${inc.kind}|${who}|${inc.path ?? ""}|${inc.kind === "account_health" ? inc.createdAt.slice(0, 10) : ""}`;
    const g = groups.get(key);
    if (g) { g.count += 1; g.firstSeen = inc.createdAt; }
    else groups.set(key, { ...inc, count: 1, firstSeen: inc.createdAt, lastSeen: inc.createdAt });
  }
  return [...groups.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}

export interface IncidentSummary {
  /** Notifications de panne sur la période (répétitions comprises). */
  total: number;
  groups: number;
  /** Membres distincts touchés (identifiés par compte ou adresse e-mail). */
  members: number;
  lastAt: string | null;
  byCategory: Record<IncidentCategory, number>;
  /** type → { label, count } : alimente le filtre « type de panne ». */
  byKind: Record<string, { label: string; category: IncidentCategory; count: number }>;
}

export function summarizeIncidents(list: Incident[]): IncidentSummary {
  const byCategory: IncidentSummary["byCategory"] = { access: 0, registration: 0, health: 0 };
  const byKind: IncidentSummary["byKind"] = {};
  const members = new Set<string>();
  let lastAt: string | null = null;
  for (const i of list) {
    byCategory[i.category] += 1;
    (byKind[i.kind] ||= { label: i.label, category: i.category, count: 0 }).count += 1;
    if (i.category !== "health") members.add(i.userId || i.email || `ip:${i.ip ?? "?"}`);
    if (!lastAt || i.createdAt > lastAt) lastAt = i.createdAt;
  }
  return { total: list.length, groups: groupIncidents(list).length, members: members.size, lastAt, byCategory, byKind };
}
