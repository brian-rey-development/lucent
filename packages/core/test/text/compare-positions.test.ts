import { describe, expect, it } from "vitest";

import { comparePositions } from "../../src/text/index.ts";

describe("comparePositions", () => {
  it("orders by line, then column", () => {
    expect(comparePositions({ line: 1, column: 9 }, { line: 2, column: 1 })).toBeLessThan(0);
    expect(comparePositions({ line: 2, column: 3 }, { line: 2, column: 1 })).toBeGreaterThan(0);
    expect(comparePositions({ line: 2, column: 1 }, { line: 2, column: 1 })).toBe(0);
  });
});
