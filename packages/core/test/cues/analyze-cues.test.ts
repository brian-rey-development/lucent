import { describe, expect, it } from "vitest";

import { analyzeCues } from "../../src/cues/index.ts";
import { analyzed, documentOf, sceneOf } from "../support/documents.ts";

const check = async (narration: string, ...ats: readonly string[]): Promise<readonly string[]> => {
  const steps = ats.map((at) => `  - at: ${at}\n    text: t`).join("\n");
  return analyzed(analyzeCues, documentOf(sceneOf(`do:\n${steps}`, narration)));
};

describe("analyzeCues", () => {
  it("resolves phrases, ids and with", async () => {
    expect(await check("See the [Zoom in] and [the cell|cell].", "zoom-in", "cell", "with")).toEqual([]);
    expect(await check("[won’t find] it.", "won't find")).toEqual([]);
  });

  it.each([
    [["See [blood]."], ["blod"], 'E204 17:9 blood.do[0].at cue "blod" is not marked; fix: use "blood"'],
    [["See [blood|rbc]."], ["rbx"], 'E204 17:9 blood.do[0].at cue "rbx" is not marked; fix: use rbc'],
    [["See blood here."], ["blood"], 'E204 17:9 blood.do[0].at cue "blood" is not marked; fix: mark it: [blood]'],
    [
      ["See [plasma]."],
      ["something else"],
      'E204 17:9 blood.do[0].at cue "something else" is not marked; fix: mark a phrase with [ ]',
    ],
    [
      ["Say [one|first] and [one|second]."],
      ["one", "second"],
      'E204 17:9 blood.do[0].at cue "one" has an id; fix: use first|second',
    ],
    [
      ["See [blood]."],
      ["with", "blood"],
      "E209 17:9 blood.do[0].at at: with has no previous step; fix: use a cue or remove at",
    ],
    [
      ["See [blood] and [plasma]."],
      ["blood"],
      'W201 12:17 blood cue "plasma" is unused; fix: add at: plasma to a step or unmark it',
    ],
    [
      ["See [blood] and [plasma|p]."],
      ["blood"],
      'W201 12:17 blood cue "plasma" is unused; fix: add at: p to a step or unmark it',
    ],
    [
      ["See [blood] and [blood]."],
      ["blood"],
      'E137 12:17 blood duplicate cue "blood"; fix: give one an id: [PHRASE|ID]',
    ],
    [["See [a|x] and [b|x]."], ["x"], "E137 12:15 blood duplicate cue id x; fix: rename one"],
    [["See [4 cells]."], ["4 cells"], 'E205 12:5 blood cue "4 cells" has digits; fix: spell the number as spoken'],
  ])("reports %j with at %j", async ([narration = ""], ats, expected) => {
    expect(await check(`${narration}\n> es: x`, ...ats)).toEqual([expected]);
  });

  it("does not report unused cues when a step's at is unknown", async () => {
    expect(await check("See [blood] and [plasma].", '""')).toEqual([]);
    expect(await analyzed(analyzeCues, documentOf(sceneOf("do: [", "See [blood].")))).toEqual([]);
  });

  it("keeps a cue with digits or a malformed id out of the unused check", async () => {
    expect(await check("See [4 cells] and [red cells|Red].")).toEqual([
      'E205 12:5 blood cue "4 cells" has digits; fix: spell the number as spoken',
    ]);
  });
});
