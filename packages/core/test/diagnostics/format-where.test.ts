import { describe, expect, it } from "vitest";

import { formatWhere, oneOf, quote } from "../../src/diagnostics/index.ts";

describe("formatWhere", () => {
  it.each([
    ["blood", ["do", 1, "ring", 0], "blood.do[1].ring[0]"],
    ["", ["points", "wbc", 1], "points.wbc[1]"],
    ["frontmatter", [], "frontmatter"],
  ])("formats %j + %j", (base, path, expected) => {
    expect(formatWhere(base, path)).toBe(expected);
  });
});

describe("oneOf", () => {
  it("lists at most five options", () => {
    expect(oneOf(["s", "m", "l"])).toBe("s|m|l");
    expect(oneOf(["a", "b", "c", "d", "e", "f"])).toBe("a|b|c|d|e|...");
  });
});

describe("quote", () => {
  it("quotes and truncates free text", () => {
    expect(quote('say "hi"')).toBe('"say \\"hi\\""');
    expect(quote("x".repeat(61))).toBe(`"${"x".repeat(60)}..."`);
  });
});
