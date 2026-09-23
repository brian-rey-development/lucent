import { LINE_BREAK } from "./constants.ts";
import { stripByteOrderMark } from "./strip-byte-order-mark.ts";

export function splitLines(source: string): readonly string[] {
  return stripByteOrderMark(source).split(LINE_BREAK);
}
