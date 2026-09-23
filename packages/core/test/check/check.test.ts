import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { check, selectScene } from "../../src/check/index.ts";
import { checkSource, documentOf, readFileOf, sceneOf } from "../support/documents.ts";

const EXAMPLE = new URL("../../../../examples/halden-ep01/", import.meta.url);

describe("check", () => {
  it("checks the example clean", async () => {
    const source = await readFile(new URL("ep01.lucent.md", EXAMPLE), "utf8");
    const manifest = await readFile(new URL("assets/images.yaml", EXAMPLE), "utf8");
    const report = await check(source, { readFile: readFileOf({ "assets/images.yaml": manifest }) });

    expect(report).toMatchObject({ ok: true, errors: 0, warnings: 0, diagnostics: [] });
    expect(report.timeline.scenes.map(({ id, duration }) => `${id} ${duration}`)).toEqual([
      "blood 50.4",
      "molecule 45",
    ]);
  });

  it("counts errors and warnings and sorts diagnostics by position", async () => {
    const report = await checkSource(documentOf(sceneOf(undefined, "This [blood] and [plasma], 46 & more.")));

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
    expect(selected?.timeline).toEqual({ duration: 1.9, scenes: [expect.objectContaining({ id: "a" })] });
    expect(selectScene(report, "b")?.diagnostics.map(({ code }) => code)).toEqual(["E123", "E134"]);
    expect(selectScene(report, "c")).toBeUndefined();
  });
});
