import { describe, expect, test } from "vitest";
import { BATIR_SUR_LE_ROC } from "@/lib/formation/batir-sur-le-roc";
import { COACH_GROUPS } from "@/lib/coach-nav";
import { ACADEMIE_SLUGS, audioUrlFor, isAcademieSlug, lessonMatches, parseRange, storagePathOf, toCoachLesson } from "./academie";

const lesson = (slug: string) => BATIR_SUR_LE_ROC.pillars.flatMap((p) => p.lessons).find((l) => l.slug === slug)!;

describe("liste blanche des contenus publiés", () => {
  test("accepte les leçons du catalogue, refuse tout le reste", () => {
    expect(isAcademieSlug("1-1")).toBe(true);
    expect(isAcademieSlug("3-7")).toBe(true);
    for (const bad of ["4-1", "../1-1", "1-1/../x", "", "mediatheque", undefined, null, 11])
      expect(isAcademieSlug(bad as unknown)).toBe(false);
    expect(ACADEMIE_SLUGS.size).toBeGreaterThan(10);
  });
});

describe("toCoachLesson : aucune fuite de fichier source", () => {
  const dto = toCoachLesson(lesson("1-1"), true);
  const raw = JSON.stringify(dto);
  test("pas de PDF, de quiz, de réflexion ni de chemin public/stockage", () => {
    expect(dto).not.toHaveProperty("pdf");
    expect(dto).not.toHaveProperty("quiz");
    expect(dto).not.toHaveProperty("reflection");
    expect(raw).not.toMatch(/\/formation\/batir-sur-le-roc|formation-media|supabase|\.mp3|\.pdf/);
  });
  test("audio associé = adresse de la route protégée, transcription idem", () => {
    expect(dto.audio?.src).toBe("/api/coach/academie/audio/1-1");
    expect(dto.audio?.transcript).toBe("/api/coach/academie/audio/1-1?kind=transcript");
  });
  test("sans audio : audio = null (message « indisponible »)", () => {
    const l = lesson("2-1");
    const out = toCoachLesson({ ...l, audio: undefined }, true);
    expect(out.audio).toBeNull();
  });
});

describe("storagePathOf : seuls audio et transcription du dossier audio", () => {
  test("dérive le chemin du bucket", () => {
    expect(storagePathOf("/formation/batir-sur-le-roc/audio/lecon-1-1.mp3")).toBe("audio/lecon-1-1.mp3");
    expect(storagePathOf("/formation/batir-sur-le-roc/audio/lecon-1-1.json")).toBe("audio/lecon-1-1.json");
  });
  test("refuse PDF, images, remontée de répertoire et autres bases", () => {
    for (const bad of ["/formation/batir-sur-le-roc/pdf/x.pdf", "/formation/batir-sur-le-roc/audio/../pdf/x.mp3",
      "/mediatheque/x.mp3", "/formation/batir-sur-le-roc/audio/x.exe", "", undefined, null])
      expect(storagePathOf(bad as string | undefined)).toBeNull();
  });
  test("l'URL d'audio d'une leçon ne vise jamais un autre emplacement", () => {
    expect(audioUrlFor("1-1", "audio")).toBe("/api/coach/academie/audio/1-1");
  });
});

describe("parseRange", () => {
  test("plages valides", () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
    expect(parseRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=50-500", 100)).toEqual({ start: 50, end: 99 });
  });
  test("plages invalides → 416", () => {
    for (const bad of ["bytes=100-", "bytes=9-1", "bytes=-", "items=0-1", "bytes=0-1,5-6", "bytes=-0"])
      expect(parseRange(bad, 100)).toBe("invalid");
  });
});

describe("recherche", () => {
  test("titre ou mot-clé, sans accents ni casse", () => {
    const l = lesson("1-1");
    expect(lessonMatches(l, "")).toBe(true);
    expect(lessonMatches(l, "ENTRE ELOGE")).toBe(true);
    expect(lessonMatches(l, "zzzqqqxxx")).toBe(false);
  });
});

describe("séparation Académie / médiathèque", () => {
  test("le menu Coach propose l'Académie (catalogue protégé) et plus la médiathèque générale", () => {
    const routes = COACH_GROUPS.flatMap((g) => g.dests).map((d) => (d.kind === "route" ? d.href : ""));
    expect(routes).toContain("/coach/academie");
    expect(routes).not.toContain("/coach/mediatheque");
  });
  test("les internes de l'Académie (slugs, chemins de stockage) restent isolés de la médiathèque générale", () => {
    expect(isAcademieSlug("mediatheque")).toBe(false);
    expect(storagePathOf("/mediatheque/x.mp3")).toBeNull();
  });
});
