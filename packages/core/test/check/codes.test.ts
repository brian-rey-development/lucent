import { describe, expect, it } from "vitest";

import { DIAGNOSTIC_CODES } from "../../src/diagnostics/index.ts";
import { CASES } from "../support/cases.ts";
import { checkSource, summarize } from "../support/documents.ts";

describe("diagnostic codes", () => {
  it.each(CASES)("$code $name: one mistake gives exactly one diagnostic", async ({ code, source, at, files }) => {
    const { diagnostics } = await checkSource(source, files);

    expect(diagnostics.map(summarize)).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code, position: { line: at[0], column: at[1] } });
  });

  it("covers every code", () => {
    const missing = Object.keys(DIAGNOSTIC_CODES).filter((code) => !CASES.some((covered) => covered.code === code));

    expect(missing).toEqual([]);
  });
});
