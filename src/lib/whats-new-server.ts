import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasFeatureAccess } from "@/lib/subscription/effective";
import { PILLAR_LESSON_SLUGS } from "@/lib/formation/structure";
import {
  ANNOUNCEMENTS, effectiveExpiry, isInWindow,
  type Announcement, type AnnouncementView, type AvailabilityKey, type Surface,
} from "@/lib/whats-new";

/**
 * Disponibilité RÉELLE des annonces — SERVEUR UNIQUEMENT.
 *
 * Le registre dit « cette annonce existe et est active » ; ce fichier dit « la
 * fonctionnalité est effectivement activée et accessible à CET utilisateur ».
 * Les deux doivent être vrais. Échec fermé : toute exception, valeur illisible ou
 * clé inconnue vaut « indisponible » — une annonce n'est jamais montrée par défaut.
 */

type Db = ReturnType<typeof getSupabaseAdmin>;

export interface AvailabilityCtx {
  db: Db;
  /** Identifiant du membre, ou `null` (visiteur, administrateur). */
  userId: string | null;
}

const asDate = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? NaN : t;
};

/** Le parrainage est-il activé, et la campagne en cours ? (mêmes clés que /api/referrals/dashboard) */
async function referralOpen({ db }: AvailabilityCtx, now: number): Promise<boolean> {
  const { data, error } = await db.from("platform_settings").select("key, value").eq("category", "referral");
  if (error) return false;
  const get = (key: string) => (data || []).find((r) => r.key === key)?.value;
  if (get("enabled") !== true) return false;
  const start = asDate(get("campaign_start_at"));
  const end = asDate(get("campaign_end_at"));
  if (Number.isNaN(start) || Number.isNaN(end)) return false; // date illisible → on n'annonce pas
  if (start !== null && now < start) return false;
  if (end !== null && now >= end) return false;
  return true;
}

/**
 * Les piliers 2 ET 3 contiennent-ils réellement des leçons ? (les piliers 4 à 6 sont vides :
 * on n'annonce jamais du contenu qui n'existe pas), et le membre peut-il y accéder ?
 */
async function formationPillarsOpen({ db, userId }: AvailabilityCtx): Promise<boolean> {
  const written = (n: number) => (PILLAR_LESSON_SLUGS[n]?.length ?? 0) > 0;
  if (!written(2) || !written(3)) return false;
  if (userId) return hasFeatureAccess(db, userId, "all_formations"); // lecture pure, sans effet de bord
  return true;
}

/** Toute clé du registre DOIT avoir un résolveur : le type `Record` fait échouer la compilation sinon. */
export const RESOLVERS: Record<AvailabilityKey, (ctx: AvailabilityCtx, now: number) => Promise<boolean>> = {
  always: async () => true,
  referral: referralOpen,
  formation_pillars: formationPillarsOpen,
};

export async function isAvailable(a: Announcement, ctx: AvailabilityCtx, now: number = Date.now()): Promise<boolean> {
  try {
    const resolver = RESOLVERS[a.availability];
    if (!resolver) return false;
    return (await resolver(ctx, now)) === true;
  } catch {
    return false;
  }
}

/**
 * Annonces à présenter : surface correcte, `active`, dans la fenêtre de dates ET
 * disponibles pour l'utilisateur. `active: false` élimine l'annonce avant même de
 * consulter un réglage : activer un interrupteur ailleurs ne suffit jamais.
 */
export async function listLive(
  surface: Surface,
  ctx: AvailabilityCtx,
  now: number = Date.now(),
  registry: readonly Announcement[] = ANNOUNCEMENTS,
): Promise<Announcement[]> {
  const candidates = registry.filter((a) => a.surface === surface && isInWindow(a, now));
  const checks = await Promise.all(candidates.map((a) => isAvailable(a, ctx, now)));
  return candidates.filter((_, i) => checks[i]);
}

export type AnnouncementStatus = "inactive" | "scheduled" | "expired" | "unavailable" | "live";

/** Statut lisible pour l'écran d'administration. */
export async function describeStatus(
  a: Announcement,
  ctx: AvailabilityCtx,
  now: number = Date.now(),
): Promise<AnnouncementStatus> {
  if (!a.active) return "inactive";
  if (now < Date.parse(a.activatesAt)) return "scheduled";
  if (now >= effectiveExpiry(a)) return "expired";
  return (await isAvailable(a, ctx, now)) ? "live" : "unavailable";
}

/** Ce que le client reçoit : le strict nécessaire à l'affichage. */
export function toView(
  a: Announcement,
  state: { dismissed?: boolean; discovered?: boolean } = {},
): AnnouncementView {
  return {
    id: a.id,
    surface: a.surface,
    href: a.href,
    navHref: a.navHref,
    priority: a.priority,
    activatesAt: a.activatesAt,
    fr: a.fr,
    en: a.en,
    dismissed: state.dismissed === true,
    discovered: state.discovered === true,
  };
}
