import { describe, expect, it } from "vitest";

import { describeValue, isRecord } from "../../src/validation/index.ts";

describe("describeValue", () => {
  it.each([
    [null, "empty"],
    ["", "empty"],
    ["yes", '"yes"'],
    [3, "3"],
    [false, "false"],
    [[], "an empty list"],
    [[1], "a list"],
    [{}, "a mapping"],
  ])("describes %j as %s", (value, expected) => {
    expect(describeValue(value)).toBe(expected);
  });
});

describe("isRecord", () => {
  it("accepts mappings only", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("a")).toBe(false);
  });
});
