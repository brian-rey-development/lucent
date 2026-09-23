import { readFile } from "node:fs/promises";

import { Tiktoken } from "js-tiktoken/lite";
import o200k from "js-tiktoken/ranks/o200k_base";
import { describe, expect, it } from "vitest";

import { formatCatalog } from "../../src/catalog/index.ts";
import { formatDiagnostic } from "../../src/diagnostics/index.ts";
import { CASES } from "../support/cases.ts";
import { checkSource, documentOf, FRONTMATTER, readFileOf, sceneOf, STEPS } from "../support/documents.ts";
import { check } from "../../src/check/index.ts";

const TOKENIZER_MARGIN = 1.35;
const CATALOG_TOKENS = 1500 / TOKENIZER_MARGIN;
const ERROR_TOKENS = 40 / TOKENIZER_MARGIN;
const CHECK_MILLISECONDS = 200;
const RUNS = 7;
const EXAMPLE = new URL("../../../../examples/halden-ep01/", import.meta.url);

const encoder = new Tiktoken(o200k);
const tokens = (text: string): number => encoder.encode(text).length;

const REALISTIC = [
  documentOf(sceneOf(), FRONTMATTER.replace("kokoro/am_fenrir", "kokoro")),
  documentOf(sceneOf(), FRONTMATTER.replace('"#1F8FC4"', '"blue"')),
  documentOf(sceneOf(`${STEPS}\n  - $Bad: { text: x }`)),
  documentOf(sceneOf(`${STEPS}\n  - text: "long"\n    size: huge`)),
  documentOf(sceneOf(`${STEPS}\n  - note: Source: Sender et al.`)),
  documentOf(sceneOf(`${STEPS}\n  - ring: $blood/nuclei`)),
  documentOf(sceneOf(`${STEPS}\n  - photo: blood\n    center: nucleus`)),
];

describe("budgets", () => {
  it("keeps the catalog under its token budget", () => {
    expect(tokens(formatCatalog())).toBeLessThanOrEqual(CATALOG_TOKENS);
  });

  it("keeps every error line under its token budget", async () => {
    const sources = [...CASES.map(({ source }) => source), ...REALISTIC];
    const reports = await Promise.all(sources.map(async (source) => checkSource(source)));
    const lines = reports.flatMap(({ diagnostics }) => diagnostics.map(formatDiagnostic));

    expect(lines.filter((line) => tokens(line) > ERROR_TOKENS)).toEqual([]);
  });

  it("checks the example well under 200 ms", async () => {
    const source = await readFile(new URL("ep01.lucent.md", EXAMPLE), "utf8");
    const readAsset = readFileOf({
      "assets/images.yaml": await readFile(new URL("assets/images.yaml", EXAMPLE), "utf8"),
    });
    await check(source, { readFile: readAsset });
    const times: number[] = [];
    for (let run = 0; run < RUNS; run++) {
      const start = performance.now();
      // oxlint-disable-next-line no-await-in-loop -- runs are timed one at a time
      await check(source, { readFile: readAsset });
      times.push(performance.now() - start);
    }

    expect(times.toSorted((a, b) => a - b)[Math.floor(RUNS / 2)]).toBeLessThan(CHECK_MILLISECONDS);
  });
});
