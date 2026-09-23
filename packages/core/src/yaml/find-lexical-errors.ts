import { Lexer } from "yaml";

import { COMMENT_START, INDICATORS, NEWLINE, SCALAR_START, WHITESPACE, ZERO_WIDTH_TOKENS } from "./constants.ts";
import type { TokenError, TokenErrorKind } from "./types.ts";

export function findLexicalErrors(text: string): readonly TokenError[] {
  const errors: TokenError[] = [];
  let offset = 0;
  let lineHasContent = false;
  let previous = "";
  for (const token of new Lexer().lex(text)) {
    const kind = classify(token, previous, lineHasContent);
    if (kind !== undefined) errors.push({ kind, offset, token });
    if (NEWLINE.test(token)) lineHasContent = false;
    else if (!ZERO_WIDTH_TOKENS.has(token) && !WHITESPACE.test(token)) lineHasContent = true;
    if (!ZERO_WIDTH_TOKENS.has(token)) offset += token.length;
    previous = token;
  }
  return errors;
}

function classify(token: string, previous: string, lineHasContent: boolean): TokenErrorKind | undefined {
  if (token.startsWith(COMMENT_START)) return lineHasContent ? "comment" : undefined;
  if (previous === SCALAR_START) return undefined;
  return INDICATORS[token.charAt(0)];
}
