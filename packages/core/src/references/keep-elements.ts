import { createDiagnostic, type Diagnostic, type Result } from "../diagnostics/index.ts";
import type { KeptElement, Scene } from "../model/index.ts";
import { closestMatch } from "../text/index.ts";
import { createScreen } from "./create-screen.ts";
import { descendantsOf } from "./descendants-of.ts";
import { gone, keptNotOnScreen } from "./problems.ts";
import type { Screen } from "./types.ts";

export function keepElements(kept: readonly KeptElement[] | undefined, previous: Screen, scene: Scene): Result<Screen> {
  if (kept === undefined) return { value: createScreen(true), diagnostics: [] };
  const screen = createScreen(false);
  const diagnostics = kept.flatMap(({ id, position }): readonly Diagnostic[] => {
    if (!previous.elements.has(id)) {
      screen.elements.set(id, { id, verb: undefined, asset: undefined, parent: undefined });
      return previous.partial ? [] : [notKept(id, position, previous, scene)];
    }
    for (const descendant of descendantsOf(previous.elements, id)) {
      const element = previous.elements.get(descendant);
      if (element !== undefined) screen.elements.set(descendant, element);
    }
    return [];
  });
  return { value: screen, diagnostics };
}

function notKept(id: string, position: KeptElement["position"], previous: Screen, scene: Scene): Diagnostic {
  const reason = previous.gone.get(id);
  const closest = closestMatch(id, previous.elements.keys());
  const fix = closest === undefined ? "show it in the previous scene or drop it" : `keep $${closest}`;
  const problem =
    reason === undefined ? keptNotOnScreen(id, scene.id, fix) : { ...gone(id, reason), code: "E208" as const };
  return createDiagnostic(problem, { where: `${scene.id}.keep`, scene: scene.id, position });
}
