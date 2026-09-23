import { describe, expect, it } from "vitest";

import { parseFrontmatter, splitFrontmatter } from "../../src/frontmatter/index.ts";
import { splitLines } from "../../src/text/index.ts";
import { FRONTMATTER, summarize } from "../support/documents.ts";

const parse = (source: string) => parseFrontmatter(splitFrontmatter(splitLines(source)));

describe("splitFrontmatter", () => {
  it("finds the block after leading blank lines", () => {
    expect(splitFrontmatter(["", "---", "a: b", "---", "body"])).toEqual({
      kind: "found",
      block: { text: "a: b", firstLine: 3 },
      bodyStart: 4,
    });
  });

  it("reports a missing or unclosed block", () => {
    expect(splitFrontmatter(["", "## a"])).toEqual({ kind: "missing", line: 2, bodyStart: 0 });
    expect(splitFrontmatter(["---", "a: b"])).toEqual({ kind: "unclosed", line: 1, bodyStart: 2 });
    expect(splitFrontmatter([])).toEqual({ kind: "missing", line: 1, bodyStart: 0 });
  });
});

describe("parseFrontmatter", () => {
  it("builds the settings", () => {
    const { value, diagnostics } = parse(FRONTMATTER);

    expect(diagnostics).toEqual([]);
    expect(value).toEqual({
      subtitles: ["en", "es"],
      colors: new Set(["dna"]),
      assets: { kind: "file", path: "images.yaml", position: { line: 7, column: 9 } },
    });
  });

  it("keeps the valid fields when another one is invalid", () => {
    const { value, diagnostics } = parse(FRONTMATTER.replace("kokoro/am_fenrir", "kokoro"));

    expect(diagnostics.map(summarize)).toEqual([
      'E105 4:8 frontmatter.voice is "kokoro"; fix: write ENGINE/VOICE, like kokoro/am_fenrir',
    ]);
    expect(value.subtitles).toEqual(["en", "es"]);
    expect(value.assets.kind).toBe("file");
  });

  it("marks invalid or absent fields", () => {
    const source = "---\nlucent: 0\ntitle: T\nvoice: a/b\nsubtitles: [EN]\ncolors: [red]\nassets: 3\n---";
    const { value } = parse(source);

    expect(value).toEqual({ subtitles: undefined, colors: undefined, assets: { kind: "invalid" } });
    expect(parse("---\nlucent: 0\n---").value).toEqual({
      subtitles: undefined,
      colors: new Set(),
      assets: { kind: "none" },
    });
  });

  it("reports missing keys for an empty block", () => {
    expect(parse("---\n---").diagnostics.map(({ code, message }) => `${code} ${message}`)).toEqual([
      "E106 missing key lucent",
      "E106 missing key title",
      "E106 missing key voice",
      "E106 missing key subtitles",
    ]);
  });

  it("reports a block that is not a mapping or not YAML", () => {
    expect(parse("---\n- a\n---").diagnostics.map(summarize)).toEqual([
      "E105 2:1 frontmatter is a list; fix: write a mapping",
    ]);
    expect(parse("---\na: [\n---").value.assets).toEqual({ kind: "invalid" });
  });

  it("reports a missing or unclosed frontmatter", () => {
    expect(parse("## a").diagnostics.map(summarize)).toEqual([
      "E101 1:1 frontmatter the file does not start with ---; fix: start with ---, the frontmatter, then ---",
    ]);
    expect(parse("---\na: b").diagnostics.map(summarize)).toEqual([
      "E101 1:1 frontmatter the frontmatter is never closed; fix: add a --- line after the frontmatter",
    ]);
  });
});
