import { WORDS_PER_SECOND, type Paragraph, type Scene } from "../model/index.ts";
import { countWords } from "../text/index.ts";
import { PARAGRAPH_GAP, PRECISION, SCENE_TAIL } from "./constants.ts";
import type { SceneTimeline, Timeline, TimelineCue } from "./types.ts";

interface Estimate {
  readonly seconds: number;
  readonly cues: readonly TimelineCue[];
}

export function estimateTimeline(scenes: readonly Scene[]): Timeline {
  const estimated: SceneTimeline[] = [];
  let start = 0;
  for (const scene of scenes) {
    const { seconds, cues } = estimateScene(scene);
    estimated.push({ id: scene.id, start: round(start), duration: round(seconds), cues });
    start += seconds;
  }
  return { duration: round(start), scenes: estimated };
}

function estimateScene(scene: Scene): Estimate {
  let time = 0;
  const cues: TimelineCue[] = [];
  for (const [index, item] of scene.narration.entries()) {
    if (index > 0) time += PARAGRAPH_GAP;
    if (item.kind === "pause") {
      time += item.seconds;
      continue;
    }
    cues.push(...cuesOf(item, time));
    time += countWords(item.text) / WORDS_PER_SECOND;
  }
  return { seconds: time + SCENE_TAIL, cues };
}

function cuesOf(paragraph: Paragraph, start: number): readonly TimelineCue[] {
  return paragraph.cues.map(({ phrase, id, wordIndex }) => ({
    phrase,
    id,
    time: round(start + wordIndex / WORDS_PER_SECOND),
  }));
}

function round(seconds: number): number {
  return Math.round(seconds * PRECISION) / PRECISION;
}
