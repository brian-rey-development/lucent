import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { relative, isAbsolute } from "node:path";

import type { FileRead } from "@lucent/core";

import { ERRNO_REASONS, MAX_FILE_BYTES, NUL } from "./constants.ts";

export async function readTextFile(path: string, root?: string): Promise<FileRead> {
  try {
    const real = await realpath(path);
    if (root !== undefined && !isInside(await realpath(root), real)) return failed("is outside the video folder");
    return await readRegularFile(real);
  } catch (error) {
    return failed(reasonOf(error));
  }
}

async function readRegularFile(path: string): Promise<FileRead> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) return failed(stats.isDirectory() ? "is a directory" : "is not a regular file");
    if (stats.size > MAX_FILE_BYTES) return failed("is larger than 1 MB");
    return decode(await handle.readFile());
  } finally {
    await handle.close();
  }
}

function isInside(root: string, path: string): boolean {
  const inner = relative(root, path);
  return inner !== "" && !inner.startsWith("..") && !isAbsolute(inner);
}

function decode(bytes: Uint8Array): FileRead {
  if (bytes.includes(NUL)) return failed("is a binary file");
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return failed("is not valid UTF-8");
  }
}

function reasonOf(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  return (code === undefined ? undefined : ERRNO_REASONS[code]) ?? code ?? error.message;
}

function failed(reason: string): FileRead {
  return { ok: false, reason };
}
