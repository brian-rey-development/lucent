import { createDiagnostic, type Result } from "../diagnostics/index.ts";
import type { Paragraph, SourceLine } from "../model/index.ts";
import type { Position } from "../text/index.ts";
import { STRAY_BRACKET, WHITESPACE } from "./constants.ts";
import { unmatchedBracket } from "./problems.ts";
import { scanCues } from "./scan-cues.ts";
import type { LineStart, Lines, LocatedProblem, ParagraphInput } from "./types.ts";

type Starts = readonly [LineStart, ...LineStart[]];

export function parseParagraph({ lines, translations, index, scene }: ParagraphInput): Result<Paragraph> {
  const starts = lineStarts(lines);
  const scan = scanCues(lines.map(({ text }) => text).join("\n"), index, createCursor(starts));
  const problems = [...scan.problems, ...strayBrackets(scan.spoken, createCursor(starts))];
  const spoken = scan.spoken.replace(STRAY_BRACKET, " ");
  const [first] = lines;
  const paragraph: Paragraph = {
    kind: "paragraph",
    index,
    text: scan.text.replace(STRAY_BRACKET, "").replace(WHITESPACE, " ").trim(),
    lines: sourceLines(starts, spoken),
    cues: scan.cues,
    translations,
    position: { line: first.line, column: first.column },
  };
  const diagnostics = problems.map(({ problem, position }) =>
    createDiagnostic(problem, { where: scene, scene, position }),
  );
  return { value: paragraph, diagnostics };
}

function sourceLines(starts: Starts, spoken: string): readonly SourceLine[] {
  return starts.map(({ text, line, offset }) => ({ text, line, spoken: spoken.slice(offset, offset + text.length) }));
}

function lineStarts([first, ...rest]: Lines): Starts {
  let offset = first.text.length + 1;
  const tail = rest.map((line) => {
    const start = { ...line, offset };
    offset += line.text.length + 1;
    return start;
  });
  return [{ ...first, offset: 0 }, ...tail];
}

function createCursor([first, ...rest]: Starts): (offset: number) => Position {
  let current = first;
  let index = 0;
  return (offset) => {
    for (let next = rest[index]; next !== undefined && next.offset <= offset; next = rest[++index]) current = next;
    return { line: current.line, column: offset - current.offset + 1 };
  };
}

function strayBrackets(spoken: string, locate: (offset: number) => Position): readonly LocatedProblem[] {
  return [...spoken.matchAll(STRAY_BRACKET)].map((match) => ({
    problem: unmatchedBracket(match[0]),
    position: locate(match.index),
  }));
}
