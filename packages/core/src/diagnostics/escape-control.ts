import { CONTROL_CHARACTERS } from "./constants.ts";

export function escapeControl(text: string): string {
  return text.replace(
    CONTROL_CHARACTERS,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
