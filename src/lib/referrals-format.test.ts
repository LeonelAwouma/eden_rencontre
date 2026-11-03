import { describe, test, expect } from "vitest";
import { isReferralCodeFormat } from "./referrals";

describe("isReferralCodeFormat", () => {
  test("accepts a well-formed code", () => {
    expect(isReferralCodeFormat("AB7K2P9Q")).toBe(true);
  });

  test("rejects codes with ambiguous characters (0, O, 1, I, L)", () => {
    expect(isReferralCodeFormat("AB7K2P0Q")).toBe(false);
    expect(isReferralCodeFormat("AB7K2POQ")).toBe(false);
    expect(isReferralCodeFormat("AB7K2P1Q")).toBe(false);
    expect(isReferralCodeFormat("AB7K2PIQ")).toBe(false);
    expect(isReferralCodeFormat("AB7K2PLQ")).toBe(false);
  });

  test("rejects codes outside the 6-10 character range", () => {
    expect(isReferralCodeFormat("AB7K2")).toBe(false); // 5
    expect(isReferralCodeFormat("AB7K2P")).toBe(true); // 6
    expect(isReferralCodeFormat("AB7K2P9QRS")).toBe(true); // 10
    expect(isReferralCodeFormat("AB7K2P9QRST")).toBe(false); // 11
  });

  test("rejects lowercase and non-string input", () => {
    expect(isReferralCodeFormat("ab7k2p9q")).toBe(false);
    expect(isReferralCodeFormat(12345678)).toBe(false);
    expect(isReferralCodeFormat(null)).toBe(false);
    expect(isReferralCodeFormat(undefined)).toBe(false);
  });
});
