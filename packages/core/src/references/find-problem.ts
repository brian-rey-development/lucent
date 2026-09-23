import type { Reference } from "../catalog/index.ts";
import type { Problem } from "../diagnostics/index.ts";
import type { Video } from "../model/index.ts";
import { closestMatch } from "../text/index.ts";
import { pointProblem } from "./point-problem.ts";
import { NO_MANIFEST, unknownAsset, unknownColor } from "./problems.ts";
import { targetProblem } from "./target-problem.ts";
import type { Walk } from "./types.ts";

export function findProblem(walk: Walk, reference: Reference, ownAsset: string | undefined): Problem | undefined {
  if (reference.kind === "target" || reference.kind === "hide") return targetProblem(walk, reference.target);
  if (reference.kind === "asset") return assetProblem(walk.video, reference.name);
  if (reference.kind === "color") return colorProblem(walk.video, reference.name);
  return ownAsset === undefined ? undefined : pointProblem(walk.video, ownAsset, reference.name);
}

function assetProblem({ assets }: Video, name: string): Problem | undefined {
  if (assets.status === "none") return NO_MANIFEST;
  if (assets.status === "unavailable" || !assets.complete || assets.manifest.has(name)) return undefined;
  return unknownAsset(name, closestMatch(name, assets.manifest.keys()));
}

function colorProblem({ settings }: Video, name: string): Problem | undefined {
  const { colors } = settings;
  if (colors === undefined || colors.has(name)) return undefined;
  return unknownColor(name, closestMatch(name, colors));
}
