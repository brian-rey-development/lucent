import { CURLY_APOSTROPHES, NON_WORD } from "./constants.ts";

export function normalizePhrase(phrase: string): string {
  return phrase
    .normalize("NFKC")
    .toLowerCase()
    .replace(CURLY_APOSTROPHES, "'")
    .replace(NON_WORD, " ")
    .trim();
}
