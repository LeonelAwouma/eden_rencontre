/**
 * Fiche d'inscription Word (public/formulaires/fiche-inscription-garden-of-alliance.docx).
 *
 * Procédure de secours : un membre qui n'arrive pas à s'inscrire en ligne reçoit
 * la fiche de l'admin (c'est le seul endroit où elle se télécharge : Admin →
 * Import de fichiers), la remplit, et la renvoie sur WhatsApp à l'équipe avec ses
 * 3 photos, envoyées à part (pas dans le document). L'admin importe la fiche :
 * l'adresse e-mail désigne le membre, ou son compte est créé s'il n'existe pas
 * encore, et l'admin lui envoie son mot de passe. Ni le mot de passe, ni le
 * selfie, ni la charte ne viennent de la fiche : le selfie et la charte restent
 * faits par le membre lui-même.
 *
 * Ce module définit les champs de la fiche (libellés repris par
 * scripts/generate-registration-form.mjs), lit la fiche dans le navigateur de
 * l'admin (parseRegistrationForm) et normalise chaque réponse vers la valeur
 * enregistrée à l'inscription en ligne (normalizeFormField, aussi appelée par
 * le serveur avant d'enregistrer).
 */

import { COUNTRIES, findCountry, normalizeSearch, toE164 } from "@/lib/geo";
import { MARRIAGE_VALUES } from "@/lib/values";
import { isAdultBirthDate } from "@/lib/registration-rules";

export const REGISTRATION_FORM_URL = "/formulaires/fiche-inscription-garden-of-alliance.docx";

export type FormFieldKey =
  | "email"
  | "pseudo"
  | "firstName"
  | "lastName"
  | "gender"
  | "birthDate"
  | "phone"
  | "discoverySource"
  | "civilStatus"
  | "country"
  | "city"
  | "marriageVision";

export interface FormFieldDef {
  key: FormFieldKey;
  /** Libellé de la 1re colonne de la fiche — identique dans le générateur. */
  label: string;
  /** Autres libellés acceptés (fiche retouchée par le membre, ancienne version). */
  aliases?: string[];
}

export const FORM_FIELDS: FormFieldDef[] = [
  { key: "email", label: "Adresse e-mail de l'inscription", aliases: ["e-mail", "email", "adresse e-mail", "adresse email", "mail"] },
  { key: "pseudo", label: "Pseudonyme", aliases: ["pseudo"] },
  { key: "firstName", label: "Prénom", aliases: ["prenoms"] },
  { key: "lastName", label: "Nom", aliases: ["nom de famille", "noms"] },
  { key: "gender", label: "Genre", aliases: ["sexe"] },
  { key: "birthDate", label: "Date de naissance", aliases: ["ne le", "nee le", "ne(e) le"] },
  { key: "phone", label: "Téléphone", aliases: ["numero de telephone", "telephone whatsapp", "numero whatsapp"] },
  { key: "discoverySource", label: "Comment nous avez-vous connus ?", aliases: ["comment nous avez-vous trouve ?", "source"] },
  { key: "civilStatus", label: "Situation", aliases: ["situation matrimoniale", "statut"] },
  { key: "country", label: "Pays de résidence", aliases: ["pays"] },
  { key: "city", label: "Ville", aliases: ["ville de residence"] },
  { key: "marriageVision", label: "Vos valeurs (3 au maximum)", aliases: ["vos valeurs", "valeurs"] },
];

export const fieldLabel = (key: FormFieldKey) => FORM_FIELDS.find((f) => f.key === key)?.label ?? key;

/** Champs enregistrés dans le profil (l'e-mail ne sert qu'à retrouver le membre). */
export const PROFILE_FORM_KEYS = FORM_FIELDS.map((f) => f.key).filter((k) => k !== "email") as Exclude<FormFieldKey, "email">[];

export type FormValue = string | string[];
export type NormalizedField = { ok: true; value: FormValue } | { ok: false; message: string };

