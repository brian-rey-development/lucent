import { LineCounter, parseDocument, type Document } from "yaml";

import type { Position, TextBlock } from "../text/index.ts";
import { createLocator } from "./create-locator.ts";
import { findDuplicateKeys } from "./find-duplicate-keys.ts";
import { findLexicalErrors } from "./find-lexical-errors.ts";
import type { FoundError, YamlError, YamlParse } from "./types.ts";

export function parseYaml({ text, firstLine }: TextBlock): YamlParse {
  const lineCounter = new LineCounter();
  const document = parseDocument(text, { lineCounter, prettyErrors: false, uniqueKeys: false, logLevel: "silent" });
  const toPosition = (offset: number): Position => {
    const { line, col } = lineCounter.linePos(offset);
    return { line: line + firstLine - 1, column: col };
  };
  const errors = errorsOf(text, document);
  if (errors.length > 0) return { kind: "invalid", errors: errors.map((error) => locate(error, toPosition)) };
  return { kind: "parsed", yaml: { value: document.toJS(), locate: createLocator(document, toPosition) } };
}

function errorsOf(text: string, document: Document.Parsed): readonly FoundError[] {
  const lexical = findLexicalErrors(text);
  if (lexical.length > 0) return lexical;
  // Errors after the first are almost always cascades of it and would only cost tokens.
  const [syntax] = document.errors;
  if (syntax === undefined) return findDuplicateKeys(document);
  return [{ kind: "syntax", offset: syntax.pos[0], code: syntax.code, message: syntax.message }];
}

function locate({ offset, ...error }: FoundError, toPosition: (offset: number) => Position): YamlError {
  return { ...error, position: toPosition(offset) };
}
