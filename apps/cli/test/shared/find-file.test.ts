import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { findFile } from "../../src/shared/index.ts";

let root = "";
const at = (...parts: readonly string[]): string => join(root, ...parts);

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "lucent-"));
  await mkdir(at("video", "images"), { recursive: true });
  await writeFile(at("video", "images", "blood.jpg"), "");
  await writeFile(at("secret.jpg"), "");
  await symlink(at("secret.jpg"), at("video", "link.jpg"));
  execFileSync("mkfifo", [at("video", "fifo")]);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("findFile", () => {
  it("finds a regular file inside the root", async () => {
    expect(await findFile(at("video", "images", "blood.jpg"), at("video"))).toEqual({ ok: true });
  });

  it.each([
    [["video", "missing.jpg"], "no such file"],
    [["video", "images"], "is a directory"],
    [["video", "fifo"], "is not a regular file"],
    [["secret.jpg"], "is outside the video folder"],
    [["video", "link.jpg"], "is outside the video folder"],
  ])("refuses %j: %s", async (parts, reason) => {
    expect(await findFile(at(...parts), at("video"))).toEqual({ ok: false, reason });
  });
});
