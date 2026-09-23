import { createDiagnostic, type Diagnostic, type Place } from "../diagnostics/index.ts";
import { paragraphsOf, type Cue, type Paragraph, type SourceLine, type Video } from "../model/index.ts";
import { comparePositions, countWords, type Position } from "../text/index.ts";
import { DIGITS, MAX_WORDS, SYMBOL_FIXES } from "./constants.ts";
import { digits, tooLong, unspeakable } from "./problems.ts";

export function analyzeSpeech(video: Video): readonly Diagnostic[] {
  return video.scenes.flatMap((scene) =>
    paragraphsOf(scene).flatMap((paragraph) => analyzeParagraph(paragraph, { where: scene.id, scene: scene.id })),
  );
}

function analyzeParagraph(paragraph: Paragraph, place: Place): readonly Diagnostic[] {
  const words = countWords(paragraph.text);
  const long = words > MAX_WORDS ? [createDiagnostic(tooLong(words), { ...place, position: paragraph.position })] : [];
  const lines = paragraph.lines.flatMap((line) => [...symbols(line, place), ...numbers(line, paragraph.cues, place)]);
  return [...lines, ...long];
}

function symbols({ spoken, line }: SourceLine, place: Place): readonly Diagnostic[] {
  return spoken.split("").flatMap((character, index) => {
    const fix = SYMBOL_FIXES.get(character);
    const position = { line, column: index + 1 };
    return fix === undefined ? [] : [createDiagnostic(unspeakable(character, fix), { ...place, position })];
  });
}

function numbers({ spoken, line }: SourceLine, cues: readonly Cue[], place: Place): readonly Diagnostic[] {
  return [...spoken.matchAll(DIGITS)].flatMap((match) => {
    const position = { line, column: match.index + 1 };
    return insideCue(position, cues) ? [] : [createDiagnostic(digits(match[0]), { ...place, position })];
  });
}

function insideCue(position: Position, cues: readonly Cue[]): boolean {
  return cues.some((cue) => comparePositions(cue.position, position) < 0 && comparePositions(position, cue.end) < 0);
}
