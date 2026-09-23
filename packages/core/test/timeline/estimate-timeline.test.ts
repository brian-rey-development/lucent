import { describe, expect, it } from "vitest";

import { estimateTimeline } from "../../src/timeline/index.ts";
import { documentOf, sceneOf, videoOf } from "../support/documents.ts";

describe("estimateTimeline", () => {
  it("estimates cue times, scene starts and durations from word counts", async () => {
    const first = sceneOf(
      undefined,
      "One two three [four|f] five.\n> es: x\n\n(pause 1s)\n\nSix [seven].\n> es: y",
      "a",
    );
    const video = await videoOf(
      documentOf(`${first}\n\n${sceneOf(undefined, "Eight.\n> es: z", "b")}`),
    );

    expect(estimateTimeline(video.scenes)).toEqual({
      duration: 6.3,
      scenes: [
        {
          id: "a",
          start: 0,
          duration: 5.2,
          cues: [
            { phrase: "four", id: "f", time: 1.2 },
            { phrase: "seven", id: undefined, time: 4.1 },
          ],
        },
        { id: "b", start: 5.2, duration: 1.1, cues: [] },
      ],
    });
  });

  it("does not accumulate rounding", async () => {
    const scenes = Array.from({ length: 20 }, (_, index) =>
      sceneOf(undefined, "Word.\n> es: x", `s${index}`),
    );
    const video = await videoOf(documentOf(scenes.join("\n\n")));

    expect(estimateTimeline(video.scenes).duration).toBe(21.7);
  });
});
