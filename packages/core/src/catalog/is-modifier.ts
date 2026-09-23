import { MODIFIER_SCHEMAS } from "./schema.ts";

export function isModifier(key: string): boolean {
  return Object.hasOwn(MODIFIER_SCHEMAS, key);
}
