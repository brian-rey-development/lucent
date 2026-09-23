import { MAX_LISTED } from "./constants.ts";

export function oneOf(options: readonly string[]): string {
  const listed = options.length > MAX_LISTED ? [...options.slice(0, MAX_LISTED), "..."] : options;
  return listed.join("|");
}
