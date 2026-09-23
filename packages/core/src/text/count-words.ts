import { WORD } from "./constants.ts";

export function countWords(text: string): number {
  return text.match(WORD)?.length ?? 0;
}
