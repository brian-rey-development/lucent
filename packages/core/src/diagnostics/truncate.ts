import { ELLIPSIS } from "./constants.ts";

export function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length)}${ELLIPSIS}` : text;
}
