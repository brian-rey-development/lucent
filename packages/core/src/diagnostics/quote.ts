import { MAX_QUOTED_LENGTH } from "./constants.ts";
import { truncate } from "./truncate.ts";

export function quote(text: string): string {
  return JSON.stringify(truncate(text, MAX_QUOTED_LENGTH));
}
