import { createReport } from "./create-report.ts";
import type { Report } from "./types.ts";

export function selectScene({ diagnostics, timeline }: Report, id: string): Report | undefined {
  const scenes = timeline.scenes.filter((scene) => scene.id === id);
  if (scenes.length === 0) return undefined;
  const duration = scenes.reduce((total, scene) => total + scene.duration, 0);
  const selected = diagnostics.filter(({ scene }) => scene === undefined || scene === id);
  return createReport(selected, { duration, scenes });
}
