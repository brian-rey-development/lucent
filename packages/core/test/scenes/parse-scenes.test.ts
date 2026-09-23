import { describe, expect, it } from "vitest";

import type { Paragraph } from "../../src/model/index.ts";
import { parseScenes, type SceneSource } from "../../src/scenes/index.ts";
import { summarize } from "../support/documents.ts";

const parse = (text: string) => parseScenes(text.split("\n"), 1);
const problems = (text: string): readonly string[] => parse(text).diagnostics.map(summarize);
const scene = (text: string): SceneSource => {
  const [first] = parse(text).value;
  if (first === undefined) throw new Error("expected a scene");
  return first;
};
const paragraph = (text: string): Paragraph => {
  const [first] = scene(text).narration;
  if (first?.kind !== "paragraph") throw new Error("expected a paragraph");
  return first;
};
const BLOCK = "```scene\ndo:\n  - photo: blood\n```";

describe("parseScenes", () => {
  it("splits scenes into narration and one block", () => {
    expect(parse(`## a\n\nOne [cue].\n> es: Uno.\n\n(pause 1.5s)\n\n${BLOCK}`)).toEqual({
      value: [
        {
          id: "a",
          position: { line: 1, column: 1 },
          narration: [
            expect.objectContaining({
              kind: "paragraph",
              text: "One cue.",
              translations: [{ language: "es", text: "Uno.", position: { line: 4, column: 1 } }],
            }),
            { kind: "pause", seconds: 1.5, position: { line: 6, column: 1 } },
          ],
          block: { text: "do:\n  - photo: blood", firstLine: 9 },
        },
      ],
      diagnostics: [],
    });
  });

  it("accepts ~~~ fences and an info string after the language", () => {
    expect(scene(`## a\n\nText.\n\n~~~scene\ndo: []\n~~~`).block).toEqual({
      text: "do: []",
      firstLine: 6,
    });
    expect(scene(`## a\n\nText.\n\n\`\`\`scene title\ndo: []\n\`\`\``).block).toEqual({
      text: "do: []",
      firstLine: 6,
    });
  });

  it("masks comments anywhere and keeps the text around them", () => {
    const text = paragraph(
      `## a\n\nHello <!-- inline --> there.\n<!-- a whole line -->\n<!-- spans\ntwo lines --> again.\n\n${BLOCK}`,
    );

    expect(text.text).toBe("Hello there. again.");
    expect(text.lines.map(({ line }) => line)).toEqual([3, 6]);
  });

  it.each([
    ["## Bad Id", 'E121 1:1 Bad Id invalid scene id "Bad Id"; fix: use bad-id'],
    ["##", "E121 1:1 document empty scene id; fix: write ## scene-id"],
    [
      "### plasma",
      'E124 1:1 document "### plasma" is not a scene heading; fix: use ## plasma or remove it',
    ],
    [
      "# !!!",
      'E124 1:1 document "# !!!" is not a scene heading; fix: use ## scene-id or remove it',
    ],
  ])("reports the heading %j on its own scene", (heading, expected) => {
    expect(problems(`${heading}\n\nText.\n\n${BLOCK}`)).toEqual([expected]);
  });

  it("ignores everything under a heading that is not a scene", () => {
    expect(
      problems(`# Title\n\nIntro [x].\n\n\`\`\`yaml\na: b\n\`\`\`\n\n## a\n\nText.\n\n${BLOCK}`),
    ).toEqual([
      'E124 1:1 document "# Title" is not a scene heading; fix: use ## title or remove it',
    ]);
  });

  it("treats hashtags as text", () => {
    expect(paragraph(`## a\n\n#hashtag here.\n\n${BLOCK}`).text).toBe("#hashtag here.");
  });

  it.each([
    [
      `## a\n\nText.\n\n${BLOCK}\n\n${BLOCK}`,
      "E126 10:1 a duplicate scene block; fix: merge both into one",
    ],
    [`## a\n\nText.\n\n\`\`\`scene\ndo:`, "E127 5:1 a fence never closed; fix: close it with ```"],
    [
      `## a\n\nText.\n\n~~~\ndo:\n~~~`,
      "E128 5:1 a fence without a language is not a scene block; fix: use ~~~scene",
    ],
    [
      `${BLOCK}\n\n## a\n\nText.\n\n${BLOCK}`,
      "E123 1:1 document scene block outside a scene; fix: add ## scene-id above it",
    ],
    [
      `Stray.\nMore.\n\n## a\n\nText.\n\n${BLOCK}`,
      "E123 1:1 document text outside a scene; fix: add ## scene-id above it",
    ],
    [
      `(pause 1s)\n\n## a\n\nText.\n\n${BLOCK}`,
      "E123 1:1 document text outside a scene; fix: add ## scene-id above it",
    ],
    [`## a\n\n${BLOCK}`, "E129 1:1 a no narration; fix: add a paragraph or (pause 2s)"],
    [`## a\n\nText.`, "E125 1:1 a no scene block; fix: add a ```scene block with do:"],
    [
      `## a\n\nText.\n\n${BLOCK}\n\n## a\n\nText.\n\n${BLOCK}`,
      "E122 10:1 a duplicate scene id a; fix: rename one",
    ],
    [
      `## a\n\nText.\n<!-- open\n\n${BLOCK}`,
      "E130 4:1 a comment never closed; fix: close it with -->",
    ],
    [
      `## a\n\n> es: Hola.\n\nText.\n\n${BLOCK}`,
      "E131 3:1 a translation without a paragraph; fix: put it right after its paragraph",
    ],
    [
      `## a\n\nText.\n> a quote\n\n${BLOCK}`,
      "E132 4:1 a malformed translation; fix: write > xx: TEXT",
    ],
    [
      `## a\n\n> a quote\n\nText.\n\n${BLOCK}`,
      "E132 3:1 a malformed translation; fix: write > xx: TEXT",
    ],
    [
      `## a\n\nText.\n> ES: Hola.\n\n${BLOCK}`,
      "E132 4:1 a uppercase language ES; fix: write > es: TEXT",
    ],
    [
      `## a\n\nText.\n\n(pause 1 s)\n\n${BLOCK}`,
      "E138 5:1 a malformed pause; fix: write (pause 1.5s)",
    ],
    [
      `## a\n\nText.\n\n(Pause 90s)\n\n${BLOCK}`,
      "E138 5:1 a pause of 90s; fix: use more than 0s and at most 60s",
    ],
    [
      `## a\n\nText.\n\n(pause 0s)\n\n${BLOCK}`,
      "E138 5:1 a pause of 0s; fix: use more than 0s and at most 60s",
    ],
  ])("reports %j", (text, expected) => {
    expect(problems(text)).toEqual([expected]);
  });

  it("reports a file without scenes once", () => {
    expect(problems("")).toEqual([
      "E120 1:1 document no scenes; fix: add ## scene-id and its narration",
    ]);
    expect(problems("Stray.")).toEqual([
      "E123 1:1 document text outside a scene; fix: add ## scene-id above it",
    ]);
  });

  it("starts a new paragraph after a translation", () => {
    const { narration } = scene(`## a\n\nOne.\n> es: Uno.\nTwo.\n> es: Dos.\n\n${BLOCK}`);

    expect(narration.map((item) => (item.kind === "paragraph" ? item.text : item.kind))).toEqual([
      "One.",
      "Two.",
    ]);
  });

  it("uses the first non-blank column for indented lines", () => {
    expect(paragraph(`## a\n\n  Indented.\n\n${BLOCK}`).position).toEqual({ line: 3, column: 3 });
  });
});

