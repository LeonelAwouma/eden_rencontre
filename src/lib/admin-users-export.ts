// Export Excel (.xlsx) des membres, pour l'admin : une ligne par membre, des colonnes lisibles
// (libellés français, dates au format jj/mm/aaaa, pourcentages). Côté serveur uniquement.
//
// Volontairement absents : le selfie et les photos (stockage privé), les réponses du questionnaire
// (certaines sections sont privées : santé…) et tout identifiant technique autre que l'identifiant du membre.

import ExcelJS from "exceljs";
import { getProfileCompletion } from "@/lib/profile-completion";
import { checkQuestionnaireCompletion } from "@/lib/onboarding";
import { normalizeGender } from "@/lib/verses";
import { summarizeFormation } from "@/lib/formation/admin-summary";

export type ProfileRow = Record<string, unknown>;

const STATUS: Record<string, string> = { pending: "En attente", approved: "Approuvé", rejected: "Rejeté", suspended: "Suspendu" };
const BADGE: Record<string, string> = { verified: "Vérifié", under_review: "En cours d'examen", rejected: "Refusé", none: "Non vérifié" };
const PLAN: Record<string, string> = { free: "Gratuit", essentiel: "Essentiel", premium: "Premium", elite: "Élite" };
const GENDER: Record<string, string> = { homme: "Homme", femme: "Femme" };

/** Texte nettoyé : espaces de bord retirés, espaces multiples réduits (« Lucie  Fanta » → « Lucie Fanta »). */
const text = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const yesNo = (v: unknown) => (v ? "Oui" : "Non");

