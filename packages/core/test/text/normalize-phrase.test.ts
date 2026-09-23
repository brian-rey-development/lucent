import { describe, expect, it } from "vitest";

import { normalizePhrase } from "../../src/text/index.ts";

describe("normalizePhrase", () => {
  it.each([
    ["Zoom-in", "zoom in"],
    ["  Red   Blood cells. ", "red blood cells"],
    ["won’t find", "won't find"],
    ["ﬁne", "fine"],
  ])("normalizes %j to %j", (phrase, expected) => {
    expect(normalizePhrase(phrase)).toBe(expected);
  });
});
