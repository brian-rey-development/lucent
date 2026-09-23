import { ID } from "./constants.ts";

export function isId(text: string): boolean {
  return ID.test(text);
}
