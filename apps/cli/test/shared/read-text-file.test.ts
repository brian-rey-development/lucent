import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { readTextFile } from "../../src/shared/index.ts";

let root = "";
const at = (...parts: readonly string[]): string => join(root, ...parts);

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "lucent-"));
  await mkdir(at("video"));
  await writeFile(at("video", "ok.md"), "café");
  await writeFile(at("video", "latin1.md"), Buffer.from([0x63, 0x61, 0x66, 0xe9]));
  await writeFile(at("video", "binary.md"), Buffer.from([0x61, 0x00, 0x62]));
  await writeFile(at("video", "big.md"), "x".repeat(1024 * 1024 + 1));
  await writeFile(at("secret.yaml"), "KEY: 1");
  await symlink(at("secret.yaml"), at("video", "link.yaml"));
  execFileSync("mkfifo", [at("video", "fifo")]);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("readTextFile", () => {
  it("reads UTF-8 text", async () => {
    expect(await readTextFile(at("video", "ok.md"))).toEqual({ ok: true, text: "café" });
    expect(await readTextFile(at("video", "ok.md"), at("video"))).toEqual({ ok: true, text: "café" });
  });

  it.each([
    [["video", "missing.md"], "no such file"],
    [["video"], "is a directory"],
    [["video", "fifo"], "is not a regular file"],
    [["video", "big.md"], "is larger than 1 MB"],
    [["video", "binary.md"], "is a binary file"],
    [["video", "latin1.md"], "is not valid UTF-8"],
  ])("refuses %j: %s", async (parts, reason) => {
    expect(await readTextFile(at(...parts))).toEqual({ ok: false, reason });
  });

  it("refuses files outside the video folder, through .. or a symbolic link", async () => {
    const outside = { ok: false, reason: "is outside the video folder" };

    expect(await readTextFile(at("video", "..", "secret.yaml"), at("video"))).toEqual(outside);
    expect(await readTextFile(at("video", "link.yaml"), at("video"))).toEqual(outside);
    expect(await readTextFile(at("video"), at("video"))).toEqual(outside);
  });
});
