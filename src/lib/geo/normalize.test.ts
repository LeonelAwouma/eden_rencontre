import { describe, expect, it } from "vitest";
import { normalizePlaceName } from "./normalize";
import { NORMALIZE_CASES } from "./normalize.cases";

describe("normalizePlaceName — convention commune avec geo_normalize_name (SQL)", () => {
  it.each(NORMALIZE_CASES)("%j → %j", (input, expected) => {
    expect(normalizePlaceName(input)).toBe(expected);
  });
});
