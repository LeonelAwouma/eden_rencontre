"use client";

// Authentification — Supabase Auth si configuré, sinon repli localStorage.
// Le profil (nom, ville, valeurs…) est stocké dans les métadonnées utilisateur Supabase.

import { supabase } from "./supabase";

export interface EdenUser {
  id?: string;
  name: string;
  pseudo?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  gender?: string;
  birthDate?: string; // ISO (AAAA-MM-JJ) — choisi à l'inscription, 18 ans minimum
  discoverySource?: string;
  civilStatus?: string;
  region?: string;
  country?: string;
  city?: string;
  marriageVision?: string[];
  photos?: (string | null)[];
  bio?: string;
  profession?: string;
  avatar_url?: string | null;
  createdAt?: string;
}

// Champs modifiables par l'utilisateur (email, sexe, etc. exclus — verrouillés)
export type EditableProfile = Partial<Pick<EdenUser, "name" | "pseudo" | "city" | "country" | "civilStatus" | "profession" | "bio" | "marriageVision" | "avatar_url">>;

export type RegisterInput = Omit<EdenUser, "createdAt"> & { password: string };
export type AuthResult = { ok: true; user: EdenUser } | { ok: false; error: string };

// Âge minimum requis à l'inscription.
export const MIN_AGE = 18;

// Calcule l'âge (en années) à partir d'une date de naissance ISO. null si invalide.
export function ageFromBirthDate(iso?: string | null): number | null {
  if (!iso) return null;
  const b = new Date(iso);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// ─────────────────────────────────────────────────────────────
// Supabase
// ─────────────────────────────────────────────────────────────
function mapSupabaseUser(u: any): EdenUser {
  const m = (u?.user_metadata as Record<string, any>) || {};
  return {
    id: u?.id,
    name: m.name || m.full_name || (u?.email ? String(u.email).split("@")[0] : "Membre"),
    pseudo: m.pseudo,
    firstName: m.firstName,
    lastName: m.lastName,
    email: u?.email || "",
    gender: m.gender,
    birthDate: m.birthDate,
    discoverySource: m.discoverySource,
    civilStatus: m.civilStatus,
    region: m.region,
    country: m.country,
    city: m.city,
    marriageVision: m.marriageVision,
    bio: m.bio,
    profession: m.profession,
    avatar_url: m.avatar_url,
    createdAt: u?.created_at,
  };
}

function translateError(message: string): string {
  if (/Email not confirmed/i.test(message)) return "Votre email n'est pas encore confirmé.";
  if (/Invalid login credentials/i.test(message)) return "Email ou mot de passe incorrect.";
  if (/already registered|already exists/i.test(message)) return "Un compte existe déjà avec cet email.";
  if (/Password should be at least/i.test(message)) return "Le mot de passe doit contenir au moins 6 caractères.";
  return message;
}

// ─────────────────────────────────────────────────────────────
// Repli localStorage
// ─────────────────────────────────────────────────────────────
const USERS_KEY = "eden_users";
const SESSION_KEY = "eden_session";

type LocalUser = EdenUser & { password: string };

function readUsers(): LocalUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as LocalUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: LocalUser[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ─────────────────────────────────────────────────────────────
// API publique (asynchrone)
// ─────────────────────────────────────────────────────────────
export async function registerUser(data: RegisterInput): Promise<AuthResult> {
  const email = data.email.trim().toLowerCase();
  if (!email || !data.password) {
    return { ok: false, error: "Email et mot de passe requis." };
  }

  if (supabase) {
    const { password, photos, ...meta } = data;
    const { data: res, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { ...meta, name: data.name } },
    });
    if (error) return { ok: false, error: translateError(error.message) };
    // On déconnecte la session ouverte par signUp : l'utilisateur doit se connecter ensuite.
    await supabase.auth.signOut();
    return { ok: true, user: res.user ? mapSupabaseUser(res.user) : mapSupabaseUser({ email }) };
  }

  // Repli localStorage
  const users = readUsers();
  const { password, ...rest } = data;
  const user: LocalUser = { ...rest, email, password, createdAt: new Date().toISOString() };
  const existing = users.find((u) => u.email === email);
  writeUsers(existing ? users.map((u) => (u.email === email ? user : u)) : [...users, user]);
  return { ok: true, user };
}

export async function loginUser(emailRaw: string, password: string): Promise<AuthResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) {
    return { ok: false, error: "Veuillez renseigner votre email et votre mot de passe." };
  }

  if (supabase) {
    const { data: res, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: translateError(error.message) };
    return { ok: true, user: mapSupabaseUser(res.user) };
  }

  // Repli localStorage
  const user = readUsers().find((u) => u.email === email);
  if (!user) return { ok: false, error: "Aucun compte n'est associé à cet email. Créez votre profil pour rejoindre Garden of Alliance." };
  if (user.password !== password) return { ok: false, error: "Mot de passe incorrect. Veuillez réessayer." };
  window.localStorage.setItem(SESSION_KEY, email);
  return { ok: true, user };
}

