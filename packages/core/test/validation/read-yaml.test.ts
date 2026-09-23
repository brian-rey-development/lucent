import { describe, expect, it } from "vitest";

import { summarize } from "../support/documents.ts";
import { readYaml } from "../../src/validation/index.ts";

const read = (text: string): readonly string[] =>
  readYaml({ text, firstLine: 1 }, { where: "front" }).diagnostics.map(summarize);

describe("readYaml", () => {
  it.each([
    ["a: b # note", "E103 1:6 front inline # comment; fix: move it to its own line"],
    ["dna: #1F8FC4", 'E103 1:6 front "#1F8FC4" starts a comment; fix: quote it'],
    ["c: { dna: #1F8FC4 }", 'E103 1:11 front "#1F8FC4" starts a comment; fix: quote it'],
    ["a: *emphasis*", 'E102 1:4 front "*emphasis*" reads as a YAML alias; fix: quote the value'],
    ["a: &x b", 'E102 1:4 front "&x" reads as a YAML anchor; fix: quote the value'],
    ["a: !x b", 'E102 1:4 front "!x" reads as a YAML tag; fix: quote the value'],
    ["%YAML 1.1\n---\na: b", 'E102 1:1 front "%YAML 1.1" directive; fix: remove the line'],
    ["a: 1\na: 2", "E102 2:1 front duplicate key a; fix: remove one"],
    ["note: Source: x", 'E102 1:7 front ": " inside a value; fix: quote the value'],
    ["a: [1, 2", "E102 1:9 front unclosed [; fix: add ]"],
    ["a: {b: 1", "E102 1:9 front unclosed {; fix: add }"],
    ["do:\n  - a: 1\n   b: 2", "E102 3:1 front list item without -; fix: add - or indent it under the item above"],
    ["a:\n\t- b", "E102 2:1 front tab used for indentation; fix: indent with spaces"],
    ['a: "\\q"', "E102 1:5 front bad escape in double quotes; fix: use single quotes"],
    ["a: b\n  c: d", 'E102 1:4 front ": " inside a value; fix: quote the value'],
    ['a: "x', "E102 1:6 front invalid YAML; fix: quote the value or fix the indentation"],
  ])("reports %j", (text, expected) => {
    expect(read(text)).toEqual([expected]);
  });

  it("returns the parsed YAML when valid", () => {
    expect(readYaml({ text: "a: b", firstLine: 1 }, { where: "front" }).value?.value).toEqual({ a: "b" });
  });
});
