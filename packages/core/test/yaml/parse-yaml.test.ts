import { describe, expect, it } from "vitest";

import { parseYaml } from "../../src/yaml/index.ts";

const invalid = (text: string): unknown => {
  const parsed = parseYaml({ text, firstLine: 10 });
  return parsed.kind === "invalid" ? parsed.errors : parsed;
};

describe("parseYaml", () => {
  it("returns the value and positions offset by the first line", () => {
    const parsed = parseYaml({ text: "do:\n  - photo: blood\n    center: wbc", firstLine: 10 });
    if (parsed.kind !== "parsed") throw new Error("expected parsed YAML");

    expect(parsed.yaml.value).toEqual({ do: [{ photo: "blood", center: "wbc" }] });
    expect(parsed.yaml.locate.value(["do", 0, "center"])).toEqual({ line: 12, column: 13 });
    expect(parsed.yaml.locate.key(["do", 0, "center"])).toEqual({ line: 12, column: 5 });
    expect(parsed.yaml.locate.value(["do", 0, "missing"])).toEqual({ line: 11, column: 5 });
    expect(parsed.yaml.locate.value(["do", 5])).toEqual({ line: 11, column: 3 });
    expect(parsed.yaml.locate.value(["do", "x"])).toEqual({ line: 11, column: 3 });
  });

  it.each([
    ["a: b # c", "comment", "# c", 6],
    ["dna: #1F8FC4", "comment", "#1F8FC4", 6],
    ["a: *emphasis*", "alias", "*emphasis*", 4],
    ["a: &x b", "anchor", "&x", 4],
    ["a: !custom b", "tag", "!custom", 4],
    ["%YAML 1.1\n---\na: b", "directive", "%YAML 1.1", 1],
  ])("rejects %j as %s", (text, kind, token, column) => {
    expect(invalid(text)).toEqual([{ kind, token, position: { line: 10, column } }]);
  });

  it("keeps comments on their own line", () => {
    expect(parseYaml({ text: "# note\na: b", firstLine: 1 }).kind).toBe("parsed");
  });

  it("keeps symbols inside quoted and block scalars", () => {
    expect(parseYaml({ text: 'a: "*x* & #y"\nb: |\n  *x* & y', firstLine: 1 }).kind).toBe("parsed");
  });

  it("reports duplicate keys", () => {
    expect(invalid("a: 1\na: 2")).toEqual([{ kind: "duplicate", token: "a", position: { line: 11, column: 1 } }]);
  });

  it("reports only the first syntax error", () => {
    expect(invalid("a: [1, 2\nb: [")).toEqual([
      expect.objectContaining({ kind: "syntax", code: "BAD_INDENT", position: { line: 11, column: 1 } }),
    ]);
  });
});
