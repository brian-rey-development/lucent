import { describe, expect, it } from "vitest";

import { compareDiagnostics, createDiagnostic, isError } from "../../src/diagnostics/index.ts";

const at = (code: "E101" | "W201", line: number, file?: string) =>
  createDiagnostic(
    { code, message: "m", fix: "f" },
    { where: "w", file, position: { line, column: 1 } },
  );

describe("compareDiagnostics", () => {
  it("orders by file, then position, then code", () => {
    const sorted = [
      at("W201", 2),
      at("E101", 1, "images.yaml"),
      at("W201", 1),
      at("E101", 1),
    ].toSorted(compareDiagnostics);

    expect(
      sorted.map(({ code, position, file }) => `${file ?? ""}${position.line}${code}`),
    ).toEqual(["1E101", "1W201", "2W201", "images.yaml1E101"]);
  });
});

describe("isError", () => {
  it("is true for errors only", () => {
    expect(isError(at("E101", 1))).toBe(true);
    expect(isError(at("W201", 1))).toBe(false);
  });
});
