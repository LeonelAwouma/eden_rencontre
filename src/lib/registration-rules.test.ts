import { describe, test, expect } from "vitest";
import { isRealBirthDateIso, isAdultBirthDate, isRegistrationComplete, MIN_REGISTRATION_AGE } from "./registration-rules";

describe("isRealBirthDateIso", () => {
  test("accepts a real calendar date", () => {
    expect(isRealBirthDateIso("1998-08-15")).toBe(true);
  });

  test("rejects an impossible calendar date", () => {
    expect(isRealBirthDateIso("2000-02-30")).toBe(false);
  });

  test("handles leap years correctly", () => {
    expect(isRealBirthDateIso("2000-02-29")).toBe(true);
    expect(isRealBirthDateIso("1999-02-29")).toBe(false);
  });

  test("rejects malformed input", () => {
    expect(isRealBirthDateIso("15/08/1998")).toBe(false);
    expect(isRealBirthDateIso(null)).toBe(false);
    expect(isRealBirthDateIso(undefined)).toBe(false);
    expect(isRealBirthDateIso(12345)).toBe(false);
  });
});

describe("isAdultBirthDate (behavior unchanged after extraction)", () => {
  test("accepts an adult birth date", () => {
    expect(isAdultBirthDate("1998-08-15")).toBe(true);
  });

  test("rejects a minor's birth date", () => {
    const now = new Date();
    const tooYoungYear = now.getUTCFullYear() - 10;
    expect(isAdultBirthDate(`${tooYoungYear}-08-15`)).toBe(false);
  });

  test("rejects an impossible calendar date the same way isRealBirthDateIso does", () => {
    expect(isAdultBirthDate("2000-02-30")).toBe(false);
  });

  test("rejects malformed input", () => {
    expect(isAdultBirthDate("not-a-date")).toBe(false);
    expect(isAdultBirthDate(undefined)).toBe(false);
  });

  test("respects a custom minAge", () => {
    const now = new Date();
    const sixteenYearsAgo = now.getUTCFullYear() - 16;
    expect(isAdultBirthDate(`${sixteenYearsAgo}-01-01`, 16)).toBe(true);
    expect(isAdultBirthDate(`${sixteenYearsAgo}-01-01`, 18)).toBe(false);
  });

  test("MIN_REGISTRATION_AGE is 18", () => {
    expect(MIN_REGISTRATION_AGE).toBe(18);
  });
});

describe("isRegistrationComplete (unaffected by this work)", () => {
  test("requires gender, country and city", () => {
    expect(isRegistrationComplete({ gender: "homme", country: "Cameroun", city: "Douala" })).toBe(true);
    expect(isRegistrationComplete({ gender: "homme", country: "Cameroun", city: "" })).toBe(false);
    expect(isRegistrationComplete(null)).toBe(false);
    expect(isRegistrationComplete(undefined)).toBe(false);
  });
});
