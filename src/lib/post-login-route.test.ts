import { describe, expect, test } from "vitest";
import { isMemberLandingPath, postLoginDestination, safeNextPath } from "@/lib/post-login-route";

describe("safeNextPath : jamais de destination externe ni de boucle", () => {
  test.each(["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "", null, undefined, "/login", "/login?next=/x", "/a\r\nb"])(
    "refuse %s", (v) => expect(safeNextPath(v as string)).toBeNull());
  test("accepte un chemin interne", () => expect(safeNextPath("/coach/members?x=1")).toBe("/coach/members?x=1"));
});

describe("postLoginDestination", () => {
  test("un coach arrive dans /coach, connexion ou session existante", () => {
    expect(postLoginDestination("coach", null)).toBe("/coach");
    expect(postLoginDestination("coach", null, true)).toBe("/coach");
  });
  test("un coach ne suit pas un « next » vers l'espace membre", () => {
    expect(postLoginDestination("coach", "/dashboard")).toBe("/coach");
    expect(postLoginDestination("coach", "/searching")).toBe("/coach");
  });
  test("un coach peut rejoindre sa salle de séance ou revenir dans son espace", () => {
    expect(postLoginDestination("coach", "/reunion/abc")).toBe("/reunion/abc");
    expect(postLoginDestination("coach", "/coach/members")).toBe("/coach/members");
  });
  test("un coach ne suit jamais une URL externe", () => {
    expect(postLoginDestination("coach", "//evil.com")).toBe("/coach");
  });
  test("le parcours membre est inchangé", () => {
    expect(postLoginDestination("member", null)).toBe("/searching");
    expect(postLoginDestination("member", null, true)).toBe("/searching?returning=1");
    expect(postLoginDestination("member", "/dashboard/academie")).toBe("/dashboard/academie");
  });
  test("un membre n'est jamais envoyé dans l'espace coach", () => {
    expect(postLoginDestination("member", "/coach")).toBe("/searching");
  });
});

describe("isMemberLandingPath", () => {
  test("pages d'atterrissage membre", () => {
    for (const p of ["/dashboard", "/searching", "/searching/x", "/onboarding"]) expect(isMemberLandingPath(p)).toBe(true);
  });
  test("pages partagées ou coach : pas de redirection", () => {
    for (const p of ["/reunion/1", "/dashboard/academie", "/coach", "/mediatheque", null]) expect(isMemberLandingPath(p as string)).toBe(false);
  });
});