describe("paragraphs", () => {
  it("parses cues with ids, positions and word indexes", () => {
    const { cues, text, lines } = paragraph(
      `## a\n\nThese are [red cells|rbc] and [white\ncells].\n\n${BLOCK}`,
    );

    expect(text).toBe("These are red cells and white cells.");
    expect(cues).toEqual([
      {
        phrase: "red cells",
        id: "rbc",
        paragraph: 0,
        wordIndex: 2,
        position: { line: 3, column: 11 },
        end: { line: 3, column: 25 },
        malformed: false,
      },
      {
        phrase: "white cells",
        id: undefined,
        paragraph: 0,
        wordIndex: 5,
        position: { line: 3, column: 31 },
        end: { line: 4, column: 6 },
        malformed: false,
      },
    ]);
    expect(lines.map(({ spoken }) => spoken)).toEqual([
      "These are  red cells      and  white",
      "cells .",
    ]);
  });

  it.each([
    ["Empty [] cue.", "E136 3:7 a empty cue; fix: put the spoken words inside [ ]"],
    ["Bad [red|Red] id.", 'E136 3:5 a invalid cue id "Red"; fix: use red'],
    ["Two [a|b|c] ids.", "E136 3:5 a cue with two ids; fix: write [PHRASE|ID]"],
    ["Open [bracket.", "E136 3:6 a unmatched [; fix: close the cue or remove the bracket"],
    ["Close] bracket.", "E136 3:6 a unmatched ]; fix: close the cue or remove the bracket"],
  ])("reports %j", (text, expected) => {
    expect(problems(`## a\n\n${text}\n\n${BLOCK}`)).toEqual([expected]);
  });

  it("keeps the words of a malformed cue", () => {
    const { text, cues } = paragraph(`## a\n\nThese are [red cells|Red] now.\n\n${BLOCK}`);

    expect(text).toBe("These are red cells now.");
    expect(cues).toEqual([
      expect.objectContaining({ phrase: "red cells", id: undefined, malformed: true }),
    ]);
  });
});
