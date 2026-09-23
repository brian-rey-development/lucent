import { z } from "zod";
import { describe, expect, it } from "vitest";

import { summarize } from "../support/documents.ts";
import { validateValue } from "../../src/validation/index.ts";
import { parseYaml } from "../../src/yaml/index.ts";

const schema = z.strictObject({
  title: z.string().min(1),
  mute: z.boolean().optional(),
  count: z.number().max(3).optional(),
  size: z.enum(["s", "m", "l", "xl"]).optional(),
  version: z.literal(0).optional(),
  voice: z
    .string()
    .regex(/^\w+\/\w+$/, { error: "ENGINE/VOICE" })
    .optional(),
  items: z.array(z.string()).min(1).optional(),
  name: z.string().max(3).optional(),
  tags: z.array(z.string()).max(1).optional(),
  colors: z
    .record(z.string().regex(/^[a-z]+$/, { error: "lowercase letters" }), z.string())
    .optional(),
  point: z.tuple([z.number(), z.number()]).optional(),
  either: z.union([z.string(), z.number()]).optional(),
  bar: z.strictObject({ share: z.number(), label: z.string() }).optional(),
  events: z.array(z.strictObject({ at: z.string(), text: z.string() })).optional(),
  assets: z.record(z.string(), z.strictObject({ file: z.string() }).optional()).optional(),
});

function check(text: string): readonly string[] {
  const parsed = parseYaml({ text, firstLine: 1 });
  if (parsed.kind !== "parsed") throw new Error("expected parsed YAML");
  const { locate, value } = parsed.yaml;
  return validateValue(schema, value, {
    locate,
    path: [],
    place: { where: "front" },
  }).diagnostics.map(summarize);
}

describe("validateValue", () => {
  it("returns the parsed value when valid", () => {
    const parsed = parseYaml({ text: "title: T", firstLine: 1 });
    if (parsed.kind !== "parsed") throw new Error("expected parsed YAML");
    const { locate, value } = parsed.yaml;

    expect(validateValue(schema, value, { locate, path: [], place: { where: "front" } })).toEqual({
      value: { title: "T" },
      diagnostics: [],
    });
  });

  it.each([
    ["title: T\nzzz: x", "E104 2:1 front unknown key zzz; fix: remove it"],
    ["title: T\ntitel: x", "E104 2:1 front unknown key titel; fix: use title"],
    ["title: T\nsiez: m", "E104 2:1 front unknown key siez; fix: use size"],
    ["mute: true", "E106 1:1 front missing key title; fix: add title:"],
    ['title: ""', "E105 1:8 front.title is empty; fix: write text"],
    ["title: T\nmute: yes", 'E105 2:7 front.mute is "yes"; fix: write true or false'],
    ['title: T\ncount: "2"', 'E105 2:8 front.count is "2"; fix: remove the quotes'],
    ["title: T\ncount: 9", "E105 2:8 front.count is 9; fix: use at most 3"],
    ["title: T\nsize: huge", 'E105 2:7 front.size is "huge"; fix: use s|m|l|xl'],
    ["title: T\nsize: xxl", 'E105 2:7 front.size is "xxl"; fix: use xl'],
    ["title: T\nversion: 1", "E105 2:10 front.version is 1; fix: use 0"],
    ["title: T\nvoice: kokoro", 'E105 2:8 front.voice is "kokoro"; fix: write ENGINE/VOICE'],
    ["title: T\nitems: []", "E105 2:8 front.items is an empty list; fix: add an item"],
    ["title: T\nitems: {a: 1}", "E105 2:8 front.items is a mapping; fix: write a list"],
    ["title: T\nname: long", 'E105 2:7 front.name is "long"; fix: use at most 3 characters'],
    ["title: T\ntags: [a, b]", "E105 2:7 front.tags is a list; fix: use at most 1 items"],
    [
      "title: T\ncolors: { Bad: x }",
      "E105 2:11 front.colors key Bad is invalid; fix: rename it to bad",
    ],
    [
      "title: T\ncolors: { 123: x }",
      "E105 2:11 front.colors key 123 is invalid; fix: rename it to lowercase letters",
    ],
    ["title: T\npoint: [1]", "E105 2:8 front.point is a list; fix: use at least 2 items"],
    ["title: T\neither: [1]", "E105 2:9 front.either is a list; fix: fix the value"],
    ["- a", "E105 1:1 front is a list; fix: write a mapping"],
    [
      "title: T\nbar: { share: 1, label: x, lable: y }",
      "E104 2:28 front.bar unknown key lable; fix: use label",
    ],
    [
      "title: T\nevents:\n  - at: x\n    txt: y",
      "E104 4:5 front.events[0] unknown key txt; fix: use text",
    ],
    [
      "title: T\nassets:\n  blood:\n    fil: b.jpg",
      "E104 4:5 front.assets.blood unknown key fil; fix: use file",
    ],
  ])("describes %j", (text, expected) => {
    expect(check(text)).toEqual([expected]);
  });
});
