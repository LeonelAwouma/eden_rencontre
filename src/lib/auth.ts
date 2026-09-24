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
export async function getMyAccountStatus(): Promise<{ status: AccountStatus; email: string } | null> {
  const user = await getSession();
  if (!user) return null;
  const email = user.email || "";
  // Repli localStorage (sans Supabase) : pas de validation admin possible.
  if (!supabase || !user.id) return { status: "approved", email };
  const { data, error } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (error) {
    console.error("[Eden] lecture du statut du compte impossible:", error.message);
    return { status: "pending", email };
  }
  const s = (data as any)?.status;
  const status: AccountStatus = s === "approved" || s === "rejected" || s === "suspended" ? s : "pending";
  return { status, email };
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