export const CIVIL_STATUSES = ["Célibataire", "Veuf / Veuve", "Divorcé(e)"];
export const DISCOVERY_SOURCES = ["TikTok", "Instagram", "Facebook", "WhatsApp", "Bouche à oreille", "YouTube", "Autre"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNSAFE = /[<>"]/;
const norm = (s: string) => normalizeSearch(s).replace(/[’']/g, "'").replace(/\s+/g, " ");

const FR_MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

/** « 12/03/1990 », « 12-3-1990 », « 1990-03-12 », « 12 mars 1990 » → « 1990-03-12 ». */
export function parseBirthDate(raw: string): string | null {
  const s = norm(raw).replace(/^le /, "").replace(/(\d)(er)\b/, "$1");
  let d: number, m: number, y: number;
  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) { [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]; }
  else if ((match = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/))) { [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])]; }
  else if ((match = s.match(/^(\d{1,2}) ([a-z]+)\.? (\d{4})$/))) {
    const idx = FR_MONTHS.findIndex((name) => name.startsWith(match![2]) && match![2].length >= 3);
    if (idx < 0) return null;
    [d, m, y] = [Number(match[1]), idx + 1, Number(match[3])];
  } else return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Façons courantes d'écrire un pays → nom enregistré (src/lib/geo.ts). */
const COUNTRY_ALIASES: Record<string, string> = {
  rdc: "RD Congo", "congo kinshasa": "RD Congo", "republique democratique du congo": "RD Congo",
  congo: "Congo-Brazzaville", "congo brazza": "Congo-Brazzaville",
  rci: "Côte d'Ivoire", ivoire: "Côte d'Ivoire",
  "etats unis": "USA", "etats unis d'amerique": "USA", us: "USA",
  angleterre: "Royaume-Uni", uk: "Royaume-Uni", rca: "République centrafricaine", centrafrique: "République centrafricaine",
  reunion: "La Réunion", emirats: "Émirats arabes unis", dubai: "Émirats arabes unis",
};

function findCountryLoose(raw: string) {
  const key = (s: string) => norm(s).replace(/[^a-z0-9]+/g, " ").trim();
  const q = key(raw);
  if (!q) return null;
  if (COUNTRY_ALIASES[q] || COUNTRY_ALIASES[norm(raw)]) return findCountry(COUNTRY_ALIASES[q] ?? COUNTRY_ALIASES[norm(raw)]);
  return COUNTRIES.find((c) => key(c.name) === q || key(c.nameEn) === q)
    ?? (q.length >= 4 ? COUNTRIES.find((c) => key(c.name).startsWith(q) || q.startsWith(key(c.name)) || key(c.nameEn).includes(q)) : undefined)
    ?? null;
}

function cleanText(raw: string, max: number, label: string): NormalizedField {
  const v = raw.trim().replace(/\s+/g, " ");
  if (v.length < 2 || v.length > max || UNSAFE.test(v)) return { ok: false, message: `${label} : entre 2 et ${max} caractères, sans < > ".` };
  return { ok: true, value: v };
}

/**
 * Réponse de la fiche (ou valeur déjà normalisée) → valeur enregistrée.
 * `country` : pays déjà retenu, pour l'indicatif du téléphone et l'orthographe de la ville.
 */
export function normalizeFormField(key: FormFieldKey, input: unknown, ctx: { country?: string | null } = {}): NormalizedField {
  if (Array.isArray(input)) input = input.join(", ");
  if (typeof input !== "string" || !input.trim()) return { ok: false, message: "Champ vide." };
  const raw = input.trim();
  const n = norm(raw);

  switch (key) {
    case "email": {
      const v = raw.toLowerCase().replace(/\s+/g, "");
      return EMAIL_REGEX.test(v) ? { ok: true, value: v } : { ok: false, message: "Adresse e-mail invalide." };
    }
    case "pseudo":
      return cleanText(raw, 30, "Pseudonyme");
    case "firstName":
      return cleanText(raw, 60, "Prénom");
    case "lastName":
      return cleanText(raw, 60, "Nom");
    case "gender": {
      const male = /\b(homme|masculin|male|man|h|m)\b/.test(n);
      const female = /\b(femme|feminin|female|woman|f)\b/.test(n);
      if (male === female) return { ok: false, message: "Genre : indiquez « Homme » ou « Femme »." };
      return { ok: true, value: male ? "homme" : "femme" };
    }
    case "birthDate": {
      const iso = parseBirthDate(raw);
      if (!iso || !isAdultBirthDate(iso)) return { ok: false, message: "Date de naissance invalide (JJ/MM/AAAA, 18 ans minimum)." };
      return { ok: true, value: iso };
    }
    case "phone": {
      const compact = raw.replace(/[^\d+]/g, "");
      let e164: string | null = null;
      if (compact.startsWith("+")) e164 = compact;
      else if (compact.startsWith("00")) e164 = `+${compact.slice(2)}`;
      else {
        const dial = findCountry(ctx.country)?.dial;
        if (dial) e164 = toE164(dial, compact);
      }
      if (!e164 || !/^\+\d{8,15}$/.test(e164)) return { ok: false, message: "Téléphone invalide : écrivez-le avec l'indicatif (ex. +237 6 90 12 34 56)." };
      return { ok: true, value: e164 };
    }
    case "discoverySource": {
      const found = DISCOVERY_SOURCES.find((s) => n.includes(norm(s)))
        ?? (/(bouche|oreille|ami|famille|eglise|connaissance)/.test(n) ? "Bouche à oreille" : null);
      return { ok: true, value: found ?? "Autre" };
    }
    case "civilStatus": {
      if (/celibat/.test(n)) return { ok: true, value: CIVIL_STATUSES[0] };
      if (/veu[fv]/.test(n)) return { ok: true, value: CIVIL_STATUSES[1] };
      if (/divorc/.test(n)) return { ok: true, value: CIVIL_STATUSES[2] };
      return { ok: false, message: "Situation : Célibataire, Veuf / Veuve ou Divorcé(e)." };
    }
    case "country": {
      const c = findCountryLoose(raw);
      return c ? { ok: true, value: c.name } : { ok: false, message: `Pays « ${raw} » non reconnu.` };
    }
    case "city": {
      const known = findCountry(ctx.country)?.cities.find((c) => norm(c) === n);
      return known ? { ok: true, value: known } : cleanText(raw, 60, "Ville");
    }
    case "marriageVision": {
      const parts = raw.split(/[,;/\n•·]|\s-\s|\bet\b/).map(norm).filter(Boolean);
      const ids: string[] = [];
      for (const p of parts) {
        const v = MARRIAGE_VALUES.find((mv) => mv.id === p || norm(mv.label) === p)
          ?? MARRIAGE_VALUES.find((mv) => norm(mv.label).includes(p) || p.includes(norm(mv.label)));
        if (v && !ids.includes(v.id)) ids.push(v.id);
      }
      if (ids.length === 0) return { ok: false, message: "Valeurs non reconnues." };
      return { ok: true, value: ids.slice(0, 3) };
    }
  }
}

/** Région (Afrique / Diaspora) déduite du pays, comme à l'inscription. */
export const regionOfCountry = (country: string | null | undefined) => findCountry(country)?.region ?? null;

/* ───────────────────────────── Lecture du .docx ───────────────────────────── */

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MAX_UNZIPPED = 80 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", heic: "image/heic", heif: "image/heif" };

/** Lecteur ZIP minimal (un .docx est une archive ZIP) : stockés ou « deflate », sans ZIP64. */
async function readZip(buf: ArrayBuffer): Promise<Map<string, () => Promise<Uint8Array>>> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Ce fichier n'est pas un document Word (.docx).");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const entries = new Map<string, () => Promise<Uint8Array>>();
  let total = 0;
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error("Document Word endommagé.");
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const size = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    total += size;
    if (total > MAX_UNZIPPED) throw new Error("Document Word trop volumineux.");
    entries.set(name, async () => {
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = bytes.slice(start, start + compSize);
      if (method === 0) return data;
      if (method !== 8) throw new Error("Compression du document non prise en charge.");
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    });
  }
  return entries;
}

