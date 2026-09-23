import type { DiagnosticCode } from "../../src/diagnostics/index.ts";
import {
  documentOf,
  FRONTMATTER,
  MANIFEST,
  NARRATION,
  sceneOf,
  STEPS,
  type Files,
} from "./documents.ts";

export interface Case {
  readonly code: DiagnosticCode;
  readonly name: string;
  readonly source: string;
  readonly at: readonly [line: number, column: number];
  readonly files?: Files;
}

const frontmatter = (replace: string, by: string): string => FRONTMATTER.replace(replace, by);

export const CASES: readonly Case[] = [
  { code: "E101", name: "no frontmatter", source: sceneOf(), at: [1, 1] },
  { code: "E101", name: "unclosed frontmatter", source: "---\nlucent: 0\n", at: [1, 1] },
  {
    code: "E102",
    name: "unclosed flow list",
    source: documentOf(sceneOf("do:\n  - at: blood\n    ring: [$blood")),
    at: [18, 18],
  },
  {
    code: "E102",
    name: "alias",
    source: documentOf(sceneOf(`${STEPS}\n  - text: *emphasis*`)),
    at: [19, 11],
  },
  {
    code: "E103",
    name: "inline comment",
    source: documentOf(sceneOf(`${STEPS} # the smear`)),
    at: [18, 18],
  },
  {
    code: "E103",
    name: "unquoted hex",
    source: documentOf(sceneOf(), frontmatter('"#1F8FC4"', "#1F8FC4")),
    at: [6, 16],
  },
  {
    code: "E104",
    name: "unknown key",
    source: documentOf(sceneOf(`${STEPS}\n    lable: x`)),
    at: [19, 5],
  },
  {
    code: "E105",
    name: "invalid value",
    source: documentOf(sceneOf(`${STEPS}\n    drift: medium`)),
    at: [19, 12],
  },
  {
    code: "E106",
    name: "missing key",
    source: documentOf(sceneOf("do:\n  - at: blood\n    bar: { share: 0.5 }")),
    at: [18, 10],
  },
  {
    code: "E111",
    name: "two verbs",
    source: documentOf(sceneOf(`${STEPS}\n    ring: $blood`)),
    at: [19, 5],
  },
  {
    code: "E112",
    name: "misspelled verb",
    source: documentOf(sceneOf("do:\n  - at: blood\n    phto: blood")),
    at: [18, 5],
  },
  {
    code: "E113",
    name: "id on hide",
    source: documentOf(sceneOf(`${STEPS}\n  - hide: $blood\n    id: gone`)),
    at: [20, 5],
  },
  { code: "E120", name: "no scenes", source: documentOf(""), at: [9, 1] },
  {
    code: "E121",
    name: "invalid scene id",
    source: documentOf(sceneOf(STEPS, undefined, "Blood")),
    at: [10, 1],
  },
  {
    code: "E122",
    name: "duplicate scene",
    source: documentOf(`${sceneOf()}\n\n${sceneOf()}`),
    at: [21, 1],
  },
  { code: "E123", name: "stray text", source: documentOf(`Stray.\n\n${sceneOf()}`), at: [10, 1] },
  {
    code: "E124",
    name: "title heading",
    source: documentOf(`# Title\n\n${sceneOf()}`),
    at: [10, 1],
  },
  {
    code: "E125",
    name: "no scene block",
    source: documentOf(`## blood\n\n${NARRATION}`),
    at: [10, 1],
  },
  {
    code: "E126",
    name: "second block",
    source: documentOf(`${sceneOf()}\n\n\`\`\`scene\n${STEPS}\n\`\`\``),
    at: [21, 1],
  },
  {
    code: "E127",
    name: "unclosed fence",
    source: documentOf(`${sceneOf()}\n\n\`\`\`scene\ndo:`),
    at: [21, 1],
  },
  {
    code: "E128",
    name: "yaml fence",
    source: documentOf(sceneOf().replace("```scene", "```yaml")),
    at: [15, 1],
  },
  {
    code: "E129",
    name: "no narration",
    source: documentOf("## blood\n\n```scene\ndo:\n  - photo: blood\n```"),
    at: [10, 1],
  },
  {
    code: "E130",
    name: "unclosed comment",
    source: documentOf(`${sceneOf()}\n\n<!-- draft`),
    at: [21, 1],
  },
  {
    code: "E131",
    name: "orphan translation",
    source: documentOf(sceneOf(STEPS, `${NARRATION}\n\n> es: huérfano`)),
    at: [15, 1],
  },
  {
    code: "E132",
    name: "uppercase language",
    source: documentOf(sceneOf(STEPS, "This is [blood].\n> ES: Esto es sangre.")),
    at: [13, 1],
  },
  {
    code: "E133",
    name: "language not in subtitles",
    source: documentOf(sceneOf(STEPS, `${NARRATION}\n> fr: C'est du sang.`)),
    at: [14, 1],
  },
  {
    code: "E134",
    name: "missing translation",
    source: documentOf(sceneOf(STEPS, "This is [blood].")),
    at: [12, 1],
  },
  {
    code: "E135",
    name: "duplicate translation",
    source: documentOf(sceneOf(STEPS, `${NARRATION}\n> es: Otra vez.`)),
    at: [14, 1],
  },
  {
    code: "E136",
    name: "unmatched bracket",
    source: documentOf(sceneOf(STEPS, "This is [blood]. And [more.\n> es: Esto es sangre.")),
    at: [12, 22],
  },
  {
    code: "E137",
    name: "duplicate cue",
    source: documentOf(sceneOf(STEPS, "This is [blood]. More [blood].\n> es: Esto es sangre.")),
    at: [12, 23],
  },
  {
    code: "E138",
    name: "malformed pause",
    source: documentOf(sceneOf(STEPS, `${NARRATION}\n\n(pause 1 s)`)),
    at: [15, 1],
  },
  {
    code: "E141",
    name: "unreadable manifest",
    source: documentOf(sceneOf()),
    at: [7, 9],
    files: {},
  },
  {
    code: "E142",
    name: "missing asset file",
    source: documentOf(sceneOf()),
    at: [2, 9],
    files: { "images.yaml": MANIFEST },
  },
  {
    code: "E201",
    name: "unknown point",
    source: documentOf(sceneOf(`${STEPS}\n  - ring: $blood/nucleus`)),
    at: [19, 11],
  },
  {
    code: "E202",
    name: "not on screen",
    source: documentOf(sceneOf(`${STEPS}\n  - ring: $cell`)),
    at: [19, 11],
  },
  {
    code: "E203",
    name: "unknown asset",
    source: documentOf(sceneOf("do:\n  - at: blood\n    photo: cell")),
    at: [18, 12],
  },
  {
    code: "E204",
    name: "cue not marked",
    source: documentOf(sceneOf("do:\n  - at: blod\n    photo: blood")),
    at: [17, 9],
  },
  {
    code: "E205",
    name: "cue with digits",
    source: documentOf(
      sceneOf("do:\n  - at: 4 cells\n    photo: blood", "These [4 cells].\n> es: Estas células."),
    ),
    at: [12, 7],
  },
  {
    code: "E206",
    name: "duplicate id",
    source: documentOf(sceneOf(`${STEPS}\n  - text: a\n    id: note\n  - text: b\n    id: note`)),
    at: [22, 9],
  },
  {
    code: "E207",
    name: "unknown color",
    source: documentOf(sceneOf(`${STEPS}\n  - ring: $blood\n    color: red`)),
    at: [20, 12],
  },
  {
    code: "E208",
    name: "kept element missing",
    source: documentOf(`${sceneOf()}\n\n${sceneOf(`keep: $cell\n${STEPS}`, undefined, "cells")}`),
    at: [27, 7],
  },
  {
    code: "E209",
    name: "with on first step",
    source: documentOf(
      sceneOf(`do:\n  - at: with\n    photo: blood\n  - at: blood\n    ring: $blood`),
    ),
    at: [17, 9],
  },
  {
    code: "W201",
    name: "unused cue",
    source: documentOf(
      sceneOf(STEPS, "This is [blood] and [plasma].\n> es: Esto es sangre y plasma."),
    ),
    at: [12, 21],
  },
  {
    code: "W401",
    name: "fast subtitle",
    source: documentOf(sceneOf(STEPS, `This is [blood].\n> es: ${"sangre ".repeat(20)}`)),
    at: [13, 1],
  },
  {
    code: "W402",
    name: "long paragraph",
    source: documentOf(
      sceneOf(STEPS, `This is [blood]${" and more".repeat(30)}.\n> es: ${"y más ".repeat(30)}`),
    ),
    at: [12, 1],
  },
  {
    code: "E501",
    name: "symbol",
    source: documentOf(sceneOf(STEPS, "This is [blood] & more.\n> es: Esto es sangre.")),
    at: [12, 17],
  },
  {
    code: "W502",
    name: "digits",
    source: documentOf(sceneOf(STEPS, "This is [blood], 46 of them.\n> es: Esto es sangre.")),
    at: [12, 18],
  },
];

export { MANIFEST };
