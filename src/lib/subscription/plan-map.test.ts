import { describe, test, expect } from "vitest";
import { DISPLAY_TO_DB, DB_TO_DISPLAY, PLAN_RANK, richer, isDbPlan } from "./plan-map";

describe("plan-map", () => {
  test("maps display plan ids to DB plan ids", () => {
    expect(DISPLAY_TO_DB.bronze).toBe("essentiel");
    expect(DISPLAY_TO_DB.argent).toBe("premium");
    expect(DISPLAY_TO_DB.or).toBe("elite");
  });

  test("maps DB plan ids back to display ids", () => {
    expect(DB_TO_DISPLAY.essentiel).toBe("bronze");
    expect(DB_TO_DISPLAY.premium).toBe("argent");
    expect(DB_TO_DISPLAY.elite).toBe("or");
  });

  test("ranks plans by richness, free lowest, elite highest", () => {
    expect(PLAN_RANK.free).toBeLessThan(PLAN_RANK.essentiel);
    expect(PLAN_RANK.essentiel).toBeLessThan(PLAN_RANK.premium);
    expect(PLAN_RANK.premium).toBeLessThan(PLAN_RANK.elite);
  });

  test("richer returns the richest of two plans", () => {
    expect(richer("free", "elite")).toBe("elite");
    expect(richer("premium", "essentiel")).toBe("premium");
    expect(richer("elite", "elite")).toBe("elite");
  });

  test("isDbPlan validates known plan ids only", () => {
    expect(isDbPlan("free")).toBe(true);
    expect(isDbPlan("elite")).toBe(true);
    expect(isDbPlan("bronze")).toBe(false);
    expect(isDbPlan(undefined)).toBe(false);
    expect(isDbPlan(null)).toBe(false);
  });
});
