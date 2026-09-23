import { createDiagnostic, type Result } from "../diagnostics/index.ts";
import { buildScenes } from "./build-scenes.ts";
import { DOCUMENT } from "./constants.ts";
import { NO_SCENES } from "./problems.ts";
import { tokenize } from "./tokenize.ts";
import type { SceneSource } from "./types.ts";

export function parseScenes(
  lines: readonly string[],
  firstLine: number,
): Result<readonly SceneSource[]> {
  const built = buildScenes(tokenize(lines, firstLine));
  if (built.value.length > 0 || built.diagnostics.length > 0) return built;
  return {
    value: [],
    diagnostics: [
      createDiagnostic(NO_SCENES, { where: DOCUMENT, position: { line: firstLine, column: 1 } }),
    ],
  };
}
