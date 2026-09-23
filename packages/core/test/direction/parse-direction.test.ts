import { describe, expect, it } from "vitest";

import { parseDirection } from "../../src/direction/index.ts";
import type { Direction, Step } from "../../src/model/index.ts";
import { summarize } from "../support/documents.ts";

const parse = (text: string) => parseDirection({ text, firstLine: 2 }, "s");
const problems = (text: string): readonly string[] => parse(text).diagnostics.map(summarize);
const direction = (text: string): Direction => {
  const { value } = parse(text);
  if (value === undefined) throw new Error("expected a direction");
  return value;
};
const steps = (text: string): readonly Step[] => direction(text).steps ?? [];
const shape = (step: Step | undefined): unknown => {
  if (step === undefined) return undefined;
  const element = step.kind === "change" ? undefined : step.element;
  return {
    kind: step.kind,
    verb: step.kind === "change" ? undefined : step.verb?.name,
    element: typeof element === "object" ? element.id : element,
    at: step.at.kind,
    children: step.kind === "change" ? [] : step.children.map(shape),
  };
};

describe("parseDirection", () => {
  it("parses keep, verbs, changes and nested steps", () => {
    const parsed = direction(
      "keep: [$a, $b]\ndo:\n  - photo: blood\n  - at: blood\n    sheet:\n      - text: hi\n        id: t\n  - at: with\n    $t: { text: yo }",
    );

    expect(parsed.keep).toEqual([
      { id: "a", position: { line: 2, column: 8 } },
      { id: "b", position: { line: 2, column: 12 } },
    ]);
    expect(parsed.steps?.map(shape)).toEqual([
      { kind: "verb", verb: "photo", element: "blood", at: "none", children: [] },
      {
        kind: "verb",
        verb: "sheet",
        element: "sheet",
        at: "cue",
        children: [{ kind: "verb", verb: "text", element: "t", at: "none", children: [] }],
      },
      { kind: "change", verb: undefined, element: undefined, at: "with", children: [] },
    ]);
    expect(parsed.steps?.[2]).toMatchObject({
      target: "t",
      value: { text: "yo" },
      position: { line: 10, column: 5 },
    });
  });

  it("keeps modifiers out of props", () => {
    expect(steps("do:\n  - at: x\n    id: t\n    dur: fast\n    text: hi")[0]).toMatchObject({
      props: { text: "hi" },
    });
  });

  it.each([
    [
      "do:\n  - photo blood",
      'E105 3:5 s.do[0] is "photo blood"; fix: write VERB: VALUE',
      { kind: "unparsed", verb: undefined, element: "unknown", at: "invalid", children: [] },
    ],
    [
      "do:\n  - phto: blood",
      "E112 3:5 s.do[0] unknown verb phto; fix: use photo",
      { kind: "unparsed", verb: "photo", element: "blood", at: "none", children: [] },
    ],
    [
      "do:\n  - label: x\n    id: t",
      "E112 3:5 s.do[0] step has no verb; fix: add one verb from lucent catalog",
      { kind: "unparsed", verb: undefined, element: "t", at: "none", children: [] },
    ],
    [
      "do:\n  - label: x",
      "E112 3:5 s.do[0] step has no verb; fix: add one verb from lucent catalog",
      { kind: "unparsed", verb: undefined, element: "unknown", at: "none", children: [] },
    ],
    [
      "do:\n  - photo: blood\n    ring: $x",
      "E111 4:5 s.do[0] two verbs: photo, ring; fix: split it into one step per verb",
      { kind: "unparsed", verb: "photo", element: "blood", at: "none", children: [] },
    ],
    [
      "do:\n  - $a: 1\n    $b: 2",
      "E111 4:5 s.do[0] two verbs: $a, $b; fix: split it into one step per verb",
      { kind: "unparsed", verb: undefined, element: undefined, at: "none", children: [] },
    ],
    [
      "do:\n  - at: x\n    photo: blood\n    drift: medium",
      'E105 5:12 s.do[0].drift is "medium"; fix: use none|slow|fast',
      { kind: "unparsed", verb: "photo", element: "blood", at: "cue", children: [] },
    ],
    [
      "do:\n  - hide: $a\n    id: b",
      "E113 4:5 s.do[0] id is not allowed on hide; fix: remove id",
      { kind: "verb", verb: "hide", element: undefined, at: "none", children: [] },
    ],
    [
      'do:\n  - at: ""\n    text: a',
      "E105 3:9 s.do[0].at is empty; fix: write text",
      { kind: "unparsed", verb: "text", element: "text", at: "invalid", children: [] },
    ],
    [
      "do:\n  - $Bad: { text: x }",
      "E105 3:5 s.do[0] $Bad is not a valid $ID; fix: use $bad",
      { kind: "unparsed", verb: undefined, element: undefined, at: "none", children: [] },
    ],
    [
      "do:\n  - $a/p: 1",
      "E105 3:5 s.do[0] $a/p is not a valid $ID; fix: use $a-p",
      { kind: "unparsed", verb: undefined, element: undefined, at: "none", children: [] },
    ],
    [
      "do:\n  - $a: { text: x }\n    id: b",
      "E113 4:5 s.do[0] id is not allowed on a state change; fix: remove id",
      { kind: "unparsed", verb: undefined, element: undefined, at: "none", children: [] },
    ],
    [
      "do:\n  - $a: { text: x }\n    lable: b",
      "E104 4:5 s.do[0] unknown key lable; fix: remove it",
      { kind: "unparsed", verb: undefined, element: undefined, at: "none", children: [] },
    ],
  ])("keeps %j as a step", (text, expected, step) => {
    const parsed = parse(text);

    expect(parsed.diagnostics.map(summarize)).toEqual([expected]);
    expect(parsed.value?.steps?.map(shape)).toEqual([step]);
  });

  it("parses the children of a step that failed validation", () => {
    const [step] = steps("do:\n  - sheet:\n      - text: a\n        id: t\n    lable: x");

    expect(shape(step)).toEqual({
      kind: "unparsed",
      verb: "sheet",
      element: "sheet",
      at: "none",
      children: [{ kind: "verb", verb: "text", element: "t", at: "none", children: [] }],
    });
  });

  it.each([
    [
      "do:\n  - sheet:\n      - at: x\n        text: a",
      "E113 4:9 s.do[0].sheet[0] at is not allowed on a nested step; fix: remove at",
    ],
    [
      "do:\n  - sheet:\n      - $x: 1\n        id: y",
      "E113 4:9 s.do[0].sheet[0] state change inside a nested step; fix: move it to its own step",
    ],
    ["do:\n  - zoom: $a\n    into: 3", "E105 4:11 s.do[0].into is 3; fix: write VERB: VALUE"],
  ])("reports nested %j once", (text, expected) => {
    expect(problems(text)).toEqual([expected]);
  });

  it.each([
    ["", "E106 1:1 s missing key do; fix: add do:", { keep: [], steps: [] }],
    ["- photo: blood", "E105 2:1 s scene block is a list; fix: put the steps under do:", undefined],
    [
      "keep: blood\ndo:\n  - photo: a",
      'E105 2:7 s.keep is "blood"; fix: write $ID',
      { keep: undefined, steps: [expect.anything()] },
    ],
    ["do: []", "E105 2:5 s.do is an empty list; fix: add an item", { keep: [], steps: [] }],
    [
      "do: {photo: blood}",
      "E105 2:5 s.do is a mapping; fix: write a list",
      { keep: [], steps: undefined },
    ],
    [
      "layout: grid\ndo: []",
      'E105 2:9 s.layout is "grid"; fix: use stack|row|split',
      { keep: [], steps: [] },
    ],
    ["do: [ ", "E102 2:7 s unclosed [; fix: add ]", undefined],
  ])("validates the block %j field by field", (text, expected, value) => {
    const parsed = parse(text);

    expect(parsed.diagnostics.map(summarize)).toEqual(expect.arrayContaining([expected]));
    expect(
      parsed.value === undefined
        ? undefined
        : { keep: parsed.value.keep, steps: parsed.value.steps },
    ).toEqual(value);
  });
});
