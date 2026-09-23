import type { Diagnostic } from "../diagnostics/index.ts";

const lineOf = ({ file, position }: Diagnostic): string => `${file ?? ""}:${position.line}`;

export function dropCutValues(diagnostics: readonly Diagnostic[]): readonly Diagnostic[] {
  const cut = new Set(diagnostics.filter(({ code }) => code === "E103").map(lineOf));
  return diagnostics.filter(
    (diagnostic) => diagnostic.code !== "E105" || !cut.has(lineOf(diagnostic)),
  );
}
