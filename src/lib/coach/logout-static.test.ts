import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}
const sources = walk(join(root, "src")).map((f) => ({ file: f.slice(root.length + 1).replaceAll("\\", "/"), text: readFileSync(f, "utf8") }));

describe("cookies de nouvelle tentative : lus par le seul DELETE /api/auth/session", () => {
  const NAMES = ["sb-revoke-pending", "REVOKE_PENDING_A", "REVOKE_PENDING_B", "REVOKE_PENDING_A_REFRESH"];
  it("aucun autre fichier de production ne lit ces cookies", () => {
    const users = sources.filter((s) => NAMES.some((n) => strip(s.text).includes(n))).map((s) => s.file).sort();
    expect(users).toEqual(["src/app/api/auth/session/route.ts", "src/lib/coach/logout-outcome.ts"]);
  });
  it("leurs noms ne contiennent pas « -auth-token » : getVerifiedSession ne peut jamais les prendre pour une session", () => {
    const outcome = read("src/lib/coach/logout-outcome.ts");
    for (const m of outcome.matchAll(/"(sb-revoke-pending[a-z-]*)"/g)) expect(m[1]).not.toContain("-auth-token");
    const auth = strip(read("src/lib/api-auth.ts"));
    expect(auth).not.toMatch(/revoke/i);
  });
  it("seul DELETE les émet avec SameSite=Strict, HttpOnly, chemin dédié, sans attribut Domain", () => {
    const route = strip(read("src/app/api/auth/session/route.ts"));
    expect(route).toMatch(/sameSite: "strict"/);
    expect(route).toMatch(/httpOnly: true/);
    expect(route).toContain("REVOKE_PENDING_PATH");
    expect(route).not.toMatch(/domain\s*:/i);
  });
});

describe("DELETE /api/auth/session : endpoint de révocation, pas d'autorisation d'accès", () => {
  const route = strip(read("src/app/api/auth/session/route.ts"));
  const del = route.slice(route.indexOf("export async function DELETE"));
  it("n'appelle ni requireActiveCoach, ni getActiveCoach, ni la vérification de session active, ni aucune table", () => {
    for (const forbidden of ["requireActiveCoach", "getActiveCoach", "isCoachSessionAccepted", "assertCoachSessionActive", "getSupabaseAdmin", ".from("]) {
      expect(del, forbidden).not.toContain(forbidden);
    }
  });
  it("ordre : origine, puis limiteur, puis lecture des credentials, puis révocation", () => {
    const origin = del.indexOf("checkLogoutOrigin(");
    const limiter = del.indexOf("checkRateLimit(");
    const cookies = del.indexOf("req.cookies");
    const revoke = del.indexOf("revokeCredentials(");
    expect(origin).toBeGreaterThan(-1);
    expect(limiter).toBeGreaterThan(origin);
    expect(cookies).toBeGreaterThan(limiter);
    expect(revoke).toBeGreaterThan(cookies);
  });
  it("le refus d'origine intervient avant toute lecture de cookie ou d'en-tête Authorization", () => {
    const beforeOrigin = del.slice(0, del.indexOf("if (!origin.ok)"));
    expect(beforeOrigin).not.toMatch(/cookies|authorization|bearerOf/i);
  });
  it("les gardes des autres routes Coach restent branchées (getActiveCoach, getMemberOrCoach, page-guard)", () => {
    expect(strip(read("src/lib/coach-auth.ts"))).toContain("isCoachSessionAccepted");
    expect(strip(read("src/lib/api-auth.ts"))).toContain("isCoachSessionAccepted");
    expect(strip(read("src/lib/coach/page-guard.ts"))).toContain("isCoachSessionAccepted");
  });
});

describe("scope de déconnexion : toujours « local » pour la déconnexion volontaire", () => {
  it("auth-ops : admin.signOut(jwt, \"local\"), jamais global ni others", () => {
    const ops = strip(read("src/lib/coach/auth-ops.ts"));
    expect(ops).toContain('admin.signOut(jwt, "local")');
    expect(ops).not.toMatch(/"global"|"others"/);
  });
  it("navigateur : signOut({ scope: \"local\" }), jamais l'appel sans option (scope global par défaut)", () => {
    const b = strip(read("src/lib/logout-browser.ts"));
    expect(b).toContain('signOut({ scope: "local" })');
    expect(b).not.toMatch(/signOut\(\s*\)/);
    expect(strip(read("src/lib/auth.ts")).slice(strip(read("src/lib/auth.ts")).indexOf("export async function logout"))).not.toMatch(/signOut\(\s*\)/);
  });
  it("aucun module de la déconnexion n'utilise le scope global ou others", () => {
    for (const f of ["src/lib/coach/revoke-session.ts", "src/lib/logout-flow.ts", "src/lib/logout-browser.ts", "src/app/api/auth/session/route.ts"]) {
      expect(strip(read(f)), f).not.toMatch(/scope:\s*"(global|others)"|,\s*"(global|others)"\)/);
    }
  });
});

