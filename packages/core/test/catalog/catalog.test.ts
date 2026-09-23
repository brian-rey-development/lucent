import { describe, expect, it } from "vitest";

import {
  childrenOf,
  findVerb,
  formatCatalog,
  formatVerb,
  parseTarget,
  referencesOf,
  VERB_NAMES,
  VERBS,
  verbJsonSchema,
  type VerbDefinition,
} from "../../src/catalog/index.ts";

const verb = (name: string): VerbDefinition => {
  const found = findVerb(name);
  if (found === undefined) throw new Error(`no verb ${name}`);
  return found;
};

describe("verbs", () => {
  it("never name a prop like another verb, so a step has one verb key", () => {
    const clashes = VERBS.flatMap(({ name, props }) =>
      Object.keys(props.shape).filter((key) => key !== name && VERB_NAMES.includes(key)),
    );

    expect(clashes).toEqual([]);
  });

  it("each read their own key and take modifiers by level", () => {
    for (const { name, props, schemas, element } of VERBS) {
      expect(Object.keys(props.shape)).toContain(name);
      expect(Object.hasOwn(schemas.top.shape, "id")).toBe(element !== "none");
      expect(Object.hasOwn(schemas.nested.shape, "at")).toBe(false);
    }
  });

  it("finds verbs by name only", () => {
    expect(verb("ring").name).toBe("ring");
    expect(findVerb("rings")).toBeUndefined();
  });
});

describe("formatCatalog", () => {
  it("lists every verb, one line each, after a short header", () => {
    const lines = formatCatalog().split("\n");

    expect(lines[0]).toMatch(/^Notation:/);
    expect(lines.filter((line) => line.startsWith("$ID"))).toHaveLength(1);
    expect(VERBS.every(({ signature }) => lines.some((line) => line.startsWith(signature)))).toBe(true);
  });
});

describe("formatVerb", () => {
  it("adds the props a state change accepts", () => {
    expect(formatVerb(verb("text"))).toBe(
      'text TEXT [size s|m|l|xl] [color COLOR] text; quoted "*emphasis*" uses the accent color; change {text,size,color}',
    );
    expect(formatVerb(verb("note"))).toBe("note TEXT small print, such as a source");
  });
});

describe("verbJsonSchema", () => {
  it("describes the step with its modifiers", () => {
    const schema = verbJsonSchema(verb("hide"));

    expect(schema).toMatchObject({ type: "object", required: ["hide"], additionalProperties: false });
    expect(Object.keys(schema["properties"] ?? {})).toEqual(["hide", "at", "dur"]);
  });
});

describe("parseTarget", () => {
  it.each([
    ["$blood", { id: "blood", point: undefined }],
    ["$blood/wbc", { id: "blood", point: "wbc" }],
    ["blood", undefined],
    ["$Blood", undefined],
    ["none", undefined],
  ])("parses %j", (text, expected) => {
    expect(parseTarget(text)).toEqual(expected);
  });
});

describe("referencesOf", () => {
  it("parses targets and skips literal values", () => {
    expect(referencesOf(verb("ring"), { ring: ["$blood/wbc", "$legend"], color: "dna" })).toEqual([
      { kind: "target", target: { id: "blood", point: "wbc" }, path: ["ring", 0] },
      { kind: "target", target: { id: "legend", point: undefined }, path: ["ring", 1] },
      { kind: "color", name: "dna", path: ["color"] },
    ]);
    expect(referencesOf(verb("focus"), { focus: "none" })).toEqual([]);
    expect(referencesOf(verb("photo"), { photo: "blood", center: 3 })).toEqual([
      { kind: "asset", name: "blood", path: ["photo"] },
    ]);
  });
});

describe("childrenOf", () => {
  it("returns nested steps with their paths", () => {
    expect(childrenOf(verb("sheet"), { sheet: [{ text: "a" }, 3] })).toEqual([
      { raw: { text: "a" }, path: ["sheet", 0] },
      { raw: 3, path: ["sheet", 1] },
    ]);
    expect(childrenOf(verb("zoom"), { zoom: "$a", into: { helix: {} } })).toEqual([
      { raw: { helix: {} }, path: ["into"] },
    ]);
    expect(childrenOf(verb("sheet"), { sheet: "x" })).toEqual([]);
    expect(childrenOf(verb("zoom"), { zoom: "$a" })).toEqual([]);
  });
});

describe("referencesOf edge cases", () => {
  it("skips values that are not text or not targets", () => {
    expect(referencesOf(verb("ring"), { ring: ["$a", 3], color: 5 })).toEqual([
      { kind: "target", target: { id: "a", point: undefined }, path: ["ring", 0] },
    ]);
    expect(referencesOf(verb("ring"), { ring: "$Bad" })).toEqual([]);
  });
});
