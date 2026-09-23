import type { Target } from "../catalog/index.ts";
import type { Problem } from "../diagnostics/index.ts";
import { closestMatch } from "../text/index.ts";
import { pointProblem } from "./point-problem.ts";
import { ambiguous, gone, noPoints, notOnScreen } from "./problems.ts";
import type { Screen, Walk } from "./types.ts";

export function targetProblem({ video, screen }: Walk, { id, point }: Target): Problem | undefined {
  if (screen.ambiguous.has(id)) return ambiguous(id);
  const element = screen.elements.get(id);
  if (element === undefined) return missingProblem(screen, id);
  if (point === undefined || element.verb === undefined) return undefined;
  if (element.asset === undefined) return noPoints(id);
  return pointProblem(video, element.asset, point);
}

function missingProblem(screen: Screen, id: string): Problem | undefined {
  const reason = screen.gone.get(id);
  if (reason !== undefined) return gone(id, reason);
  if (screen.partial) return undefined;
  const closest = closestMatch(id, screen.elements.keys());
  const byVerb = [...screen.elements.values()].find(({ verb }) => verb?.name === id);
  if (closest !== undefined) return notOnScreen(id, `use $${closest}`);
  return notOnScreen(id, byVerb === undefined ? "show it first or keep it" : `use $${byVerb.id}`);
}
