import { describe, expect, it } from "vitest";

import { runCheck } from "../../../src/commands/check/index.ts";
import { MANIFEST, VIDEO } from "../../support/documents.ts";
import { fakeIo } from "../../support/fake-io.ts";

const FILES = {
  "/work/sub/video.lucent.md": VIDEO,
  "/work/sub/assets/images.yaml": MANIFEST,
  "/work/sub/assets/blood.jpg": "",
};
const args = { file: "sub/video.lucent.md", json: false, scene: undefined };

describe("runCheck", () => {
  it("prints the summary and the timeline", async () => {
    const io = fakeIo(FILES);

    expect(await runCheck(args, io)).toBe(0);
    expect(io.out[0]?.split("\n")).toEqual([
      "sub/video.lucent.md: 0 errors, 0 warnings, ~0:03 estimated",
      'blood  ~0:00  1.9s  "blood" +0.8s',
      'cells  ~0:01  1.9s  "cells" +0.8s',
    ]);
  });

  it("prints manifest diagnostics with a path relative to the working directory", async () => {
    const io = fakeIo({ ...FILES, "/work/sub/assets/images.yaml": "Blood:\n  file: b.jpg" });

    expect(await runCheck(args, io)).toBe(1);
    expect(io.out[0]?.split("\n")[0]).toBe(
      "E105 sub/assets/images.yaml:1:1 manifest key Blood is invalid; fix: rename it to blood",
    );
  });

  it("finds asset files relative to the manifest", async () => {
    const { "/work/sub/assets/blood.jpg": _image, ...files } = FILES;
    const io = fakeIo(files);

    expect(await runCheck(args, io)).toBe(1);
    expect(io.out[0]?.split("\n")[0]).toBe(
      "E142 sub/assets/images.yaml:2:9 manifest.blood.file cannot find blood.jpg: no such file; fix: check the path; it is relative to the manifest",
    );
  });

  it("selects one scene with its own duration", async () => {
    const io = fakeIo(FILES);

    expect(await runCheck({ ...args, scene: "cells" }, io)).toBe(0);
    expect(io.out[0]?.split("\n")).toEqual([
      "sub/video.lucent.md: 0 errors, 0 warnings, ~0:01 estimated",
      'cells  ~0:01  1.9s  "cells" +0.8s',
    ]);
  });

  it("rejects an unknown scene or a file without scenes", async () => {
    await expect(runCheck({ ...args, scene: "nope" }, fakeIo(FILES))).rejects.toThrow(
      "no scene nope; scenes: blood, cells",
    );
    const empty = fakeIo({ "/work/sub/video.lucent.md": "---\nlucent: 0\n---" });
    await expect(runCheck({ ...args, scene: "a" }, empty)).rejects.toThrow(
      "the file has no scenes",
    );
  });

  it("prints the report as JSON with the file and counts", async () => {
    const io = fakeIo(FILES);
    await runCheck({ ...args, json: true }, io);

    expect(JSON.parse(io.out[0] ?? "")).toMatchObject({
      file: "sub/video.lucent.md",
      ok: true,
      errors: 0,
      warnings: 0,
      diagnostics: [],
      omitted: 0,
    });
  });

  it("caps the output and escapes control characters", async () => {
    const noisy = VIDEO.replace(
      "This is [blood].",
      `This is [blood]. ${"& ".repeat(60)}\u001b[31m`,
    );
    const io = fakeIo({ ...FILES, "/work/sub/video.lucent.md": noisy });
    await runCheck(args, io);
    const lines = io.out[0]?.split("\n") ?? [];

    expect(lines).toHaveLength(54);
    expect(lines[50]).toBe("+12 more; fix these and check again");
    expect(io.out[0]).not.toContain("\u001b");
  });

  it("caps the timeline", async () => {
    const scenes = Array.from(
      { length: 52 },
      (_, index) =>
        `## s${index}\n\nWord [a] ${"[b] ".repeat(11)}.\n\n\`\`\`scene\ndo:\n  - at: a\n    text: x\n\`\`\``,
    );
    const source = `---\nlucent: 0\ntitle: T\nvoice: a/b\nsubtitles: [en]\n---\n\n${scenes.join("\n\n")}`;
    const io = fakeIo({ "/work/sub/video.lucent.md": source });
    await runCheck(args, io);
    const lines = io.out[0]?.split("\n") ?? [];

    expect(lines.at(-1)).toBe("+2 more scenes; use --scene or --json");
    expect(lines.find((line) => line.startsWith("s0 "))).toMatch(/; \+2 more$/);
  });
});
