import { FENCE } from "./constants.ts";
import type { FrontmatterSplit } from "./types.ts";

export function splitFrontmatter(lines: readonly string[]): FrontmatterSplit {
  const opening = lines.findIndex((line) => line.trim() !== "");
  const start = opening === -1 ? lines.length : opening;
  if (!isFence(lines[start])) return { kind: "missing", line: start + 1, bodyStart: 0 };
  const closing = lines.findIndex((line, index) => index > start && isFence(line));
  if (closing === -1) return { kind: "unclosed", line: start + 1, bodyStart: lines.length };
  const block = { text: lines.slice(start + 1, closing).join("\n"), firstLine: start + 2 };
  return { kind: "found", block, bodyStart: closing + 1 };
}

function isFence(line: string | undefined): boolean {
  return line?.trimEnd() === FENCE;
}
