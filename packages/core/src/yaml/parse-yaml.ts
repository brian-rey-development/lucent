import { LineCounter, parseDocument, type Document } from "yaml";

import type { Position, TextBlock } from "../text/index.ts";
import { createLocator } from "./create-locator.ts";
import { findDuplicateKeys } from "./find-duplicate-keys.ts";
import { findLexicalErrors } from "./find-lexical-errors.ts";
import type { FoundError, YamlError, YamlParse } from "./types.ts";

const OPTIONS = { prettyErrors: false, uniqueKeys: false, logLevel: "silent" } as const;

export function parseYaml({ text, firstLine }: TextBlock): YamlParse {
  const lineCounter = new LineCounter();
  const document = parseDocument(text, { ...OPTIONS, lineCounter });
  const toPosition = (offset: number): Position => {
    const { line, col } = lineCounter.linePos(offset);
    return { line: line + firstLine - 1, column: col };
  };
  const lexical = findLexicalErrors(text);
  const fatal = fatalErrors(document, lexical);
  const located = (errors: readonly FoundError[]): readonly YamlError[] =>
    errors.map((error) => locate(error, toPosition));
  if (fatal.length > 0) return { kind: "invalid", errors: located(fatal) };
  const value: unknown = document.toJS();
  const yaml = { value, locate: createLocator(document, toPosition) };
  return { kind: "parsed", yaml, errors: located(lexical) };
}

// Comments only cut values, so the document stays usable. Any other lexical error, or a comment
// that breaks the syntax, makes it untrustworthy.
function fatalErrors(
  document: Document.Parsed,
  lexical: readonly FoundError[],
): readonly FoundError[] {
  const [syntax] = document.errors;
  const onlyComments = lexical.every(({ kind }) => kind === "comment");
  if (!onlyComments || (lexical.length > 0 && syntax !== undefined)) return lexical;
  // Errors after the first are almost always cascades of it and would only cost tokens.
  if (syntax !== undefined)
    return [{ kind: "syntax", offset: syntax.pos[0], code: syntax.code, message: syntax.message }];
  const duplicates = findDuplicateKeys(document);
  return duplicates.length > 0 ? [...lexical, ...duplicates] : [];
}

function locate(
  { offset, ...error }: FoundError,
  toPosition: (offset: number) => Position,
): YamlError {
  return { ...error, position: toPosition(offset) };
}
