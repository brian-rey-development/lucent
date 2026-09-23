import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";

import type { FileRead } from "@lucent/core";

import { MAX_FILE_BYTES, NUL, OUTSIDE_ROOT } from "./constants.ts";
import { isInside } from "./is-inside.ts";
import { reasonOf } from "./reason-of.ts";

export async function readTextFile(path: string, root?: string): Promise<FileRead> {
  try {
    const real = await realpath(path);
    if (root !== undefined && !isInside(await realpath(root), real)) return failed(OUTSIDE_ROOT);
    return await readRegularFile(real);
  } catch (error) {
    return failed(reasonOf(error));
  }
}

async function readRegularFile(path: string): Promise<FileRead> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const stats = await handle.stat();
    if (!stats.isFile())
      return failed(stats.isDirectory() ? "is a directory" : "is not a regular file");
    if (stats.size > MAX_FILE_BYTES) return failed("is larger than 1 MB");
    return decode(await handle.readFile());
  } finally {
    await handle.close();
  }
}

function decode(bytes: Uint8Array): FileRead {
  if (bytes.includes(NUL)) return failed("is a binary file");
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return failed("is not valid UTF-8");
  }
}

function failed(reason: string): FileRead {
  return { ok: false, reason };
}
