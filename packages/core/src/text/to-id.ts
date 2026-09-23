import { COMBINING_MARKS, DASH, LEADING_NON_LETTERS, NON_ID_CHARACTERS, REPEATED_DASHES } from "./constants.ts";

export function toId(text: string): string | undefined {
  const id = text
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_ID_CHARACTERS, DASH)
    .replace(REPEATED_DASHES, DASH)
    .replace(LEADING_NON_LETTERS, "");
  const trimmed = id.endsWith(DASH) ? id.slice(0, -DASH.length) : id;
  return trimmed === "" ? undefined : trimmed;
}