/** Date seule (jj/mm/aaaa) : on évite l'heure, qui dépendrait du fuseau du lecteur. */
function toDate(v: unknown): Date | null {
  const s = text(v);
  if (!s) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00Z` : s);
  return Number.isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function ageOf(birth: Date | null, now = new Date()): number | null {
  if (!birth) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

interface Column { header: string; key: string; width: number; kind?: "date" | "int" | "percent" | "text" }

export const MEMBER_COLUMNS: Column[] = [
  { header: "Prénom", key: "firstName", width: 16 },
  { header: "Nom", key: "lastName", width: 18 },
  { header: "Nom complet", key: "fullName", width: 24 },
  { header: "Pseudo", key: "pseudo", width: 16 },
  { header: "Sexe", key: "gender", width: 9 },
  { header: "Date de naissance", key: "birthDate", width: 16, kind: "date" },
  { header: "Âge", key: "age", width: 7, kind: "int" },
  { header: "E-mail", key: "email", width: 32 },
  { header: "Téléphone", key: "phone", width: 18, kind: "text" },
  { header: "Pays", key: "country", width: 16 },
  { header: "Région", key: "region", width: 14 },
  { header: "Ville", key: "city", width: 16 },
  { header: "Situation familiale", key: "civilStatus", width: 18 },
  { header: "Profession", key: "profession", width: 24 },
  { header: "Statut du compte", key: "status", width: 16 },
  { header: "Profil vérifié", key: "badge", width: 18 },
  { header: "Selfie vérifié", key: "selfie", width: 13 },
  { header: "Profil complété", key: "profilePct", width: 14, kind: "percent" },
  { header: "Questionnaire terminé", key: "onboarding", width: 20 },
  { header: "Questionnaire (% répondu)", key: "questionnairePct", width: 22, kind: "percent" },
  { header: "Leçons terminées", key: "lessons", width: 16, kind: "int" },
  { header: "Formation (%)", key: "formationPct", width: 13, kind: "percent" },
  { header: "Offre", key: "plan", width: 11 },
  { header: "Comment nous a connus", key: "source", width: 22 },
  { header: "Inscrit le", key: "createdAt", width: 12, kind: "date" },
  { header: "Dernière visite", key: "lastVisit", width: 14, kind: "date" },
];

/** Une ligne d'export à partir d'une ligne de `profiles`. */
export function buildMemberRow(p: ProfileRow, now = new Date()): Record<string, string | number | Date | null> {
  const birth = toDate(p.birth_date);
  const answers = p.questionnaire && typeof p.questionnaire === "object" ? (p.questionnaire as Record<string, unknown>) : {};
  const questionnaire = checkQuestionnaireCompletion(answers, { excludeOptional: true });
  const formation = summarizeFormation(p.formation_completed);
  const gender = normalizeGender(text(p.gender));
  return {
    firstName: text(p.first_name) || null,
    lastName: text(p.last_name) || null,
    fullName: text(p.name) || null,
    pseudo: text(p.pseudo) || null,
    gender: gender ? GENDER[gender] : null,
    birthDate: birth,
    age: ageOf(birth, now),
    email: text(p.email) || null,
    phone: text(p.phone) || null,
    country: text(p.country) || null,
    region: text(p.region) || null,
    city: text(p.city) || null,
    civilStatus: text(p.civil_status) || null,
    profession: text(p.profession) || null,
    status: STATUS[text(p.status)] ?? (text(p.status) || null),
    badge: BADGE[text(p.verification_status) || "none"] ?? BADGE.none,
    selfie: yesNo(p.selfie_verified),
    profilePct: getProfileCompletion(p).percentage / 100,
    onboarding: yesNo(p.onboarding_completed),
    // Un questionnaire jamais commencé s'affiche 0 %, pas « vide ».
    questionnairePct: Object.keys(answers).length ? questionnaire.percentage / 100 : 0,
    lessons: formation.done,
    formationPct: formation.percent / 100,
    plan: PLAN[text(p.subscription_plan)] ?? (text(p.subscription_plan) || null),
    source: text(p.discovery_source) || null,
    createdAt: toDate(p.created_at),
    lastVisit: toDate(p.last_member_visit_at),
  };
}

export interface ExportMeta { generatedAt: Date; filters: string[] }

/** Classeur : feuille « Membres » (en-tête figé, filtres, largeurs) et feuille « Informations ». */
export async function buildMembersWorkbook(rows: ProfileRow[], meta: ExportMeta): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Garden of Alliance";
  wb.created = meta.generatedAt;

  const ws = wb.addWorksheet("Membres", { views: [{ state: "frozen", ySplit: 1, xSplit: 3 }] });
  ws.columns = MEMBER_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  for (const p of rows) ws.addRow(buildMemberRow(p, meta.generatedAt));

  const head = ws.getRow(1);
  head.height = 30;
  head.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF486B46" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
  MEMBER_COLUMNS.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    if (c.kind === "date") col.numFmt = "dd/mm/yyyy";
    else if (c.kind === "percent") col.numFmt = "0%";
    else if (c.kind === "int") col.numFmt = "0";
    else if (c.kind === "text") col.numFmt = "@";
    if (c.kind === "int" || c.kind === "percent" || c.kind === "date") col.alignment = { horizontal: "center" };
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: MEMBER_COLUMNS.length } };

  const info = wb.addWorksheet("Informations");
  info.columns = [{ width: 26 }, { width: 70 }];
  const lines: [string, string][] = [
    ["Export", "Membres — Garden of Alliance"],
    ["Généré le", meta.generatedAt.toLocaleString("fr-FR", { timeZone: "Africa/Douala", dateStyle: "long", timeStyle: "short" })],
    ["Nombre de membres", String(rows.length)],
    ["Filtres appliqués", meta.filters.length ? meta.filters.join(" · ") : "Aucun (tous les membres)"],
    ["Confidentialité", "Fichier contenant des données personnelles (e-mail, téléphone) : à ne pas diffuser et à supprimer quand il n'est plus utile."],
    ["Non inclus", "Selfie, photos, réponses du questionnaire (dont les sections privées)."],
    ["Prénom / Nom", "Renseignés pour les membres qui les ont saisis séparément ; « Nom complet » est toujours celui du profil."],
  ];
  lines.forEach(([k, v]) => {
    const r = info.addRow([k, v]);
    r.getCell(1).font = { bold: true };
    r.getCell(2).alignment = { wrapText: true, vertical: "top" };
    r.getCell(1).alignment = { vertical: "top" };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
