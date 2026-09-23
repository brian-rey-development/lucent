import { quote, type SceneTimeline, type Timeline } from "@lucent/core";

import { MAX_CUES } from "./constants.ts";
import { formatClock } from "./format-clock.ts";

export function formatTimeline({ scenes }: Timeline, limit: number): readonly string[] {
  const shown = scenes.slice(0, limit);
  const width = Math.max(0, ...shown.map(({ id }) => id.length));
  const more =
    scenes.length > limit ? [`+${scenes.length - limit} more scenes; use --scene or --json`] : [];
  return [...shown.map((scene) => formatScene(scene, width)), ...more];
}

function formatScene({ id, start, duration, cues }: SceneTimeline, width: number): string {
  const head = `${id.padEnd(width)}  ~${formatClock(start)}  ${duration.toFixed(1)}s`;
  const marks = cues
    .slice(0, MAX_CUES)
    .map(({ phrase, time }) => `${quote(phrase)} +${time.toFixed(1)}s`);
  const more = cues.length > MAX_CUES ? [`+${cues.length - MAX_CUES} more`] : [];
  return marks.length === 0 ? head : `${head}  ${[...marks, ...more].join("; ")}`;
}
