import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contrôles STATIQUES de l'architecture de la garde serveur : ils verrouillent ce qu'un test de comportement ne voit
 * pas (le layout est un composant serveur ; aucun traitement client ne conclut « suspendu » ou ne déconnecte sur un refus).
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("layout /coach : composant serveur, décision avant tout rendu", () => {
  const layout = read("src/app/coach/layout.tsx");
  const code = stripComments(layout);

  it("n'est PAS un composant client", () => {
    expect(layout.trimStart().startsWith('"use client"')).toBe(false);
    expect(layout).not.toMatch(/["']use client["']/);
  });

  it("est rendu dynamiquement (jamais une page statique servie sans contrôle)", () => {
    expect(code).toMatch(/export const dynamic = "force-dynamic"/);
  });

  it("lit les cookies de la requête côté serveur et applique la garde AVANT de retourner la page", () => {
    expect(code).toMatch(/from "next\/headers"/);
    const guardAt = code.indexOf("await enforceCoachPageAccess(");
    const shellAt = code.indexOf("<CoachShell");
    const childrenAt = code.indexOf("{children}");
    expect(guardAt).toBeGreaterThan(-1);
    expect(shellAt).toBeGreaterThan(guardAt);
    expect(childrenAt).toBeGreaterThan(guardAt);
    expect(code).toMatch(/enforceCoachPageAccess\(await headers\(\)\)/);
  });

  it("aucune seconde logique d'autorisation : la garde réutilise les fonctions du lot 1", () => {
    const guard = stripComments(read("src/lib/coach/page-guard.ts"));
    for (const reused of ["getAuthenticatedUser", "getActiveCoachByUserId", "getAccountKind", "classifyTarget"]) expect(guard).toContain(reused);
    expect(guard).not.toMatch(/\.from\(["']/); // aucune requête propre : tout passe par les fonctions partagées
    const apiGuard = stripComments(read("src/lib/coach-auth.ts"));
    expect(apiGuard).toMatch(/getActiveCoach\(req[^)]*\)[\s\S]*getActiveCoachByUserId\(user\.id\)/); // les API utilisent la MÊME règle
  });

  it("le middleware n'est pas le mécanisme de garde (un contrôle de présence de JWT ne prouve rien)", () => {
    const mw = read("src/middleware.ts");
    expect(mw).toContain('matcher: ["/admin/:path*", "/api/admin/:path*"]'); // inchangé : /coach n'y est pas
  });

  it("le cache est explicitement interdit sur /coach (en-tête de configuration)", () => {
    const cfg = read("next.config.ts");
    expect(cfg).toMatch(/source:\s*'\/coach\/:path\*'[\s\S]*Cache-Control[\s\S]*private, no-store/);
  });
});

describe("aucun traitement client ne conclut « suspendu » ni ne déconnecte sur un simple refus", () => {
  const clientFiles = [
    ...walk(join(root, "src/components/coach")),
    ...walk(join(root, "src/app/coach")).filter((f) => !/layout\.tsx$/.test(f)),
  ];

  it("l'ancienne garde cliente a disparu", () => {
    expect(existsSync(join(root, "src/components/coach/coach-gate.tsx"))).toBe(false);
    for (const f of clientFiles) expect(readFileSync(f, "utf8"), f).not.toMatch(/CoachGate|fetchCoachMe/);
  });

  it("aucun composant de l'espace Coach ne redirige vers le message de suspension", () => {
    for (const f of clientFiles) expect(stripComments(readFileSync(f, "utf8")), f).not.toMatch(/blocked=suspended|blocked=rejected/);
  });

  it("onDenied ne déconnecte pas : il redemande au serveur de rejouer sa garde (router.refresh)", () => {
    const chrome = stripComments(read("src/components/coach/coach-chrome.tsx"));
    const body = chrome.slice(chrome.indexOf("const onDenied"), chrome.indexOf("}, [router]);", chrome.indexOf("const onDenied")));
    expect(body.length).toBeGreaterThan(10);
    expect(body).toContain("router.refresh()");
    expect(body).not.toMatch(/logout|signOut|replace\(/i);
  });

  it("les chargements de données n'appellent jamais logout sur un 401/403", () => {
    const hook = stripComments(read("src/components/coach/use-coach-data.ts"));
    expect(hook).not.toMatch(/logout|signOut/i);
    expect(hook).toContain("onDenied");
  });

  it("seuls les boutons « Se déconnecter » déclenchent une déconnexion (profil, barre latérale, écran indisponible)", () => {
    const callers = clientFiles.filter((f) => /\blogout\(\)|authLogout\(\)/.test(stripComments(readFileSync(f, "utf8"))))
      .map((f) => f.replace(/\\/g, "/").split("/src/")[1]).sort();
    expect(callers).toEqual([
      "app/coach/profile/page.tsx",            // bouton « Se déconnecter »
      "components/coach/coach-sidebar.tsx",    // bouton « Se déconnecter » du menu
      "components/coach/coach-chrome.tsx",     // définition de logout (appelée par les boutons ci-dessus)
      "components/coach/coach-unavailable.tsx", // bouton « Me reconnecter » de l'écran d'indisponibilité
    ].sort());
  });
});

describe("déconnexion et reconnexion : cookies de session", () => {
  it("logout() efface aussi les cookies httpOnly côté serveur", () => {
    const auth = stripComments(read("src/lib/auth.ts"));
    const logout = auth.slice(auth.indexOf("export async function logout"), auth.indexOf("export function isProfileComplete"));
    expect(logout).toMatch(/fetch\("\/api\/auth\/session",\s*\{\s*method:\s*"DELETE"/);
    expect(logout).toContain("signOut");
  });

  it("la page de connexion resynchronise le cookie AVANT de rediriger un coach, avec garde-fou anti-boucle", () => {
    const login = stripComments(read("src/app/login/page.tsx"));
    const canAt = login.indexOf("canAttemptCoachSync(");
    const markAt = login.indexOf("markCoachSyncAttempt()");
    const syncAt = login.indexOf("await syncCoachSessionCookie()");
    const redirectAt = login.indexOf('postLoginDestination("coach", next, true)');
    expect(canAt).toBeGreaterThan(-1);
    expect(markAt).toBeGreaterThan(canAt);
    expect(syncAt).toBeGreaterThan(markAt);
    expect(redirectAt).toBeGreaterThan(syncAt); // redirection seulement après confirmation du serveur
  });

  it("le paramètre « blocked » n'entraîne aucune redirection automatique de la page de connexion", () => {
    const login = stripComments(read("src/app/login/page.tsx"));
    const effect = login.slice(login.indexOf('const blocked = params.get("blocked")'));
    const returnAt = effect.indexOf("return;");
    const sessionAt = effect.indexOf("getSession()");
    expect(returnAt).toBeGreaterThan(-1);
    expect(sessionAt).toBeGreaterThan(returnAt); // on sort avant de consulter la session existante
  });
});
