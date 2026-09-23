import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

interface Package {
  readonly root: string;
  readonly layers: Readonly<Record<string, number>>;
  readonly packages: ReadonlySet<string>;
}

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const CORE: Package = {
  root: "packages/core/src",
  layers: {
    text: 0,
    yaml: 1,
    diagnostics: 1,
    validation: 2,
    catalog: 2,
    model: 3,
    frontmatter: 4,
    scenes: 4,
    direction: 4,
    assets: 4,
    references: 5,
    cues: 5,
    speech: 5,
    subtitles: 5,
    timeline: 5,
    check: 6,
    index: 7,
  },
  packages: new Set(["yaml", "zod"]),
};

const CLI: Package = {
  root: "apps/cli/src",
  layers: { shared: 0, "commands/check": 1, "commands/catalog": 1, program: 2, main: 3 },
  packages: new Set(["@lucent/core"]),
};

const IMPORT = /(?:^|\n)\s*(?:import|export)\b[^"';]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

async function filesOf(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => join(entry.parentPath, entry.name));
}

function moduleOf(pkg: Package, file: string): string {
  const path = relative(join(ROOT, pkg.root), file).replace(/\.ts$/, "");
  return Object.keys(pkg.layers).find((name) => path === name || path.startsWith(`${name}/`)) ?? path;
}

function importsOf(source: string): readonly string[] {
  return [...source.matchAll(IMPORT)].flatMap((match) => match[1] ?? match[2] ?? []);
}

function problemsOf(pkg: Package, file: string, specifier: string): readonly string[] {
  const from = moduleOf(pkg, file);
  const where = `${relative(ROOT, file)} imports ${specifier}`;
  if (!specifier.startsWith(".")) {
    if (specifier.startsWith("node:")) return pkg === CORE ? [`${where}: core does no I/O`] : [];
    return pkg.packages.has(specifier) ? [] : [`${where}: not an allowed package`];
  }
  const target = resolve(dirname(file), specifier);
  const to = moduleOf(pkg, target);
  if (!Object.hasOwn(pkg.layers, to)) return [`${where}: outside the package or an unknown module`];
  if (to === from) return [];
  const problems = [];
  if (target !== join(ROOT, pkg.root, to, "index.ts")) problems.push(`${where}: import ${to} through its index.ts`);
  if ((pkg.layers[to] ?? Infinity) >= (pkg.layers[from] ?? -Infinity))
    problems.push(`${where}: ${to} is not in a lower layer`);
  return problems;
}

async function violations(pkg: Package): Promise<readonly string[]> {
  const files = await filesOf(join(ROOT, pkg.root));
  const checked = await Promise.all(
    files.map(async (file) => {
      if (!Object.hasOwn(pkg.layers, moduleOf(pkg, file))) return [`${relative(ROOT, file)}: unknown module`];
      const source = await readFile(file, "utf8");
      return importsOf(source).flatMap((specifier) => problemsOf(pkg, file, specifier));
    }),
  );
  return checked.flat();
}

describe("architecture", () => {
  it("keeps core modules layered, index-only and free of I/O", async () => {
    expect(await violations(CORE)).toEqual([]);
  });

  it("keeps the CLI layered and uses core only through its package", async () => {
    expect(await violations(CLI)).toEqual([]);
  });

  it("finds the imports it checks", () => {
    expect(
      importsOf('import { a } from "./a.ts";\nexport { b } from "../b/index.ts";\nconst c = await import("./c.ts");'),
    ).toEqual(["./a.ts", "../b/index.ts", "./c.ts"]);
  });
});
