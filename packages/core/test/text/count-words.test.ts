import { describe, expect, it } from "vitest";

import { countWords } from "../../src/text/index.ts";

describe("countWords", () => {
  it.each([
    ["", 0],
    ["one", 1],
    ["won't stop", 2],
    ["won’t stop", 2],
    ["forty-six chromosomes", 2],
    ["a, b; c.", 3],
  ])("counts %j as %i", (text, expected) => {
    expect(countWords(text)).toBe(expected);
  });
});