const paragraphsOf = (el: Element) =>
  Array.from(el.getElementsByTagNameNS(W_NS, "p"))
    .map((para) => Array.from(para.getElementsByTagNameNS(W_NS, "t")).map((t) => t.textContent ?? "").join("").trim())
    .filter(Boolean);

function matchField(label: string): FormFieldDef | null {
  const l = norm(label).replace(/\s*[:*]\s*$/, "");
  if (!l) return null;
  return FORM_FIELDS.find((f) => norm(f.label) === l || f.aliases?.some((a) => norm(a) === l)) ?? null;
}

export interface FormIssue { key: FormFieldKey; raw: string; message: string }

export interface ParsedRegistrationForm {
  /** Valeurs normalisées, prêtes à enregistrer (email : pour retrouver le membre). */
  values: Partial<Record<FormFieldKey, FormValue>>;
  /** Réponses illisibles : montrées à l'admin, jamais enregistrées. */
  issues: FormIssue[];
  /** Photos collées dans la fiche, dans l'ordre du document. */
  photos: File[];
  /** Nombre de champs de la fiche reconnus (0 : ce n'est pas la fiche d'inscription). */
  recognized: number;
}

/** Lit la fiche d'inscription remplie (navigateur uniquement : DOMParser, DecompressionStream). */
export async function parseRegistrationForm(file: Blob): Promise<ParsedRegistrationForm> {
  const zip = await readZip(await file.arrayBuffer());
  const docEntry = zip.get("word/document.xml");
  if (!docEntry) throw new Error("Ce fichier n'est pas un document Word (.docx).");
  const decoder = new TextDecoder();
  const doc = new DOMParser().parseFromString(decoder.decode(await docEntry()), "application/xml");

  // Réponses : tableaux « libellé | réponse ».
  const raw = new Map<FormFieldKey, string>();
  for (const row of Array.from(doc.getElementsByTagNameNS(W_NS, "tr"))) {
    const cells = Array.from(row.children).filter((c) => c.namespaceURI === W_NS && c.localName === "tc");
    if (cells.length < 2) continue;
    const field = matchField(paragraphsOf(cells[0])[0] ?? "");
    if (!field || raw.has(field.key)) continue;
    const answer = cells.slice(1).flatMap(paragraphsOf).join(", ").trim();
    if (answer) raw.set(field.key, answer);
    else raw.set(field.key, "");
  }

  const values: ParsedRegistrationForm["values"] = {};
  const issues: FormIssue[] = [];
  // Pays d'abord : il sert à l'indicatif du téléphone et à l'orthographe de la ville.
  const order: FormFieldKey[] = ["country", ...FORM_FIELDS.map((f) => f.key).filter((k) => k !== "country")];
  for (const key of order) {
    const answer = raw.get(key);
    if (!answer) continue;
    const res = normalizeFormField(key, answer, { country: values.country as string | undefined });
    if (res.ok) values[key] = res.value;
    else issues.push({ key, raw: answer, message: res.message });
  }

  // Photos : images du corps du document, dans l'ordre d'apparition.
  const photos: File[] = [];
  const relsEntry = zip.get("word/_rels/document.xml.rels");
  if (relsEntry) {
    const rels = new DOMParser().parseFromString(decoder.decode(await relsEntry()), "application/xml");
    const targets = new Map<string, string>();
    for (const rel of Array.from(rels.getElementsByTagName("Relationship"))) {
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target && rel.getAttribute("TargetMode") !== "External") targets.set(id, target);
    }
    const refs = [
      ...Array.from(doc.getElementsByTagNameNS(A_NS, "blip")).map((b) => b.getAttributeNS(R_NS, "embed")),
      ...Array.from(doc.getElementsByTagName("v:imagedata")).map((b) => b.getAttributeNS(R_NS, "id")),
    ];
    const seen = new Set<string>();
    for (const ref of refs) {
      const target = ref ? targets.get(ref) : undefined;
      if (!target) continue;
      const path = target.startsWith("/") ? target.slice(1) : `word/${target}`.replace(/\/[^/]+\/\.\.\//g, "/");
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const entry = zip.get(path);
      if (seen.has(path) || !entry || !IMAGE_TYPES[ext]) continue;
      seen.add(path);
      const data = await entry();
      photos.push(new File([data], path.split("/").pop() || `photo.${ext}`, { type: IMAGE_TYPES[ext] }));
    }
  }

  return { values, issues, photos, recognized: raw.size };
}
