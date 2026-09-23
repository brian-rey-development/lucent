import { describe, expect, it } from "vitest";

import { analyzeSubtitles } from "../../src/subtitles/index.ts";
import { analyzed, documentOf, FRONTMATTER, sceneOf } from "../support/documents.ts";

const check = async (narration: string, frontmatter = FRONTMATTER): Promise<readonly string[]> =>
  analyzed(analyzeSubtitles, documentOf(sceneOf(undefined, narration), frontmatter));

describe("analyzeSubtitles", () => {
  it("accepts one translation per extra language", async () => {
    expect(await check("This is [blood].\n> es: Esto es sangre.")).toEqual([]);
  });

  it.each([
    ["This is [blood].", "E134 12:1 blood missing es translation; fix: add > es: TEXT"],
    [
      "This is [blood].\n> es: Sangre.\n> en: Blood.",
      "E133 14:1 blood en is the spoken language; fix: remove the line",
    ],
    [
      "This is [blood].\n> es: Sangre.\n> fr: Sang.",
      "E133 14:1 blood fr is not in subtitles; fix: add fr to subtitles or remove the line",
    ],
    ["This is [blood].\n> es: Sangre.\n> es: Otra.", "E135 14:1 blood duplicate es translation; fix: remove one"],
    [
      `This is [blood].\n> es: ${"sangre ".repeat(10)}`,
      "W401 13:1 blood es subtitle needs 60 characters per second, max 20; fix: shorten the translation",
    ],
  ])("checks %j", async (narration, expected) => {
    expect(await check(narration)).toEqual([expected]);
  });

  it("skips the missing check when a translation is malformed", async () => {
    expect(await check("This is [blood].\n> ES: Sangre.")).toEqual([]);
  });

  it("skips paragraphs without words and videos with invalid subtitles", async () => {
    expect(await check("[]\n> es: algo")).toEqual([]);
    expect(await check("This is [blood].", FRONTMATTER.replace("[en, es]", "[en, en]"))).toEqual([]);
  });
});
