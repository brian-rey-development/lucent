import { describe, expect, it } from "vitest";

import { loadAssets } from "../../src/assets/index.ts";
import { MANIFEST, readFileOf, summarize } from "../support/documents.ts";

const SOURCE = { kind: "file", path: "images.yaml", position: { line: 7, column: 9 } } as const;
const load = async (manifest: string) => loadAssets(SOURCE, readFileOf({ "images.yaml": manifest }));

describe("loadAssets", () => {
  it("loads the manifest", async () => {
    const { value, diagnostics } = await load(`\uFEFF${MANIFEST}`);

    expect(diagnostics).toEqual([]);
    expect(value).toEqual({
      status: "loaded",
      complete: true,
      manifest: new Map([
        [
          "blood",
          {
            points: new Map([
              ["wbc", [0.46, 0.41, 0.145]],
              ["rbc_1", [0.26, 0.3, 0.08]],
            ]),
          },
        ],
      ]),
    });
  });

  it("needs no manifest when the frontmatter has none", async () => {
    expect(await loadAssets({ kind: "none" }, readFileOf({}))).toEqual({ value: { status: "none" }, diagnostics: [] });
    expect(await loadAssets({ kind: "invalid" }, readFileOf({}))).toEqual({
      value: { status: "unavailable" },
      diagnostics: [],
    });
  });

  it("reports a manifest it cannot read, with the reason", async () => {
    const { value, diagnostics } = await loadAssets(SOURCE, readFileOf({}));

    expect(value).toEqual({ status: "unavailable" });
    expect(diagnostics.map(summarize)).toEqual([
      "E141 7:9 frontmatter.assets cannot read images.yaml: no such file; fix: check the path; it is relative to the video file",
    ]);
  });

  it("keeps valid entries and marks broken ones unknown", async () => {
    const { value, diagnostics } = await load(
      "blood:\n  file: b.jpg\n  points: [1]\ncell: 3\nBad:\n  file: c.jpg\nok:\n  file: d.jpg\n  points:\n    a: [2, 0, 0]",
    );

    expect(
      diagnostics.map(({ code, file, position }) => `${code} ${file ?? ""}:${position.line}:${position.column}`),
    ).toEqual(["E105 images.yaml:3:11", "E105 images.yaml:4:7", "E105 images.yaml:5:1", "E105 images.yaml:10:9"]);
    expect(value).toEqual({
      status: "loaded",
      complete: false,
      manifest: new Map([
        ["blood", { points: undefined }],
        ["cell", undefined],
        ["ok", { points: new Map([["a", undefined]]) }],
      ]),
    });
  });

  it("treats an empty manifest as empty and a broken one as unavailable", async () => {
    expect((await load("")).value).toEqual({ status: "loaded", complete: true, manifest: new Map() });
    expect((await load("- a")).value).toEqual({ status: "unavailable" });
    expect((await load("a: [")).value).toEqual({ status: "unavailable" });
  });

  it("accepts entries without points and rejects invalid point names", async () => {
    const { value } = await load("a:\n  file: a.jpg\nb:\n  file: b.jpg\n  points:\n    Bad: [0, 0, 0]");

    expect(value).toEqual({
      status: "loaded",
      complete: true,
      manifest: new Map([
        ["a", { points: new Map() }],
        ["b", { points: undefined }],
      ]),
    });
  });
});
