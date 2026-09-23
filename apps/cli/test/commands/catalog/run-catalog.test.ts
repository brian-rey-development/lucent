import { describe, expect, it } from "vitest";

import { runCatalog } from "../../../src/commands/catalog/index.ts";
import { fakeIo } from "../../support/fake-io.ts";

describe("runCatalog", () => {
  it("lists every verb", () => {
    const io = fakeIo();

    expect(runCatalog({ verb: undefined, schema: false, codes: false }, io)).toBe(0);
    expect(io.out[0]).toContain("ring TARGET..");
  });

  it("prints one verb without padding, or its JSON Schema", () => {
    const io = fakeIo();
    runCatalog({ verb: "note", schema: false, codes: false }, io);
    runCatalog({ verb: "note", schema: true, codes: false }, io);

    expect(io.out[0]).toBe("note TEXT small print, such as a source");
    expect(JSON.parse(io.out[1] ?? "")).toMatchObject({ type: "object", required: ["note"] });
  });

  it("lists every diagnostic code without the severity word", () => {
    const io = fakeIo();
    runCatalog({ verb: undefined, schema: false, codes: true }, io);

    expect(io.out[0]?.split("\n")).toContain("E209 at: with and no previous step");
  });

  it("rejects an unknown verb", () => {
    expect(() => runCatalog({ verb: "nope", schema: false, codes: false }, fakeIo())).toThrow(
      /^unknown verb nope; verbs: photo/,
    );
  });
});