describe("aucun jeton, refresh token, cookie ni en-tête Authorization dans les journaux", () => {
  it("aucun appel console.* dans les modules de révocation et de synchronisation", () => {
    for (const f of [
      "src/app/api/auth/session/route.ts", "src/lib/coach/revoke-session.ts", "src/lib/coach/auth-ops.ts", "src/lib/coach/logout-outcome.ts",
      "src/lib/coach/origin-guard.ts", "src/lib/session-guard.ts", "src/lib/logout-flow.ts", "src/lib/logout-browser.ts",
      "src/lib/logout-broadcast.ts", "src/lib/coach/cookie-sync.ts", "src/components/logout-notice.tsx",
    ]) {
      expect(strip(read(f)), f).not.toMatch(/console\.(log|info|warn|error|debug)/);
    }
  });
  it("le jeton n'est jamais placé dans une URL ni dans le stockage persistant par la déconnexion", () => {
    const flow = strip(read("src/lib/logout-flow.ts")) + strip(read("src/lib/logout-browser.ts"));
    expect(flow).not.toMatch(/\?token=|access_token=|refresh_token=/);
    expect(strip(read("src/lib/logout-browser.ts"))).not.toMatch(/setItem\([^)]*(bearer|token)/i);
    expect(strip(read("src/lib/logout-broadcast.ts"))).not.toMatch(/token/i);
  });
});

describe("migration session_is_active : validation STATIQUE du SQL (non exécuté)", () => {
  const path = "supabase/migrations/20261109_session_is_active.sql";
  const sql = () => read(path).split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").toLowerCase();
  it("le fichier existe et n'est pas exécuté par le dépôt (aucune référence dans le code)", () => {
    expect(existsSync(join(root, path))).toBe(true);
    expect(sources.some((s) => s.text.includes("20261109_session_is_active"))).toBe(false);
  });
  it("SECURITY DEFINER, search_path vide, retour booléen, lecture limitée à l'existence", () => {
    const s = sql();
    expect(s).toContain("security definer");
    expect(s).toMatch(/set search_path = ''/);
    expect(s).toMatch(/returns boolean/);
    expect(s).toMatch(/select exists \(/);
    expect(s).not.toMatch(/select\s+\*/);
    expect(s).not.toMatch(/returns (table|setof)/);
  });
  it("objets qualifiés (auth.sessions, pg_catalog.*) ; not_after lu via to_jsonb (aucune dépendance dure à la colonne)", () => {
    const s = sql();
    expect(s).toContain("from auth.sessions s");
    expect(s).toContain("pg_catalog.to_jsonb(s) ->> 'not_after'");
    expect(s).toContain("pg_catalog.now()");
    expect(s).not.toMatch(/s\.not_after/);
  });
  it("EXECUTE réservé à service_role : retiré de PUBLIC, anon, authenticated ; aucun autre GRANT", () => {
    const s = sql();
    for (const role of ["public", "anon", "authenticated"]) expect(s).toMatch(new RegExp(`revoke all on function public\\.session_is_active\\(uuid\\) from ${role};`));
    const grants = [...s.matchAll(/grant [^;]+;/g)].map((m) => m[0]);
    expect(grants).toEqual(["grant execute on function public.session_is_active(uuid) to service_role;"]);
  });
  it("aucune écriture : pas d'insert/update/delete/drop/alter dans la migration", () => {
    expect(sql()).not.toMatch(/\b(insert|update|delete|drop|alter|truncate)\b/);
  });
});

describe("garde de session active : drapeau, défaut désactivé, fail-closed", () => {
  const guard = strip(read("src/lib/session-guard.ts"));
  it("désactivé par défaut : seul « true » exact l'active", () => {
    expect(guard).toContain('process.env.COACH_REQUIRE_ACTIVE_SESSION === "true"');
  });
  it("le session_id n'est décodé que dans sessionIdOfVerifiedToken, appelé uniquement avec un jeton déjà vérifié", () => {
    const users = sources.filter((s) => strip(s.text).includes("sessionIdOfVerifiedToken(")).map((s) => s.file).sort();
    expect(users).toEqual(["src/lib/coach/auth-ops.ts", "src/lib/session-guard.ts"]);
    const ops = strip(read("src/lib/coach/auth-ops.ts"));
    // auth-ops ne décode l'identité de session qu'APRÈS un getUser réussi.
    expect(ops.indexOf("sessionIdOfVerifiedToken(")).toBeGreaterThan(ops.indexOf("auth.getUser(jwt)"));
    expect(ops).toMatch(/if \(data\?\.user\?\.id\) return \{ state: "valid"[^}]*sessionIdOfVerifiedToken\(jwt\)/);
  });
});

describe("limiteur de la déconnexion : action libre, aucune migration, fail-open documenté", () => {
  it("utilise le limiteur existant (otp.ts) avec l'action logout_attempt", () => {
    const route = strip(read("src/app/api/auth/session/route.ts"));
    expect(route).toContain('from "@/lib/otp"');
    expect(route).toContain('"logout_attempt"');
  });
  it("la colonne `action` de password_reset_rate_limits est un texte libre (aucune contrainte CHECK) : pas de migration nécessaire", () => {
    const schema = read("supabase/password-reset-otp-schema.sql");
    const table = schema.slice(schema.indexOf("create table if not exists public.password_reset_rate_limits"), schema.indexOf("create index if not exists idx_rate_limits_identifier_action"));
    expect(table).toMatch(/action text not null/);
    expect(table.toLowerCase()).not.toContain("check");
  });
});
