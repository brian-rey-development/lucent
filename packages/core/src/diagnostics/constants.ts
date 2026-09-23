import type { CodeDefinition, DiagnosticCode } from "./types.ts";

export const MAX_QUOTED_LENGTH = 60;
export const MAX_TEXT_LENGTH = 160;
export const ELLIPSIS = "...";
export const MAX_LISTED = 5;
// oxlint-disable-next-line no-control-regex -- escaping control characters is the purpose of this pattern
export const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;

export const DIAGNOSTIC_CODES: Readonly<Record<DiagnosticCode, CodeDefinition>> = {
  E101: { severity: "error", summary: "frontmatter missing or not closed" },
  E102: { severity: "error", summary: "invalid YAML" },
  E103: { severity: "error", summary: "comment after a YAML value" },
  E104: { severity: "error", summary: "unknown key" },
  E105: { severity: "error", summary: "invalid value" },
  E106: { severity: "error", summary: "missing key" },
  E111: { severity: "error", summary: "step with more than one verb" },
  E112: { severity: "error", summary: "step without a verb" },
  E113: { severity: "error", summary: "modifier not allowed here" },
  E120: { severity: "error", summary: "no scenes" },
  E121: { severity: "error", summary: "invalid scene id" },
  E122: { severity: "error", summary: "duplicate scene id" },
  E123: { severity: "error", summary: "text outside a scene" },
  E124: { severity: "error", summary: "heading that is not a scene" },
  E125: { severity: "error", summary: "scene without a scene block" },
  E126: { severity: "error", summary: "duplicate scene block" },
  E127: { severity: "error", summary: "fence never closed" },
  E128: { severity: "error", summary: "fence that is not a scene block" },
  E129: { severity: "error", summary: "scene without narration" },
  E130: { severity: "error", summary: "comment never closed" },
  E131: { severity: "error", summary: "translation without a paragraph" },
  E132: { severity: "error", summary: "malformed translation" },
  E133: { severity: "error", summary: "translation in a language not in subtitles" },
  E134: { severity: "error", summary: "missing translation" },
  E135: { severity: "error", summary: "duplicate translation" },
  E136: { severity: "error", summary: "malformed cue" },
  E137: { severity: "error", summary: "duplicate cue" },
  E138: { severity: "error", summary: "malformed pause" },
  E141: { severity: "error", summary: "asset manifest cannot be read" },
  E201: { severity: "error", summary: "unknown point" },
  E202: { severity: "error", summary: "element not on screen" },
  E203: { severity: "error", summary: "unknown asset" },
  E204: { severity: "error", summary: "cue not marked in the narration" },
  E205: { severity: "error", summary: "cue written with digits" },
  E206: { severity: "error", summary: "duplicate or ambiguous element id" },
  E207: { severity: "error", summary: "unknown color" },
  E208: { severity: "error", summary: "kept element not on screen" },
  E209: { severity: "error", summary: "at: with and no previous step" },
  W201: { severity: "warning", summary: "cue never used" },
  W401: { severity: "warning", summary: "subtitle too fast to read" },
  W402: { severity: "warning", summary: "paragraph too long for one breath" },
  E501: { severity: "error", summary: "symbol the voice cannot read" },
  W502: { severity: "warning", summary: "digits in narration" },
};
