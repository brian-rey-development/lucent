import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { run } from "../src/program/index.ts";
import { findFile, readTextFile } from "../src/shared/index.ts";
import { fakeIo } from "./support/fake-io.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

describe("examples", () => {
  it("checks halden-ep01 clean", async () => {
    const io = { ...fakeIo(), readFile: readTextFile, findFile, cwd: ROOT };

    expect(await run(["check", "examples/halden-ep01/ep01.lucent.md"], io)).toBe(0);
    expect(io.out[0]).toContain(
      "examples/halden-ep01/ep01.lucent.md: 0 errors, 0 warnings, ~1:35 estimated",
    );
  });
});
