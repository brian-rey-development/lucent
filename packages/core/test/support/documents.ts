import { check, parseVideo, type Report } from "../../src/check/index.ts";
import type { Diagnostic } from "../../src/diagnostics/index.ts";
import type { FileAccess, Video } from "../../src/model/index.ts";

export const FRONTMATTER = [
  "---",
  "lucent: 0",
  "title: Blood",
  "voice: kokoro/am_fenrir",
  "subtitles: [en, es]",
  'colors: { dna: "#1F8FC4" }',
  "assets: images.yaml",
  "---",
].join("\n");

export const MANIFEST = [
  "blood:",
  "  file: blood.jpg",
  "  points:",
  "    wbc: [0.46, 0.41, 0.145]",
  "    rbc_1: [0.26, 0.30, 0.08]",
].join("\n");

export const NARRATION = "This is [blood].\n> es: Esto es sangre.";

export const STEPS = "do:\n  - at: blood\n    photo: blood";

export type Files = Readonly<Record<string, string>>;

export function documentOf(body: string, frontmatter = FRONTMATTER): string {
  return `${frontmatter}\n\n${body}`;
}

export function sceneOf(yaml = STEPS, narration = NARRATION, id = "blood"): string {
  return `## ${id}\n\n${narration}\n\n\`\`\`scene\n${yaml}\n\`\`\``;
}

const MISSING = { ok: false, reason: "no such file" } as const;

export const DEFAULT_FILES: Files = { "images.yaml": MANIFEST, "blood.jpg": "" };

export function filesOf(files: Files): FileAccess {
  return {
    readFile: async (path) => {
      const text = files[path];
      return text === undefined ? MISSING : { ok: true, text };
    },
    findFile: async (path) => (files[path] === undefined ? MISSING : { ok: true }),
  };
}

export async function checkSource(source: string, files: Files = DEFAULT_FILES): Promise<Report> {
  return check(source, filesOf(files));
}

export async function videoOf(source: string, files: Files = DEFAULT_FILES): Promise<Video> {
  return (await parseVideo(source, filesOf(files))).value;
}

export async function analyzed(
  analyze: (video: Video) => readonly Diagnostic[],
  source: string,
  files?: Files,
): Promise<readonly string[]> {
  return analyze(await videoOf(source, files)).map(summarize);
}

export function summarize({ code, position, where, message, fix }: Diagnostic): string {
  return `${code} ${position.line}:${position.column} ${where} ${message}; fix: ${fix}`;
}
