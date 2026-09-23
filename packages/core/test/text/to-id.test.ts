import { describe, expect, it } from "vitest";

import { isId, toId } from "../../src/text/index.ts";

describe("toId", () => {
  it.each([
    ["Bad Id", "bad-id"],
    ["Émile", "emile"],
    ["1abc", "abc"],
    ["Hello, World!", "hello-world"],
    ["a -- b", "a-b"],
  ])("turns %j into %j", (text, expected) => {
    expect(toId(text)).toBe(expected);
  });

  it("gives nothing for text without letters", () => {
    expect(toId("123 !")).toBeUndefined();
  });
});

describe("isId", () => {
  it.each([
    ["blood", true],
    ["rbc_1", true],
    ["bad-id", true],
    ["Bad", false],
    ["1abc", false],
    ["", false],
  ])("%j is an id: %s", (text, expected) => {
    expect(isId(text)).toBe(expected);
  });
});
