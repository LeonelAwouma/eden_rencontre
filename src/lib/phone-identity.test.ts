import { describe, expect, test } from "vitest";
import {
  isSyntheticEmail,
  loginIdentifierToEmail,
  normalizePhone,
  phoneFromSyntheticEmail,
  phoneToSyntheticEmail,
  realEmailOrNull,
} from "./phone-identity";

describe("phone-identity", () => {
  test("normalise un numéro avec espaces et tirets", () => {
    expect(normalizePhone("+237 690-12 34 56")).toBe("+237690123456");
    expect(normalizePhone("0690123456")).toBeNull();
    expect(normalizePhone(42)).toBeNull();
  });

  test("numéro → adresse technique → numéro", () => {
    const email = phoneToSyntheticEmail("+237 690 12 34 56");
    expect(email).toBe("237690123456@phone.eden.invalid");
    expect(isSyntheticEmail(email)).toBe(true);
    expect(phoneFromSyntheticEmail(email)).toBe("+237690123456");
  });

  test("une vraie adresse n'est pas technique", () => {
    expect(isSyntheticEmail("a@b.com")).toBe(false);
    expect(phoneFromSyntheticEmail("a@b.com")).toBeNull();
    expect(realEmailOrNull("a@b.com")).toBe("a@b.com");
    expect(realEmailOrNull("237690123456@phone.eden.invalid")).toBeNull();
    expect(realEmailOrNull("")).toBeNull();
  });

  test("identifiant de connexion : e-mail ou numéro", () => {
    expect(loginIdentifierToEmail(" Moi@Exemple.com ")).toBe("moi@exemple.com");
    expect(loginIdentifierToEmail("+237690123456")).toBe("237690123456@phone.eden.invalid");
    expect(loginIdentifierToEmail("690123456")).toBeNull();
    expect(loginIdentifierToEmail("")).toBeNull();
  });
});
