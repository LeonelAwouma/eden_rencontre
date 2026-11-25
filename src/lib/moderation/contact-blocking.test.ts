import { describe, expect, it } from "vitest";
import { validateMessage } from "./pipeline";

const check = (content: string, alwaysBlockContacts = false) =>
  validateMessage({ senderId: "a", receiverId: "b", conversationId: "c", content, alwaysBlockContacts });

describe("blocage des coordonnées", () => {
  // Le numéro nu de la capture du forum était seulement « averti » (WARN) puis publié.
  it.each([
    "692313985",
    "6 92 31 39 85",
    "6.92.31.39.85",
    "6-92-31-39-85",
    "+237 692 31 39 85",
    "06 92 31 39 85",
    "écris-moi sur jean.dupont@gmail.com",
  ])("bloque « %s »", async (content) => {
    const r = await check(content);
    expect(r.allowed).toBe(false);
    expect(r.decision).toBe("BLOCK");
    expect(r.blockReason).toBeTruthy();
  });

  it.each([
    "Oui très bien",
    "Rendez-vous à 19h30 dimanche",
    "Matthieu 6:33 et Jean 3:16",
    "Psaume 23:1-6 et Romains 8:28",
    "Le culte commence à 10h, on se voit le 12/12/2026",
    "Né le 05/03/1994 à Yaoundé",
    "Mariage le 2026-12-12 à 10h",
    "Mon budget mariage est de 2500000 FCFA",
    "Entre 2020-2025 j'ai beaucoup voyagé",
    "J'ai 28 ans, 2 enfants, 1m75, j'habite à 15 km de Douala",
  ])("laisse passer « %s »", async (content) => {
    expect((await check(content)).allowed).toBe(true);
  });

  it("une simple demande de numéro reste un avertissement (pas de coordonnée)", async () => {
    const r = await check("Ok c'est possible de s'échanger les numéros whatsapp ??");
    expect(r.allowed).toBe(true);
  });

  it("forum : coordonnée toujours bloquée", async () => {
    expect((await check("692313985", true)).allowed).toBe(false);
  });
});
