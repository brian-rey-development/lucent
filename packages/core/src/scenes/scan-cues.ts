import type { Cue } from "../model/index.ts";
import { countWords, isId, type Position } from "../text/index.ts";
import { CUE, CUE_SEPARATOR, NOT_NEWLINE, WHITESPACE } from "./constants.ts";
import { EMPTY_CUE, invalidCueId, TWO_IDS } from "./problems.ts";
import type { CueScan, LocatedProblem } from "./types.ts";

interface Scan {
  spoken: string;
  text: string;
  words: number;
  last: number;
  readonly cues: Cue[];
  readonly problems: LocatedProblem[];
}

interface ParsedCue {
  readonly raw: string;
  readonly phrase: string;
  readonly id: string | undefined;
  readonly problem: LocatedProblem["problem"] | undefined;
}

export function scanCues(text: string, paragraph: number, locate: (offset: number) => Position): CueScan {
  const scan: Scan = { spoken: "", text: "", words: 0, last: 0, cues: [], problems: [] };
  for (const match of text.matchAll(CUE)) addCue(scan, match, paragraph, locate);
  const rest = text.slice(scan.last);
  return { spoken: scan.spoken + rest, text: scan.text + rest, cues: scan.cues, problems: scan.problems };
}

function addCue(scan: Scan, match: RegExpExecArray, paragraph: number, locate: (offset: number) => Position): void {
  const [source] = match;
  const before = match.input.slice(scan.last, match.index);
  const cue = parseCue(source.slice(1, -1));
  const position = locate(match.index);
  scan.words += countWords(before);
  if (cue.problem !== undefined) scan.problems.push({ problem: cue.problem, position });
  if (cue.phrase !== "") {
    const end = locate(match.index + source.length - 1);
    const malformed = cue.problem !== undefined;
    scan.cues.push({ phrase: cue.phrase, id: cue.id, paragraph, wordIndex: scan.words, position, end, malformed });
  }
  scan.spoken += `${before} ${cue.raw}${source.slice(cue.raw.length + 1).replace(NOT_NEWLINE, " ")}`;
  scan.text += `${before}${cue.raw}`;
  scan.words += countWords(cue.phrase);
  scan.last = match.index + source.length;
}

function parseCue(inner: string): ParsedCue {
  const [raw = "", ...ids] = inner.split(CUE_SEPARATOR);
  const phrase = raw.replace(WHITESPACE, " ").trim();
  if (phrase === "") return { raw, phrase, id: undefined, problem: EMPTY_CUE };
  if (ids.length > 1) return { raw, phrase, id: undefined, problem: TWO_IDS };
  const id = ids[0]?.trim();
  if (id !== undefined && !isId(id)) return { raw, phrase, id: undefined, problem: invalidCueId(id) };
  return { raw, phrase, id, problem: undefined };
}
