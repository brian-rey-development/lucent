import { createDiagnostic, type Place, type Result } from "../diagnostics/index.ts";
import type { TextBlock } from "../text/index.ts";
import { parseYaml, type ParsedYaml } from "../yaml/index.ts";
import { yamlProblem } from "./problems.ts";

export function readYaml(block: TextBlock, place: Place): Result<ParsedYaml | undefined> {
  const parsed = parseYaml(block);
  if (parsed.kind === "parsed") return { value: parsed.yaml, diagnostics: [] };
  const diagnostics = parsed.errors.map((error) =>
    createDiagnostic(yamlProblem(error), { ...place, position: error.position }),
  );
  return { value: undefined, diagnostics };
}
