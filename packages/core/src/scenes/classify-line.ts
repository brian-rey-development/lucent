import { HEADING_MARK, MAX_HEADING_LEVEL, PAUSE, PAUSE_LIKE, QUOTE_MARK, TRANSLATION } from "./constants.ts";
import type { Token } from "./types.ts";

interface Heading {
  readonly level: number;
  readonly text: string;
}

export function classifyLine(text: string, line: number): Token {
  const trimmed = text.trim();
  if (trimmed === "") return { kind: "blank", line };
  const column = text.length - text.trimStart().length + 1;
  const heading = headingOf(trimmed);
  if (heading !== undefined) return { kind: "heading", ...heading, line, column };
  if (trimmed.startsWith(QUOTE_MARK)) return quoteOf(trimmed, line, column);
  const pause = PAUSE.exec(trimmed);
  if (pause !== null) return { kind: "pause", seconds: Number(pause[1]), line, column };
  if (PAUSE_LIKE.test(trimmed)) return { kind: "malformed-pause", line, column };
  return { kind: "text", text, line, column };
}

function headingOf(trimmed: string): Heading | undefined {
  let level = 0;
  while (trimmed.charAt(level) === HEADING_MARK) level++;
  const rest = trimmed.slice(level);
  if (level === 0 || level > MAX_HEADING_LEVEL || (rest !== "" && rest.trimStart() === rest)) return undefined;
  return { level, text: rest.trim() };
}

function quoteOf(trimmed: string, line: number, column: number): Token {
  const translation = TRANSLATION.exec(trimmed);
  if (translation === null) return { kind: "quote", line, column };
  return { kind: "translation", language: translation[1] ?? "", text: translation[2] ?? "", line, column };
}
