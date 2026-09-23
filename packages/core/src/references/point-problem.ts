import type { Problem } from "../diagnostics/index.ts";
import type { Video } from "../model/index.ts";
import { closestMatch } from "../text/index.ts";
import { unknownPoint } from "./problems.ts";

export function pointProblem(video: Video, asset: string, point: string): Problem | undefined {
  if (video.assets.status !== "loaded") return undefined;
  const points = video.assets.manifest.get(asset)?.points;
  if (points === undefined || points.has(point)) return undefined;
  const known = [...points.keys()];
  return unknownPoint(point, asset, known, closestMatch(point, known));
}
