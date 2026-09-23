import type { Position } from "../text/index.ts";
import { classifyLine } from "./classify-line.ts";
import { FENCE_CHARACTERS, MIN_FENCE_LENGTH, WHITESPACE } from "./constants.ts";
import { maskComments } from "./mask-comments.ts";
import type { FenceToken, Masked, Token } from "./types.ts";

interface OpenFence {
  readonly marker: string;
  readonly language: string;
  readonly line: number;
  readonly column: number;
  readonly body: string[];
}

interface Scan {
  readonly tokens: Token[];
  comment: Position | undefined;
  fence: OpenFence | undefined;
}

export function tokenize(lines: readonly string[], firstLine: number): readonly Token[] {
  const scan: Scan = { tokens: [], comment: undefined, fence: undefined };
  for (const [index, text] of lines.entries()) scanLine(scan, text, firstLine + index);
  if (scan.fence !== undefined) scan.tokens.push(fenceToken(scan.fence, false));
  if (scan.comment !== undefined) scan.tokens.push({ kind: "unclosed-comment", ...scan.comment });
  return scan.tokens;
}

function scanLine(scan: Scan, text: string, line: number): void {
  if (scan.fence !== undefined) {
    readFenceLine(scan, scan.fence, text);
    return;
  }
  const masked = maskComments(text, scan.comment !== undefined);
  trackComment(scan, masked, line);
  if (masked.text.trim() === "" && text.trim() !== "") return;
  const fence = openFence(masked.text, line);
  if (fence === undefined) scan.tokens.push(classifyLine(masked.text, line));
  else scan.fence = fence;
}

function trackComment(scan: Scan, { open, opened }: Masked, line: number): void {
  if (!open) scan.comment = undefined;
  else if (opened !== undefined) scan.comment = { line, column: opened + 1 };
}

function openFence(text: string, line: number): OpenFence | undefined {
  const trimmed = text.trimStart();
  const character = trimmed.charAt(0);
  if (!FENCE_CHARACTERS.has(character)) return undefined;
  let length = 0;
  while (trimmed.charAt(length) === character) length++;
  if (length < MIN_FENCE_LENGTH) return undefined;
  const [language = ""] = trimmed.slice(length).trim().split(WHITESPACE);
  return { marker: trimmed.slice(0, length), language, line, column: text.length - trimmed.length + 1, body: [] };
}

function readFenceLine(scan: Scan, fence: OpenFence, text: string): void {
  const trimmed = text.trim();
  const closes = trimmed.length >= fence.marker.length && trimmed === fence.marker.charAt(0).repeat(trimmed.length);
  if (!closes) {
    fence.body.push(text);
    return;
  }
  scan.tokens.push(fenceToken(fence, true));
  scan.fence = undefined;
}

function fenceToken({ marker, language, line, column, body }: OpenFence, closed: boolean): FenceToken {
  return {
    kind: "fence",
    marker,
    language,
    line,
    column,
    closed,
    block: { text: body.join("\n"), firstLine: line + 1 },
  };
}
