#!/usr/bin/env node
import { fileURLToPath } from "node:url";

import { run } from "./program/index.ts";
import { EXIT_CODES, findFile, PROGRAM, readTextFile } from "./shared/index.ts";

const PACKAGE_JSON = fileURLToPath(new URL("../package.json", import.meta.url));

function exitOnBrokenPipe(error: NodeJS.ErrnoException): void {
  if (error.code !== "EPIPE") throw error;
  process.exit(process.exitCode ?? EXIT_CODES.ok);
}

async function readVersion(): Promise<string> {
  const read = await readTextFile(PACKAGE_JSON);
  const parsed: unknown = read.ok ? JSON.parse(read.text) : undefined;
  const version =
    typeof parsed === "object" && parsed !== null && "version" in parsed
      ? parsed.version
      : undefined;
  return typeof version === "string" ? version : "unknown";
}

async function main(): Promise<void> {
  process.stdout.on("error", exitOnBrokenPipe);
  process.stderr.on("error", exitOnBrokenPipe);
  try {
    process.exitCode = await run(process.argv.slice(2), {
      readFile: readTextFile,
      findFile,
      stdout: (text) => process.stdout.write(`${text}\n`),
      stderr: (text) => process.stderr.write(`${text}\n`),
      cwd: process.cwd(),
      version: await readVersion(),
    });
  } catch (error) {
    process.stderr.write(
      `${PROGRAM}: internal error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = EXIT_CODES.internal;
  }
}

await main();
