import { describe, expect, it } from "vitest";

import { closestMatch } from "../../src/text/index.ts";

describe("closestMatch", () => {
  it.each([
    ["lable", ["label", "shape"], "label"],
    ["dan", ["dna", "A"], "dna"],
    ["phto", ["photo", "image"], "photo"],
    ["rbc3", ["rbc_1", "wbc"], "rbc_1"],
  ])("suggests %s -> %s", (input, candidates, expected) => {
    expect(closestMatch(input, candidates)).toBe(expected);
  });

  it("prefers the candidate sharing the longest prefix on a tie", () => {
    expect(closestMatch("rbc", ["abc", "rbx"])).toBe("rbx");
  });

  it.each([
    ["zz", ["at", "id"]],
    ["medium", ["fast", "base", "slow"]],
    ["x".repeat(65), ["x".repeat(65)]],
  ])("does not suggest for %s", (input, candidates) => {
    expect(closestMatch(input, candidates)).toBeUndefined();
  });

  it("does not suggest from more than 200 candidates", () => {
    const candidates = Array.from({ length: 201 }, (_, index) => `name${index}`);

    expect(closestMatch("name1", candidates)).toBeUndefined();
    expect(closestMatch("name1", candidates.slice(0, 200))).toBe("name1");
  });
});
