import type { FileAccess } from "../model/index.ts";
import { estimateTimeline } from "../timeline/index.ts";
import { analyzeVideo } from "./analyze-video.ts";
import { createReport } from "./create-report.ts";
import { dropCutValues } from "./drop-cut-values.ts";
import { parseVideo } from "./parse-video.ts";
import type { Report } from "./types.ts";

export async function check(source: string, files: FileAccess): Promise<Report> {
  const { value: video, diagnostics } = await parseVideo(source, files);
  const all = dropCutValues([...diagnostics, ...analyzeVideo(video)]);
  return createReport(all, estimateTimeline(video.scenes));
}
