import type { Paragraph, Scene } from "./types.ts";

export function paragraphsOf(scene: Scene): readonly Paragraph[] {
  return scene.narration.filter((item): item is Paragraph => item.kind === "paragraph");
}
