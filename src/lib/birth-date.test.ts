import { describe, test, expect } from "vitest";
import {
  maskBirthDateInput,
  formatBirthDateDisplay,
  parseBirthDateDisplay,
  validateBirthDateDisplay,
} from "./birth-date";

describe("maskBirthDateInput", () => {
  test("inserts slashes progressively while typing", () => {
    expect(maskBirthDateInput("1")).toBe("1");
    expect(maskBirthDateInput("15")).toBe("15");
    expect(maskBirthDateInput("150")).toBe("15/0");
    expect(maskBirthDateInput("1508")).toBe("15/08");
    expect(maskBirthDateInput("150819")).toBe("15/08/19");
    expect(maskBirthDateInput("15081998")).toBe("15/08/1998");
  });

  test("strips non-digit characters from a pasted full date", () => {
    expect(maskBirthDateInput("15/08/1998")).toBe("15/08/1998");
    expect(maskBirthDateInput("15-08-1998")).toBe("15/08/1998");
  });

  test("ignores extra characters beyond 8 digits", () => {
    expect(maskBirthDateInput("150819980000")).toBe("15/08/1998");
  });

  test("backspacing produces a shorter, still well-formed mask", () => {
    expect(maskBirthDateInput("1508199")).toBe("15/08/199");
  });
});

describe("formatBirthDateDisplay / parseBirthDateDisplay", () => {
  test("round-trips ISO <-> display", () => {
    expect(formatBirthDateDisplay("1998-08-15")).toBe("15/08/1998");
    expect(parseBirthDateDisplay("15/08/1998")).toBe("1998-08-15");
  });

  test("formatBirthDateDisplay returns empty string for null/invalid input", () => {
    expect(formatBirthDateDisplay(null)).toBe("");
    expect(formatBirthDateDisplay(undefined)).toBe("");
    expect(formatBirthDateDisplay("not-a-date")).toBe("");
  });

  test("parseBirthDateDisplay returns null for incomplete/malformed input", () => {
    expect(parseBirthDateDisplay("15/08/199")).toBeNull();
    expect(parseBirthDateDisplay("")).toBeNull();
    expect(parseBirthDateDisplay("abc")).toBeNull();
  });
});

describe("validateBirthDateDisplay", () => {
  test("accepts a valid adult date", () => {
    const res = validateBirthDateDisplay("15/08/1998");
    expect(res.ok).toBe(true);
    expect(res.iso).toBe("1998-08-15");
    expect(res.errorKey).toBeNull();
  });

  test("rejects an impossible calendar date (31/02/2000)", () => {
    const res = validateBirthDateDisplay("31/02/2000");
    expect(res.ok).toBe(false);
    expect(res.errorKey).toBe("invalidDate");
    expect(res.iso).toBeNull();
  });

  test("accepts 29/02/2000 (leap year)", () => {
    const res = validateBirthDateDisplay("29/02/2000");
    expect(res.ok).toBe(true);
    expect(res.iso).toBe("2000-02-29");
  });

  test("rejects 29/02/1999 (not a leap year)", () => {
    const res = validateBirthDateDisplay("29/02/1999");
    expect(res.ok).toBe(false);
    expect(res.errorKey).toBe("invalidDate");
  });

  test("rejects a date making the person a minor", () => {
    const now = new Date();
    const tooYoungYear = now.getUTCFullYear() - 10;
    const res = validateBirthDateDisplay(`15/08/${tooYoungYear}`);
    expect(res.ok).toBe(false);
    expect(res.errorKey).toBe("tooYoung");
  });

  test("rejects a future date", () => {
    const now = new Date();
    const futureYear = now.getUTCFullYear() + 1;
    const res = validateBirthDateDisplay(`15/08/${futureYear}`);
    expect(res.ok).toBe(false);
    expect(res.errorKey).toBe("future");
  });

  test("rejects an incomplete display value", () => {
    const res = validateBirthDateDisplay("15/08/19");
    expect(res.ok).toBe(false);
    expect(res.errorKey).toBe("incomplete");
    expect(res.iso).toBeNull();
  });

  test("never silently keeps a stale ISO: editing a valid date into an invalid one must report ok:false with iso:null", () => {
    const valid = validateBirthDateDisplay("15/08/1998");
    expect(valid.ok).toBe(true);
    // Simulate the user backspacing the day and typing an impossible one.
    const edited = validateBirthDateDisplay("31/02/1998");
    expect(edited.ok).toBe(false);
    expect(edited.iso).toBeNull();
  });
});
