import { oneOf, type Problem } from "../diagnostics/index.ts";

export const NO_MANIFEST: Problem = {
  code: "E203",
  message: "no asset manifest",
  fix: "add assets: FILE to the frontmatter",
};

export function notOnScreen(id: string, fix: string): Problem {
  return { code: "E202", message: `$${id} is not on screen`, fix };
}

export function gone(id: string, reason: string): Problem {
  return { code: "E202", message: `$${id} ${reason}`, fix: "show it again or drop this reference" };
}

export function ambiguous(id: string): Problem {
  return {
    code: "E206",
    message: `$${id} is ambiguous: two elements share it`,
    fix: "add id: to one of them",
  };
}

export function duplicateId(id: string): Problem {
  return {
    code: "E206",
    message: `$${id} is already on screen`,
    fix: "choose another id or hide it first",
  };
}

export function noPoints(id: string): Problem {
  return { code: "E201", message: `$${id} has no points`, fix: `target $${id}` };
}

export function unknownPoint(
  point: string,
  asset: string,
  known: readonly string[],
  closest: string | undefined,
): Problem {
  const fix =
    known.length === 0 ? `add points to ${asset} in the manifest` : useOrOneOf(closest, known);
  return { code: "E201", message: `${asset} has no point ${point}`, fix };
}

export function unknownAsset(name: string, closest: string | undefined): Problem {
  return {
    code: "E203",
    message: `unknown asset ${name}`,
    fix: closest === undefined ? `add ${name} to the manifest` : `use ${closest}`,
  };
}

export function unknownColor(name: string, closest: string | undefined): Problem {
  const fix =
    closest === undefined ? "define it under colors in the frontmatter" : `use ${closest}`;
  return { code: "E207", message: `unknown color ${name}`, fix };
}

export function noState(verb: string, changeable: readonly string[]): Problem {
  return {
    code: "E105",
    message: `is a ${verb}, which has no state`,
    fix: `remove it; only ${oneOf(changeable)} change`,
  };
}

export function changeNotMapping(id: string, found: string, keys: readonly string[]): Problem {
  return { code: "E105", message: `is ${found}`, fix: `write $${id}: {${keys.join(", ")}}` };
}

export function keptNotOnScreen(id: string, scene: string, fix: string): Problem {
  return { code: "E208", message: `$${id} is not on screen when ${scene} starts`, fix };
}

function useOrOneOf(closest: string | undefined, known: readonly string[]): string {
  return closest === undefined ? `use ${oneOf(known)}` : `use ${closest}`;
}
