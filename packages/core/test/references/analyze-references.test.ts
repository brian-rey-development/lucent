import { describe, expect, it } from "vitest";

import { analyzeReferences } from "../../src/references/index.ts";
import { analyzed, documentOf, FRONTMATTER, sceneOf, STEPS } from "../support/documents.ts";

const check = async (yaml: string, next?: string): Promise<readonly string[]> => {
  const scenes =
    next === undefined ? sceneOf(yaml) : `${sceneOf(yaml)}\n\n${sceneOf(next, undefined, "next")}`;
  return analyzed(analyzeReferences, documentOf(scenes));
};
const lines = (steps: readonly string[]): string =>
  `do:\n${steps.map((step) => `  - ${step}`).join("\n")}`;

describe("analyzeReferences", () => {
  it("accepts elements, points, colors and changes that exist", async () => {
    const yaml = lines([
      "photo: blood\n    center: wbc",
      "ring: [$blood/wbc, $blood]\n    color: dna",
      "text: hi\n    id: note",
      "$note: { text: bye, color: dna }",
      "hide: $note",
      "sheet:\n      - text: a\n        id: inner",
      "$inner: { text: b }",
    ]);

    expect(await check(yaml)).toEqual([]);
  });

  it.each([
    [
      ["photo: blood\n    center: nucleus"],
      "E201 18:13 blood.do[0].center blood has no point nucleus; fix: use wbc|rbc_1",
    ],
    [
      ["photo: blood", "ring: $blood/wbcc"],
      "E201 18:11 blood.do[1].ring blood has no point wbcc; fix: use wbc",
    ],
    [
      ["text: hi", "ring: $text/point"],
      "E201 18:11 blood.do[1].ring $text has no points; fix: target $text",
    ],
    [["photo: blod"], "E203 17:12 blood.do[0].photo unknown asset blod; fix: use blood"],
    [
      ["photo: cell"],
      "E203 17:12 blood.do[0].photo unknown asset cell; fix: add cell to the manifest",
    ],
    [
      ["photo: blood", "ring: $blod"],
      "E202 18:11 blood.do[1].ring $blod is not on screen; fix: use $blood",
    ],
    [
      ["image: blood", "ring: $image"],
      "E202 18:11 blood.do[1].ring $image is not on screen; fix: use $blood",
    ],
    [
      ["ring: $nothing"],
      "E202 17:11 blood.do[0].ring $nothing is not on screen; fix: show it first or keep it",
    ],
    [
      ["photo: blood", "hide: $blood", "ring: $blood"],
      "E202 19:11 blood.do[2].ring $blood was hidden at blood.do[1]; fix: show it again or drop this reference",
    ],
    [
      ["photo: blood", "zoom: $blood/wbc\n    into:\n      helix: {}", "ring: $blood"],
      "E202 21:11 blood.do[2].ring $blood was cleared by zoom at blood.do[1]; fix: show it again or drop this reference",
    ],
    [
      ["text: a\n    id: x", "text: b\n    id: x"],
      "E206 20:9 blood.do[1].id $x is already on screen; fix: choose another id or hide it first",
    ],
    [
      ["text: a", "text: b", "$text: { text: c }"],
      "E206 19:5 blood.do[2].$text $text is ambiguous: two elements share it; fix: add id: to one of them",
    ],
    [
      ["text: a\n    color: red"],
      "E207 18:12 blood.do[0].color unknown color red; fix: define it under colors in the frontmatter",
    ],
    [["text: a\n    color: dan"], "E207 18:12 blood.do[0].color unknown color dan; fix: use dna"],
    [
      ["text: a", "$text: { color: red }"],
      "E207 18:21 blood.do[1].$text.color unknown color red; fix: define it under colors in the frontmatter",
    ],
    [
      ["photo: blood", "$blood: { x: 1 }"],
      "E105 18:5 blood.do[1].$blood is a photo, which has no state; fix: remove it; only text|bar|number|helix|bases change",
    ],
    [
      ["number: 1", "$number: 5"],
      "E105 18:5 blood.do[1].$number is 5; fix: write $number: {number}",
    ],
    [
      ["text: a", "$text: { size: huge }"],
      'E105 18:20 blood.do[1].$text.size is "huge"; fix: use s|m|l|xl',
    ],
  ])("reports %j", async (steps, expected) => {
    expect(await check(lines(steps))).toEqual([expected]);
  });

  it("hides and keeps every descendant of a nested sheet", async () => {
    const nested =
      "sheet:\n      - sheet:\n          - text: deep\n            id: deep\n        id: inner\n    id: outer";

    expect(await check(lines([nested, "hide: $outer", "ring: $deep"]))).toEqual([
      "E202 24:11 blood.do[2].ring $deep was hidden at blood.do[1]; fix: show it again or drop this reference",
    ]);
    expect(await check(lines([nested]), `keep: $outer\n${lines(["ring: $deep"])}`)).toEqual([]);
  });

  it("reports a kept element that is not on screen", async () => {
    expect(await check(STEPS, `keep: $blod\n${STEPS}`)).toEqual([
      "E208 27:7 next.keep $blod is not on screen when next starts; fix: keep $blood",
    ]);
    expect(
      await check(
        lines(["photo: blood", "hide: $blood"]),
        `keep: $blood\n${lines(["ring: $blood"])}`,
      ),
    ).toEqual([
      "E208 27:7 next.keep $blood was hidden at blood.do[1]; fix: show it again or drop this reference",
    ]);
  });

  it("reports nothing that depends on a block it could not read", async () => {
    expect(await check("do: [", `keep: $blood\n${lines(["ring: $blood/wbc"])}`)).toEqual([]);
    expect(await check(STEPS, `keep: blood\n${lines(["ring: $x"])}`)).toEqual([]);
    expect(await check(lines(["phto blood", "ring: $blood"]))).toEqual([]);
    expect(await check(lines(["photo: blood"]), "do: {}")).toEqual([]);
  });

  it("declares the element of a step that failed validation", async () => {
    expect(await check(lines(["phto: blood", "ring: $blood/wbc"]))).toEqual([]);
    expect(await check(lines(["photo: blood\n    drift: medium", "ring: $blood/nucleus"]))).toEqual(
      ["E201 19:11 blood.do[1].ring blood has no point nucleus; fix: use wbc|rbc_1"],
    );
  });

  it("reports a missing manifest once", async () => {
    const source = documentOf(
      sceneOf(lines(["photo: blood", "image: cell"])),
      FRONTMATTER.replace("assets: images.yaml\n", ""),
    );

    expect(await analyzed(analyzeReferences, source)).toEqual([
      "E203 16:12 blood.do[0].photo no asset manifest; fix: add assets: FILE to the frontmatter",
    ]);
  });

  it("checks nothing against a manifest it could not read", async () => {
    expect(
      await analyzed(analyzeReferences, documentOf(sceneOf(lines(["photo: cell"]))), {}),
    ).toEqual([]);
  });
});
