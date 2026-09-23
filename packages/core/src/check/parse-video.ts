import { loadAssets } from "../assets/index.ts";
import type { Result } from "../diagnostics/index.ts";
import { parseDirection } from "../direction/index.ts";
import { parseFrontmatter, splitFrontmatter } from "../frontmatter/index.ts";
import type { ReadFile, Scene, Video } from "../model/index.ts";
import { parseScenes, type SceneSource } from "../scenes/index.ts";
import { splitLines } from "../text/index.ts";

export async function parseVideo(source: string, readFile: ReadFile): Promise<Result<Video>> {
  const lines = splitLines(source);
  const split = splitFrontmatter(lines);
  const settings = parseFrontmatter(split);
  const body =
    split.kind === "unclosed"
      ? { value: [], diagnostics: [] }
      : parseScenes(lines.slice(split.bodyStart), split.bodyStart + 1);
  const assets = await loadAssets(settings.value.assets, readFile);
  const scenes = body.value.map(parseScene);
  return {
    value: { settings: settings.value, scenes: scenes.map(({ value }) => value), assets: assets.value },
    diagnostics: [
      ...settings.diagnostics,
      ...body.diagnostics,
      ...assets.diagnostics,
      ...scenes.flatMap(({ diagnostics }) => diagnostics),
    ],
  };
}

function parseScene({ id, position, narration, block }: SceneSource): Result<Scene> {
  const direction = block === undefined ? { value: undefined, diagnostics: [] } : parseDirection(block, id);
  return { value: { id, position, narration, direction: direction.value }, diagnostics: direction.diagnostics };
}
