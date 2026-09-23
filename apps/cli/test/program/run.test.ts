import { describe, expect, it } from "vitest";

import { run } from "../../src/program/index.ts";
import { fakeIo } from "../support/fake-io.ts";

describe("run", () => {
  it.each([[[]], [["--help"]], [["-h"]], [["help"]]])("prints the usage for %j", async (argv) => {
    const io = fakeIo();

    expect(await run(argv, io)).toBe(0);
    expect(io.out[0]).toMatch(/^usage: lucent <command>/);
  });

  it.each([
    [["check", "--help"], /^usage: lucent check <file>/],
    [["catalog", "-h"], /^usage: lucent catalog/],
  ])("prints the help for %j", async (argv, expected) => {
    const io = fakeIo();

    expect(await run(argv, io)).toBe(0);
    expect(io.out[0]).toMatch(expected);
  });

  it.each([["--version"], ["-v"]])("prints the version for %s", async (flag) => {
    const io = fakeIo();

    expect(await run([flag], io)).toBe(0);
    expect(io.out).toEqual(["1.2.3"]);
  });

  it.each([
    [["frob"], "lucent: unknown command frob; run lucent --help"],
    [["check"], "lucent: check needs a file; run lucent --help"],
    [["check", "a", "b"], "lucent: check takes one file; run lucent --help"],
    [["check", "a", "--bogus"], "lucent: unknown option --bogus; run lucent --help"],
    [["check", "a", "--scene"], "lucent: --scene needs a value; run lucent --help"],
    [["check", "a", "--json=yes"], "lucent: --json takes no value; run lucent --help"],
    [["catalog", "a", "b"], "lucent: catalog takes one verb; run lucent --help"],
    [["catalog", "--schema"], "lucent: --schema needs a verb; run lucent --help"],
    [
      ["catalog", "--codes", "ring"],
      "lucent: --codes takes no verb or --schema; run lucent --help",
    ],
  ])("rejects %j with one line and exit code 2", async (argv, expected) => {
    const io = fakeIo();

    expect(await run(argv, io)).toBe(2);
    expect(io.err).toEqual([expected]);
  });

  it("reports an unreadable file with exit code 3", async () => {
    const io = fakeIo();

    expect(await run(["check", "missing.md"], io)).toBe(3);
    expect(io.err).toEqual(["lucent: cannot read missing.md: no such file"]);
  });

  it("answers in JSON when --json is set", async () => {
    const io = fakeIo();

    expect(await run(["check", "missing.md", "--json"], io)).toBe(3);
    expect(io.out).toEqual(['{"ok":false,"error":"cannot read missing.md: no such file"}']);
  });

  it("lets unexpected errors through to main", async () => {
    const io = { ...fakeIo(), readFile: async () => Promise.reject(new Error("boom")) };

    await expect(run(["check", "a.md"], io)).rejects.toThrow("boom");
  });
});
