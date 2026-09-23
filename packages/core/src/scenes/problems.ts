import { quote, type Problem } from "../diagnostics/index.ts";
import { toId } from "../text/index.ts";
import { MAX_PAUSE_SECONDS } from "./constants.ts";

export const NO_SCENES: Problem = {
  code: "E120",
  message: "no scenes",
  fix: "add ## scene-id and its narration",
};
export const STRAY: Problem = {
  code: "E123",
  message: "text outside a scene",
  fix: "add ## scene-id above it",
};
export const BLOCK_OUTSIDE: Problem = {
  code: "E123",
  message: "scene block outside a scene",
  fix: "add ## scene-id above it",
};
export const EMPTY_ID: Problem = {
  code: "E121",
  message: "empty scene id",
  fix: "write ## scene-id",
};
export const NO_BLOCK: Problem = {
  code: "E125",
  message: "no scene block",
  fix: "add a ```scene block with do:",
};
export const SECOND_BLOCK: Problem = {
  code: "E126",
  message: "duplicate scene block",
  fix: "merge both into one",
};
export const SILENT: Problem = {
  code: "E129",
  message: "no narration",
  fix: "add a paragraph or (pause 2s)",
};
export const UNCLOSED_COMMENT: Problem = {
  code: "E130",
  message: "comment never closed",
  fix: "close it with -->",
};
export const ORPHAN: Problem = {
  code: "E131",
  message: "translation without a paragraph",
  fix: "put it right after its paragraph",
};
export const MALFORMED_TRANSLATION: Problem = {
  code: "E132",
  message: "malformed translation",
  fix: "write > xx: TEXT",
};
export const MALFORMED_PAUSE: Problem = {
  code: "E138",
  message: "malformed pause",
  fix: "write (pause 1.5s)",
};
export const EMPTY_CUE: Problem = {
  code: "E136",
  message: "empty cue",
  fix: "put the spoken words inside [ ]",
};
export const TWO_IDS: Problem = {
  code: "E136",
  message: "cue with two ids",
  fix: "write [PHRASE|ID]",
};

export function invalidSceneId(id: string): Problem {
  return {
    code: "E121",
    message: `invalid scene id ${quote(id)}`,
    fix: `use ${toId(id) ?? "scene-id"}`,
  };
}

export function duplicateScene(id: string): Problem {
  return { code: "E122", message: `duplicate scene id ${id}`, fix: "rename one" };
}

export function notSceneHeading(level: number, text: string): Problem {
  const heading = `${"#".repeat(level)} ${text}`;
  return {
    code: "E124",
    message: `${quote(heading)} is not a scene heading`,
    fix: `use ## ${toId(text) ?? "scene-id"} or remove it`,
  };
}

export function unclosedFence(marker: string): Problem {
  return { code: "E127", message: "fence never closed", fix: `close it with ${marker}` };
}

export function notSceneFence(language: string, marker: string): Problem {
  const fence = language === "" ? "fence without a language" : `fence ${quote(language)}`;
  return { code: "E128", message: `${fence} is not a scene block`, fix: `use ${marker}scene` };
}

export function uppercaseLanguage(language: string): Problem {
  return {
    code: "E132",
    message: `uppercase language ${language}`,
    fix: `write > ${language.toLowerCase()}: TEXT`,
  };
}

export function pauseOutOfRange(seconds: number): Problem {
  return {
    code: "E138",
    message: `pause of ${seconds}s`,
    fix: `use more than 0s and at most ${MAX_PAUSE_SECONDS}s`,
  };
}

export function invalidCueId(id: string): Problem {
  return {
    code: "E136",
    message: `invalid cue id ${quote(id)}`,
    fix: `use ${toId(id) ?? "a lowercase id"}`,
  };
}

export function unmatchedBracket(bracket: string): Problem {
  return {
    code: "E136",
    message: `unmatched ${bracket}`,
    fix: "close the cue or remove the bracket",
  };
}
