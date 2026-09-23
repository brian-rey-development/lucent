import type { Screen } from "./types.ts";

export function removeElements(screen: Screen, ids: Iterable<string>, reason: string): void {
  for (const id of ids) {
    screen.elements.delete(id);
    screen.ambiguous.delete(id);
    screen.gone.set(id, reason);
  }
}
