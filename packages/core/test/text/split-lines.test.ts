import { describe, expect, it } from "vitest";

import { splitLines, stripByteOrderMark } from "../../src/text/index.ts";

describe("splitLines", () => {
  it("splits LF, CRLF and lone CR line endings", () => {
    expect(splitLines("a\nb\r\nc\rd")).toEqual(["a", "b", "c", "d"]);
  });

  it("drops a leading byte order mark", () => {
    expect(splitLines("﻿a\nb")).toEqual(["a", "b"]);
  });
});

describe("stripByteOrderMark", () => {
  it("keeps text without a byte order mark", () => {
    expect(stripByteOrderMark("a")).toBe("a");
  });
});
