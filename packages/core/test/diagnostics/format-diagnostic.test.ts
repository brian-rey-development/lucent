import { describe, expect, it } from "vitest";

import { createDiagnostic, escapeControl, formatDiagnostic } from "../../src/diagnostics/index.ts";

const problem = { code: "E204", message: 'cue "x" is not marked', fix: "mark it: [x]" } as const;

describe("formatDiagnostic", () => {
  it("prints one line, with the file only when it is set", () => {
    const main = createDiagnostic(problem, {
      where: "blood.do[0].at",
      position: { line: 3, column: 9 },
    });
    const manifest = createDiagnostic(problem, {
      where: "manifest",
      file: "images.yaml",
      position: { line: 1, column: 1 },
    });

    expect(formatDiagnostic(main)).toBe(
      'E204 3:9 blood.do[0].at cue "x" is not marked; fix: mark it: [x]',
    );
    expect(formatDiagnostic(manifest)).toBe(
      'E204 images.yaml:1:1 manifest cue "x" is not marked; fix: mark it: [x]',
    );
  });

  it("escapes control characters so a line cannot be forged or colored", () => {
    const diagnostic = createDiagnostic(
      { code: "E104", message: "unknown key \u001b[31mx\nE101 fake", fix: "remove it" },
      { where: "frontmatter", position: { line: 1, column: 1 } },
    );

    expect(formatDiagnostic(diagnostic)).toBe(
      "E104 1:1 frontmatter unknown key \\u001b[31mx\\u000aE101 fake; fix: remove it",
    );
    expect(escapeControl("a\u0085b\u007f")).toBe("a\\u0085b\\u007f");
  });
});

describe("createDiagnostic", () => {
  it("sets the severity and caps the length of free text", () => {
    const diagnostic = createDiagnostic(
      { code: "W201", message: "m".repeat(200), fix: "f" },
      { where: "w".repeat(200), position: { line: 1, column: 1 } },
    );

    expect(diagnostic.severity).toBe("warning");
    expect(diagnostic.message).toHaveLength(163);
    expect(diagnostic.where).toHaveLength(163);
  });
});