// Met à jour le profil (champs modifiables uniquement — email/sexe verrouillés).
export async function updateProfile(updates: EditableProfile): Promise<AuthResult> {
  // On ne garde que les clés définies (évite d'écraser avec undefined)
  const clean: Record<string, any> = {};
  (Object.keys(updates) as (keyof EditableProfile)[]).forEach((k) => {
    if (updates[k] !== undefined) clean[k] = updates[k];
  });

  if (supabase) {
    const { data, error } = await supabase.auth.updateUser({ data: clean });
    if (error) return { ok: false, error: translateError(error.message) };

    // Les métadonnées ne servent qu'à la session : l'admin et les autres membres
    // lisent la table profiles. On y reporte donc les mêmes champs.
    const COLUMNS: Record<string, string> = {
      name: "name", pseudo: "pseudo", city: "city", country: "country", civilStatus: "civil_status",
      profession: "profession", bio: "bio", marriageVision: "marriage_vision", avatar_url: "avatar_url",
    };
    const row: Record<string, any> = {};
    for (const [k, v] of Object.entries(clean)) if (COLUMNS[k]) row[COLUMNS[k]] = v;
    if (data.user?.id && Object.keys(row).length) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", data.user.id);
      if (profileError) console.error("[Eden] report du profil dans la table échoué:", profileError.message);
    }
    return { ok: true, user: mapSupabaseUser(data.user) };
  }

  // Repli localStorage
  const email = window.localStorage.getItem(SESSION_KEY);
  if (!email) return { ok: false, error: "Non connecté." };
  const users = readUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx < 0) return { ok: false, error: "Profil introuvable." };
  users[idx] = { ...users[idx], ...clean };
  writeUsers(users);
  return { ok: true, user: users[idx] };
}

export async function getSession(): Promise<EdenUser | null> {
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    return data.user ? mapSupabaseUser(data.user) : null;
  }
  if (typeof window === "undefined") return null;
  const email = window.localStorage.getItem(SESSION_KEY);
  if (!email) return null;
  return readUsers().find((u) => u.email === email) ?? null;
}

export type AccountStatus = "approved" | "pending" | "rejected" | "suspended";

/**
 * Statut de validation du compte connecté (profiles.status), fixé par l'admin.
 * `null` = pas de session. En cas de doute (profil absent, lecture impossible),
 * on répond "pending" : l'accès n'est jamais accordé par défaut.
 */
export async function getMyAccountStatus(): Promise<{ status: AccountStatus; email: string; profileComplete: boolean; pseudo: string | null; sessionPseudo: string | null } | null> {
  const user = await getSession();
  if (!user) return null;
  const email = user.email || "";
  // Repli localStorage (sans Supabase) : pas de validation admin possible.
  const sessionPseudo = user.pseudo?.trim() || null;
  if (!supabase || !user.id) return { status: "approved", email, profileComplete: true, pseudo: sessionPseudo, sessionPseudo };
  const { data, error } = await supabase.from("profiles").select("status, gender, country, city, pseudo").eq("id", user.id).maybeSingle();
  if (error) {
    console.error("[Eden] lecture du statut du compte impossible:", error.message);
    return { status: "pending", email, profileComplete: true, pseudo: null, sessionPseudo };
  }
  const d = data as any;
  const s = d?.status;
  const status: AccountStatus = s === "approved" || s === "rejected" || s === "suspended" ? s : "pending";
  // Informations de base demandées à l'inscription. Une inscription Google qui a
  // quitté la page « Complétez votre profil » arrive ici sans elles.
  const profileComplete = !!(d?.gender && d?.country && d?.city);
  // Pseudo public : celui du profil (lu par l'admin et les membres), pas celui de la session.
  const pseudo = typeof d?.pseudo === "string" && d.pseudo.trim() ? d.pseudo.trim() : null;
  return { status, email, profileComplete, pseudo, sessionPseudo };
}

export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) {
    return { ok: false, error: "Connexion Google indisponible (Supabase non configuré)." };
  }
  // Redirect to complete-registration page so Google users can fill in missing profile info
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/onboarding/complete-registration` : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) return { ok: false, error: error.message };
  // Redirection gérée par Supabase vers Google puis retour sur /onboarding/complete-registration
  return { ok: true };
}

export async function logout() {
  if (supabase) {
    await supabase.auth.signOut();
    return;
  }
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

// Checks whether the user's profile has all required fields filled in.
// Used to detect Google sign-in users who haven't completed their profile yet.
export function isProfileComplete(user: EdenUser | null): boolean {
  if (!user) return false;
  return !!(
    user.gender &&
    user.birthDate &&
    user.region &&
    user.country &&
    user.city
  );
}

/** Règle commune du pseudonyme public : 2 à 30 caractères, sans < > ni guillemets. */
export function isValidPseudo(pseudo: string): boolean {
  const p = pseudo.trim();
  return p.length >= 2 && p.length <= 30 && !/[<>"]/.test(p);
}

/**
 * Enregistre le pseudonyme dans le profil (lu par l'admin et les membres),
 * puis dans la session. L'échec du profil est remonté : c'est lui qui compte.
 */
export async function saveMyPseudo(pseudo: string): Promise<{ ok: boolean; error?: string }> {
  const p = pseudo.trim();
  if (!isValidPseudo(p)) return { ok: false, error: "Le pseudonyme doit contenir entre 2 et 30 caractères, sans < > ni guillemets." };
  if (!supabase) {
    const res = await updateProfile({ pseudo: p });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  }
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) return { ok: false, error: "Session expirée. Veuillez vous reconnecter." };
  const { error } = await supabase.from("profiles").update({ pseudo: p, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: "Impossible d'enregistrer le pseudonyme. Réessayez." };
  await supabase.auth.updateUser({ data: { pseudo: p } });
  return { ok: true };
}
