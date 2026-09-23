import { format } from "prettier";
import { describe, expect, it } from "vitest";

import { check, selectScene } from "../../src/check/index.ts";
import { checkSource, documentOf, sceneOf, STEPS } from "../support/documents.ts";
import { EXAMPLE_FILES, readExample } from "../support/example.ts";

describe("check", () => {
  it("checks the example clean", async () => {
    const report = await check(await readExample(), EXAMPLE_FILES);

    expect(report).toMatchObject({ ok: true, errors: 0, warnings: 0, diagnostics: [] });
    expect(report.timeline.scenes.map(({ id, duration }) => `${id} ${duration}`)).toEqual([
      "blood 50.4",
      "molecule 45",
    ]);
  });

  it("checks translations with or without the blank line Prettier adds", async () => {
    const compact = (await readExample()).replaceAll("\n\n> ", "\n> ");
    const formatted = await format(compact, { parser: "markdown" });
    const clean = { ok: true, warnings: 0 };

    expect(formatted).toContain(".\n\n> es:");
    expect(await check(compact, EXAMPLE_FILES)).toMatchObject(clean);
    expect(await check(formatted, EXAMPLE_FILES)).toMatchObject(clean);
  });

  it("keeps checking a block after an inline comment, without errors for the value it cut", async () => {
    const steps = `${STEPS} # the smear\n  - ring: $blood/nope\n  - text: hi\n    color: #1F8FC4`;
    const report = await checkSource(documentOf(sceneOf(steps)));

    expect(report.diagnostics.map(({ code, position }) => `${code} ${position.line}`)).toEqual([
      "E103 18",
      "E201 19",
      "E103 21",
    ]);
  });

  it("counts errors and warnings and sorts diagnostics by position", async () => {
    const report = await checkSource(
      documentOf(sceneOf(undefined, "This [blood] and [plasma], 46 & more.")),
    );

    expect(report).toMatchObject({ ok: false, errors: 2, warnings: 2 });
    expect(report.diagnostics.map(({ code }) => code)).toEqual(["E134", "W201", "W502", "E501"]);
  });
});

describe("selectScene", () => {
  it("keeps one scene, its diagnostics, the global ones and its own duration", async () => {
    const source = documentOf(
      `Stray.\n\n${sceneOf(undefined, undefined, "a")}\n\n${sceneOf(undefined, "Only [blood].", "b")}`,
    );
    const report = await checkSource(source);
    const selected = selectScene(report, "a");

    expect(selected).toMatchObject({ ok: false, errors: 1, warnings: 0 });
    expect(selected?.diagnostics.map(({ code }) => code)).toEqual(["E123"]);
    expect(selected?.timeline).toEqual({
      duration: 1.9,
      scenes: [expect.objectContaining({ id: "a" })],
    });
    expect(selectScene(report, "b")?.diagnostics.map(({ code }) => code)).toEqual(["E123", "E134"]);
    expect(selectScene(report, "c")).toBeUndefined();
  });
});
