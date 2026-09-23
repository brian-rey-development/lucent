import type { Problem } from "../diagnostics/index.ts";
import { MAX_CHARACTERS_PER_SECOND } from "./constants.ts";

export function spokenLanguage(language: string): Problem {
  return { code: "E133", message: `${language} is the spoken language`, fix: "remove the line" };
}

export function notInSubtitles(language: string): Problem {
  return {
    code: "E133",
    message: `${language} is not in subtitles`,
    fix: `add ${language} to subtitles or remove the line`,
  };
}

export function duplicateTranslation(language: string): Problem {
  return { code: "E135", message: `duplicate ${language} translation`, fix: "remove one" };
}

export function missingTranslation(language: string): Problem {
  return { code: "E134", message: `missing ${language} translation`, fix: `add > ${language}: TEXT` };
}

export function tooFast(language: string, rate: number): Problem {
  const message = `${language} subtitle needs ${rate} characters per second, max ${MAX_CHARACTERS_PER_SECOND}`;
  return { code: "W401", message, fix: "shorten the translation" };
}
