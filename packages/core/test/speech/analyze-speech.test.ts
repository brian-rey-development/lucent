import { describe, expect, it } from "vitest";

import { analyzeSpeech } from "../../src/speech/index.ts";
import { analyzed, documentOf, sceneOf } from "../support/documents.ts";

const check = async (narration: string): Promise<readonly string[]> =>
  analyzed(analyzeSpeech, documentOf(sceneOf(undefined, narration)));

describe("analyzeSpeech", () => {
  it("accepts plain narration and ignores cue syntax", async () => {
    expect(await check("Cells [like these|rbc_1] carry oxygen; they're red.")).toEqual([]);
  });

  it.each([
    ["Eighty % of them.", 'E501 12:8 blood "%" cannot be spoken; fix: write "percent"'],
    ["Two µm wide.", 'E501 12:5 blood "µ" cannot be spoken; fix: write "micro"'],
    ["A \u2014 B.", 'E501 12:3 blood "\u2014" cannot be spoken; fix: use a comma'],
    [
      "There are 46 of them.",
      "W502 12:11 blood digits 46 may be misread; fix: spell the number as spoken",
    ],
    ["Look at [cell 4] here.", ""],
  ])("checks %j", async (narration, expected) => {
    expect(await check(narration)).toEqual(expected === "" ? [] : [expected]);
  });

  it("warns about a paragraph too long for one breath", async () => {
    expect(await check(`${"word ".repeat(61)}end.`)).toEqual([
      "W402 12:1 blood 62 words in one paragraph; fix: split it into two paragraphs",
    ]);
  });

  it("checks every line of a paragraph at its own column", async () => {
    expect(await check("First line.\n  Then & more.")).toEqual([
      'E501 13:8 blood "&" cannot be spoken; fix: write "and"',
    ]);
  });
});
