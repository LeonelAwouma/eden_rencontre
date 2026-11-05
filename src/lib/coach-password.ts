import { randomInt } from "node:crypto";

/** Mot de passe temporaire : 16 caractères tirés avec un générateur cryptographique, lettres ET chiffres garanties. */
export function generateTemporaryPassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = letters + digits;
  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(letters), pick(letters), pick(digits), pick(digits)];
  while (chars.length < 16) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
