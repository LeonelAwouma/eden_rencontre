import { describe, expect, it } from "vitest";
import { checkLogoutOrigin, trustedOrigins } from "./origin-guard";

const PROD = ["https://www.gardenofalliance.com"];
const req = (o: Partial<{ origin: string | null; secFetchSite: string | null; host: string | null; forwardedHost: string | null }>) =>
  ({ origin: null, secFetchSite: null, host: "www.gardenofalliance.com", forwardedHost: null, ...o });

describe("origines de confiance : configuration serveur seule", () => {
  it("production : SITE_URL uniquement, sans localhost, sans apex, sans *.vercel.app", () => {
    const list = trustedOrigins({ siteUrl: "https://www.gardenofalliance.com/", nodeEnv: "production" });
    expect(list).toEqual(["https://www.gardenofalliance.com"]);
  });
  it("hors production : localhost autorisé en plus", () => {
    const list = trustedOrigins({ siteUrl: "https://www.gardenofalliance.com", nodeEnv: "development" });
    expect(list).toContain("http://localhost:3000");
    expect(list).toContain("https://www.gardenofalliance.com");
  });
  it("une préproduction n'est autorisée que si SITE_URL la désigne", () => {
    expect(trustedOrigins({ siteUrl: "https://eden-git-feature-x.vercel.app", nodeEnv: "production" })).toEqual(["https://eden-git-feature-x.vercel.app"]);
  });
  it("SITE_URL illisible : aucune origine de production (jamais de confiance par défaut)", () => {
    expect(trustedOrigins({ siteUrl: "pas une url", nodeEnv: "production" })).toEqual([]);
  });
});

describe("checkLogoutOrigin", () => {
  it("origine autorisée + hôte cohérent → accepté", () => {
    expect(checkLogoutOrigin(req({ origin: "https://www.gardenofalliance.com" }), PROD)).toEqual({ ok: true });
  });
  it("origine non autorisée → refusée", () => {
    expect(checkLogoutOrigin(req({ origin: "https://evil.example" }), PROD)).toEqual({ ok: false, reason: "origin_not_allowed" });
  });
  it.each(["https://gardenofalliance.com", "https://eden-abc.vercel.app", "http://www.gardenofalliance.com", "https://www.gardenofalliance.com.evil.example", "null"])(
    "variante %s refusée (égalité d'origine stricte, apex et previews non automatiques)", (origin) => {
      expect(checkLogoutOrigin(req({ origin }), PROD).ok).toBe(false);
    });
  it("Origin autorisé mais hôte annoncé incohérent (X-Forwarded-Host) → refusé : cohérence, jamais confiance", () => {
    expect(checkLogoutOrigin(req({ origin: "https://www.gardenofalliance.com", forwardedHost: "evil.example" }), PROD)).toEqual({ ok: false, reason: "host_mismatch" });
  });
  it("X-Forwarded-Host prime sur Host, première valeur retenue (derrière un proxy)", () => {
    expect(checkLogoutOrigin(req({ origin: "https://www.gardenofalliance.com", host: "interne:3000", forwardedHost: "www.gardenofalliance.com, proxy" }), PROD)).toEqual({ ok: true });
  });
  it("Host/X-Forwarded-Host ne rendent JAMAIS une origine non listée acceptable", () => {
    expect(checkLogoutOrigin(req({ origin: "https://evil.example", host: "evil.example", forwardedHost: "evil.example" }), PROD).ok).toBe(false);
  });
  it("Origin absent, sans Sec-Fetch-Site → refusé", () => {
    expect(checkLogoutOrigin(req({}), PROD)).toEqual({ ok: false, reason: "origin_missing" });
  });
  it("Origin absent + Sec-Fetch-Site: same-origin + hôte de confiance → accepté (repli documenté)", () => {
    expect(checkLogoutOrigin(req({ secFetchSite: "same-origin" }), PROD)).toEqual({ ok: true });
  });
  it.each(["cross-site", "same-site", "none"])("Origin absent + Sec-Fetch-Site: %s → refusé", (secFetchSite) => {
    expect(checkLogoutOrigin(req({ secFetchSite }), PROD).ok).toBe(false);
  });
  it("Origin absent + same-origin mais hôte non listé → refusé", () => {
    expect(checkLogoutOrigin(req({ secFetchSite: "same-origin", host: "evil.example" }), PROD).ok).toBe(false);
  });
  it("sans configuration de confiance, tout est refusé", () => {
    expect(checkLogoutOrigin(req({ origin: "https://www.gardenofalliance.com" }), []).ok).toBe(false);
  });
});
