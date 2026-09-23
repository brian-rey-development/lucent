import type { TokenErrorKind } from "./types.ts";

export const ZERO_WIDTH_TOKENS: ReadonlySet<string> = new Set(["\u0002", "\u0018", "\u001f"]);
export const SCALAR_START = "\u001f";
export const COMMENT_START = "#";
export const NEWLINE = /^\r?\n$/;
export const WHITESPACE = /^[ \t]*$/;

export const INDICATORS: Readonly<Record<string, TokenErrorKind>> = {
  "*": "alias",
  "&": "anchor",
  "!": "tag",
  "%": "directive",
};
