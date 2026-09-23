import { analyzeCues } from "../cues/index.ts";
import type { Diagnostic } from "../diagnostics/index.ts";
import type { Video } from "../model/index.ts";
import { analyzeReferences } from "../references/index.ts";
import { analyzeSpeech } from "../speech/index.ts";
import { analyzeSubtitles } from "../subtitles/index.ts";

const ANALYSES = [analyzeReferences, analyzeCues, analyzeSpeech, analyzeSubtitles] as const;

export function analyzeVideo(video: Video): readonly Diagnostic[] {
  return ANALYSES.flatMap((analyze) => analyze(video));
}
