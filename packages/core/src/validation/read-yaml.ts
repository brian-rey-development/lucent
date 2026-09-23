import {
  createDiagnostic,
  type Diagnostic,
  type Place,
  type Result,
} from "../diagnostics/index.ts";
import type { TextBlock } from "../text/index.ts";
import { parseYaml, type ParsedYaml, type YamlError } from "../yaml/index.ts";
import { yamlProblem } from "./problems.ts";

export function readYaml(block: TextBlock, place: Place): Result<ParsedYaml | undefined> {
  const parsed = parseYaml(block);
  const diagnostics = parsed.errors.map((error) => diagnosticOf(error, place));
  return { value: parsed.kind === "parsed" ? parsed.yaml : undefined, diagnostics };
}

function diagnosticOf(error: YamlError, place: Place): Diagnostic {
  return createDiagnostic(yamlProblem(error), { ...place, position: error.position });
}
