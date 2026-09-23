import { loadAssets } from "../assets/index.ts";
import type { Result } from "../diagnostics/index.ts";
import { parseDirection } from "../direction/index.ts";
import { parseFrontmatter, splitFrontmatter } from "../frontmatter/index.ts";
import type { FileAccess, Scene, Video } from "../model/index.ts";
import { parseScenes, type SceneSource } from "../scenes/index.ts";
import { splitLines } from "../text/index.ts";

const NO_SCENES: Result<readonly SceneSource[]> = { value: [], diagnostics: [] };

export async function parseVideo(source: string, files: FileAccess): Promise<Result<Video>> {
  const lines = splitLines(source);
  const split = splitFrontmatter(lines);
  const settings = parseFrontmatter(split);
  const body =
    split.kind === "unclosed"
      ? NO_SCENES
      : parseScenes(lines.slice(split.bodyStart), split.bodyStart + 1);
  const assets = await loadAssets(settings.value.assets, files);
  const scenes = body.value.map(parseScene);
  const results = [settings, body, assets, ...scenes];
  return {
    value: {
      settings: settings.value,
      scenes: scenes.map(({ value }) => value),
      assets: assets.value,
    },
    diagnostics: results.flatMap(({ diagnostics }) => diagnostics),
  };
}

function parseScene({ id, position, narration, block }: SceneSource): Result<Scene> {
  const direction =
    block === undefined ? { value: undefined, diagnostics: [] } : parseDirection(block, id);
  return {
    value: { id, position, narration, direction: direction.value },
    diagnostics: direction.diagnostics,
  };
}
