import { estimateTimeline } from "../timeline/index.ts";
import { analyzeVideo } from "./analyze-video.ts";
import { createReport } from "./create-report.ts";
import { parseVideo } from "./parse-video.ts";
import type { CheckOptions, Report } from "./types.ts";

export async function check(source: string, { readFile }: CheckOptions): Promise<Report> {
  const { value: video, diagnostics } = await parseVideo(source, readFile);
  return createReport([...diagnostics, ...analyzeVideo(video)], estimateTimeline(video.scenes));
}
