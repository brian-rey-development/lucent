import type { Problem } from "../diagnostics/index.ts";
import { toId } from "../text/index.ts";

export const NO_VERB: Problem = { code: "E112", message: "step has no verb", fix: "add one verb from lucent catalog" };
export const NESTED_CHANGE: Problem = {
  code: "E113",
  message: "state change inside a nested step",
  fix: "move it to its own step",
};
export const BLOCK_IS_LIST: Problem = {
  code: "E105",
  message: "scene block is a list",
  fix: "put the steps under do:",
};
export const MISSING_DO: Problem = { code: "E106", message: "missing key do", fix: "add do:" };

export function notAMapping(found: string): Problem {
  return { code: "E105", message: `is ${found}`, fix: "write VERB: VALUE" };
}

export function unknownVerb(key: string, verb: string): Problem {
  return { code: "E112", message: `unknown verb ${key}`, fix: `use ${verb}` };
}

export function twoVerbs(keys: readonly string[]): Problem {
  return { code: "E111", message: `two verbs: ${keys.join(", ")}`, fix: "split it into one step per verb" };
}

export function misplacedModifier(key: string, context: string): Problem {
  return { code: "E113", message: `${key} is not allowed on ${context}`, fix: `remove ${key}` };
}

export function invalidTarget(key: string): Problem {
  const id = toId(key);
  return {
    code: "E105",
    message: `${key} is not a valid $ID`,
    fix: id === undefined ? "use $ and a lowercase id" : `use $${id}`,
  };
}
