import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyCreateUserError, failure, sanitizedDiagnostic, type CreateUserErrorCode } from "./create-user-errors";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("classifyCreateUserError : code > name > statut", () => {
  const byCode: [string, CreateUserErrorCode, number][] = [
    ["email_exists", "email_exists", 409], ["user_already_exists", "email_exists", 409], ["weak_password", "weak_password", 422],
    ["email_address_invalid", "invalid_email", 400], ["validation_failed", "auth_validation_failed", 400],
    ["email_provider_disabled", "email_provider_disabled", 500], ["bad_jwt", "supabase_admin_auth_rejected", 500],
    ["no_authorization", "supabase_admin_auth_rejected", 500], ["not_admin", "supabase_admin_auth_rejected", 500],
    ["over_request_rate_limit", "auth_rate_limited", 429], ["unexpected_failure", "auth_internal_error", 502],
  ];
  it.each(byCode)("code %s → %s (HTTP %i)", (code, apiCode, status) => {
    expect(classifyCreateUserError({ code })).toMatchObject({ code: apiCode, status });
  });
  it("`validation_failed` n'est PAS « adresse invalide » : deux catégories distinctes", () => {
    expect(classifyCreateUserError({ code: "validation_failed" }).code).not.toBe(classifyCreateUserError({ code: "email_address_invalid" }).code);
  });
  it("le code PRIME sur le statut : email_exists avec un statut 500 reste email_exists ; weak_password avec 401 reste weak_password", () => {
    expect(classifyCreateUserError({ code: "email_exists", status: 500 }).code).toBe("email_exists");
    expect(classifyCreateUserError({ code: "weak_password", status: 401 }).code).toBe("weak_password");
  });
  it("le NOM sert quand il n'y a pas de code (réseau, mot de passe) et prime sur le statut", () => {
    expect(classifyCreateUserError({ name: "AuthRetryableFetchError", status: 0 }).code).toBe("auth_internal_error");
    expect(classifyCreateUserError({ name: "AuthWeakPasswordError", status: 422 }).code).toBe("weak_password");
    expect(classifyCreateUserError({ name: "AuthRetryableFetchError", status: 401 }).code).toBe("auth_internal_error");
  });
  it("le statut ne sert que de complément : 401/403 → authentification serveur refusée, 429 → débit, ≥ 500 → interne", () => {
    expect(classifyCreateUserError({ status: 401 }).code).toBe("supabase_admin_auth_rejected");
    expect(classifyCreateUserError({ status: 403 }).code).toBe("supabase_admin_auth_rejected");
    expect(classifyCreateUserError({ status: 429 }).code).toBe("auth_rate_limited");
    expect(classifyCreateUserError({ status: 503 }).code).toBe("auth_internal_error");
  });
  it("un code inconnu avec un statut 4xx quelconque, ou rien du tout → auth_create_failed (jamais un 409)", () => {
    for (const e of [{ code: "nouveau_code", status: 422 }, { status: 400 }, {}, null, undefined, { code: 5, name: 7, status: "x" }]) {
      const f = classifyCreateUserError(e as never);
      expect(f.code).toBe("auth_create_failed");
      expect(f.status).toBe(502);
    }
  });
  it("le 409 est réservé à email_exists", () => {
    for (const code of ["weak_password", "invalid_email", "auth_validation_failed", "email_provider_disabled", "supabase_admin_auth_rejected", "auth_rate_limited", "auth_internal_error", "auth_create_failed", "server_misconfigured"] as const) {
      expect(failure(code).status, code).not.toBe(409);
    }
    expect(failure("email_exists").status).toBe(409);
  });
  it("le message d'erreur brut n'est JAMAIS lu : un message trompeur ne change rien", () => {
    const f = classifyCreateUserError({ code: "email_exists", message: "Invalid API key", status: 401 } as never);
    expect(f.code).toBe("email_exists");
    expect(classifyCreateUserError({ message: "already been registered" } as never).code).toBe("auth_create_failed");
    expect(strip(read("src/lib/coach/create-user-errors.ts"))).not.toMatch(/\.message\b|message\.(includes|match|test)|\/.*already.*\//i);
  });
  it("le libellé « clé » est neutre : il ne présume pas que la clé est invalide", () => {
    expect(failure("supabase_admin_auth_rejected").message).not.toMatch(/invalide/i);
  });
  it("les messages ne contiennent aucune valeur sensible ni variable d'environnement", () => {
    for (const code of ["email_exists", "weak_password", "invalid_email", "auth_validation_failed", "email_provider_disabled", "supabase_admin_auth_rejected", "auth_rate_limited", "auth_internal_error", "auth_create_failed", "server_misconfigured"] as const) {
      expect(failure(code).message, code).not.toMatch(/SUPABASE_[A-Z_]+|eyJ|sb_secret|service_role/i);
    }
  });
});

describe("sanitizedDiagnostic : jamais le message brut", () => {
  it("garde code, nom, statut et code API assainis", () => {
    expect(sanitizedDiagnostic({ code: "email_exists", name: "AuthApiError", status: 422, message: "SECRET awa@x.fr" } as never, "email_exists"))
      .toEqual({ code: "email_exists", name: "AuthApiError", status: 422, apiCode: "email_exists" });
  });
  it("un code ou un nom qui ne ressemble pas à un identifiant (espaces, adresse, jeton long) est écarté", () => {
    const d = sanitizedDiagnostic({ code: "awa@x.fr a un problème", name: "x".repeat(200) } as never, "auth_create_failed");
    expect(d).toEqual({ code: null, name: null, status: null, apiCode: "auth_create_failed" });
  });
});

describe("page d'administration : le code d'erreur de l'API n'est plus perdu", () => {
  const page = strip(read("src/app/admin/users/coaches/page.tsx"));
  it("`call()` lève une erreur structurée qui porte le code ; il est affiché sous le message", () => {
    expect(page).toContain("class ApiError extends Error");
    expect(page).toMatch(/throw new ApiError\(data\.error \|\| "Opération refusée", typeof data\.code === "string" \? data\.code : undefined\)/);
    expect(page).toContain("Code : {errorCode}");
  });
  it("les gestionnaires d'erreur passent par `fail()`, qui transmet le code (chargement, action, création)", () => {
    for (const call of ['fail(e, "Erreur de chargement")', 'fail(e, "Erreur")', 'fail(err, "Erreur de création")']) expect(page).toContain(call);
    expect(page).toContain('e instanceof ApiError ? e.code ?? "" : ""');
  });
  it("la page ne lit jamais de message brut de Supabase : elle n'affiche que `error` et `code` de NOTRE API", () => {
    expect(page).not.toMatch(/supabase|createUser|data\.message/i);
  });
});

describe("route de création : garde-fous conservés", () => {
  const route = strip(read("src/app/api/admin/coaches/route.ts"));
  it("la classification passe par le module pur ; aucun 409 générique ne subsiste", () => {
    expect(route).toContain("classifyCreateUserError(");
    expect(route).not.toContain("adresse déjà utilisée ou identifiants invalides");
  });
  it("le message brut n'est pas journalisé et le mot de passe ne l'est jamais", () => {
    const logs = [...route.matchAll(/console\.error\([^;]*\);/g)].map((m) => m[0]).join("\n");
    expect(logs).not.toMatch(/\.message|password|email/i);
  });
  it("le rollback compensatoire et la relecture de cohérence sont conservés ; aucune promotion de compte existant", () => {
    expect(route).toContain("const rollback = async");
    expect(route).toContain("auth.admin.deleteUser(id)");
    expect(route).toContain("Création incohérente, opération annulée.");
    expect(route).not.toMatch(/listUsers|getUserByEmail/); // aucune recherche ni reprise d'un compte existant
  });
});
