/**
 * Classement des échecs de `auth.admin.createUser` lors de la création d'un compte Coach (module PUR).
 *
 * Ordre de décision : (1) `error.code` ; (2) `error.name` ; (3) le statut HTTP, seulement comme élément complémentaire.
 * Le TEXTE de `error.message` n'est JAMAIS analysé ni renvoyé : il peut contenir des données personnelles.
 * Le 409 est réservé aux vrais conflits (adresse déjà utilisée).
 */

export type CreateUserErrorCode =
  | "email_exists" | "weak_password" | "invalid_email" | "auth_validation_failed" | "email_provider_disabled"
  | "supabase_admin_auth_rejected" | "auth_rate_limited" | "auth_internal_error" | "auth_create_failed" | "server_misconfigured";

export interface CreateUserFailure { code: CreateUserErrorCode; status: number; message: string }

export interface AuthErrorInfo { code?: unknown; name?: unknown; status?: unknown }

const MESSAGES: Record<CreateUserErrorCode, { status: number; message: string }> = {
  email_exists: { status: 409, message: "Ce numéro de téléphone est déjà associé à un compte existant. Utilisez un autre numéro." },
  weak_password: { status: 422, message: "Mot de passe refusé par la politique de sécurité : choisissez-en un plus long et aléatoire." },
  invalid_email: { status: 400, message: "Adresse e-mail refusée par le service d'authentification." },
  auth_validation_failed: { status: 400, message: "Le service d'authentification a refusé la demande (validation) : vérifiez les champs saisis." },
  email_provider_disabled: { status: 500, message: "Le fournisseur e-mail est désactivé dans Supabase Auth." },
  supabase_admin_auth_rejected: { status: 500, message: "L'authentification serveur auprès de Supabase est refusée : vérifiez la clé configurée dans Vercel (type de clé, rotation récente)." },
  auth_rate_limited: { status: 429, message: "Trop de requêtes vers le service d'authentification : réessayez dans quelques minutes." },
  auth_internal_error: { status: 502, message: "Erreur interne de Supabase Auth (elle peut venir d'un déclencheur ou d'un objet de base) : consultez les journaux Auth et base de données." },
  auth_create_failed: { status: 502, message: "Création impossible : cause non identifiée, consultez les journaux serveur." },
  server_misconfigured: { status: 500, message: "Configuration serveur Supabase incomplète : vérifiez les variables d'environnement." },
};

export const failure = (code: CreateUserErrorCode): CreateUserFailure => ({ code, ...MESSAGES[code] });

const BY_CODE: Record<string, CreateUserErrorCode> = {
  email_exists: "email_exists", user_already_exists: "email_exists",
  weak_password: "weak_password",
  email_address_invalid: "invalid_email",
  validation_failed: "auth_validation_failed",
  email_provider_disabled: "email_provider_disabled",
  bad_jwt: "supabase_admin_auth_rejected", no_authorization: "supabase_admin_auth_rejected", not_admin: "supabase_admin_auth_rejected",
  over_request_rate_limit: "auth_rate_limited",
  unexpected_failure: "auth_internal_error",
};

const BY_NAME: Record<string, CreateUserErrorCode> = {
  AuthWeakPasswordError: "weak_password",
  AuthRetryableFetchError: "auth_internal_error",
};

export function classifyCreateUserError(e: AuthErrorInfo | null | undefined): CreateUserFailure {
  const code = typeof e?.code === "string" ? e.code : undefined;
  const name = typeof e?.name === "string" ? e.name : undefined;
  const status = typeof e?.status === "number" ? e.status : undefined;
  if (code && BY_CODE[code]) return failure(BY_CODE[code]);
  if (name && BY_NAME[name]) return failure(BY_NAME[name]);
  // Statut HTTP : complément uniquement, jamais prioritaire sur un code connu.
  if (status === 401 || status === 403) return failure("supabase_admin_auth_rejected");
  if (status === 429) return failure("auth_rate_limited");
  if (status !== undefined && status >= 500) return failure("auth_internal_error");
  return failure("auth_create_failed");
}

const SAFE_TOKEN = /^[A-Za-z0-9_.-]{1,64}$/;

/** Informations de diagnostic ASSAINIES pour le journal serveur : jamais le message brut, jamais de secret. */
export function sanitizedDiagnostic(e: AuthErrorInfo | null | undefined, apiCode: CreateUserErrorCode) {
  const token = (v: unknown) => (typeof v === "string" && SAFE_TOKEN.test(v) ? v : null);
  return { code: token(e?.code), name: token(e?.name), status: typeof e?.status === "number" ? e.status : null, apiCode };
}
