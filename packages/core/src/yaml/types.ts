import type { Position } from "../text/index.ts";

export type YamlPath = readonly (string | number)[];

export interface Locator {
  readonly value: (path: YamlPath) => Position;
  readonly key: (path: YamlPath) => Position;
}

export interface ParsedYaml {
  readonly value: unknown;
  readonly locate: Locator;
}

export type TokenErrorKind = "comment" | "alias" | "anchor" | "tag" | "directive" | "duplicate";

export interface TokenError {
  readonly kind: TokenErrorKind;
  readonly offset: number;
  readonly token: string;
}

export interface YamlSyntaxError {
  readonly kind: "syntax";
  readonly offset: number;
  readonly code: string;
  readonly message: string;
}

export type FoundError = TokenError | YamlSyntaxError;

export type YamlError = (Omit<TokenError, "offset"> | Omit<YamlSyntaxError, "offset">) & {
  readonly position: Position;
};

export type YamlParse =
  | { readonly kind: "parsed"; readonly yaml: ParsedYaml; readonly errors: readonly YamlError[] }
  | { readonly kind: "invalid"; readonly errors: readonly YamlError[] };
