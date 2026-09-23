import type { Settings } from "../model/index.ts";
import { isRecord } from "../validation/index.ts";
import type { Locator } from "../yaml/index.ts";
import { frontmatterSchema, subtitlesSchema } from "./schema.ts";

export function settingsOf(values: Readonly<Record<string, unknown>>, locate: Locator): Settings {
  const subtitles = subtitlesSchema.safeParse(values["subtitles"]);
  return {
    subtitles: subtitles.success ? subtitles.data : undefined,
    colors: colorsOf(values["colors"]),
    assets: assetsOf(values["assets"], locate),
  };
}

function colorsOf(colors: unknown): ReadonlySet<string> | undefined {
  if (colors === undefined) return new Set();
  return isRecord(colors) ? new Set(Object.keys(colors)) : undefined;
}

function assetsOf(assets: unknown, locate: Locator): Settings["assets"] {
  if (assets === undefined) return { kind: "none" };
  const path = frontmatterSchema.shape.assets.safeParse(assets);
  if (!path.success || path.data === undefined) return { kind: "invalid" };
  return { kind: "file", path: path.data, position: locate.value(["assets"]) };
}
