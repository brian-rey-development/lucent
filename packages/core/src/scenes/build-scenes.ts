import {
  createDiagnostic,
  type Diagnostic,
  type Problem,
  type Result,
} from "../diagnostics/index.ts";
import type { NarrationItem, Translation } from "../model/index.ts";
import { isId, type Position, type TextBlock } from "../text/index.ts";
import { DOCUMENT, MAX_PAUSE_SECONDS, SCENE_FENCE, SCENE_LEVEL } from "./constants.ts";
import { parseParagraph } from "./parse-paragraph.ts";
import {
  BLOCK_OUTSIDE,
  duplicateScene,
  EMPTY_ID,
  invalidSceneId,
  MALFORMED_PAUSE,
  MALFORMED_TRANSLATION,
  NO_BLOCK,
  notSceneFence,
  notSceneHeading,
  ORPHAN,
  pauseOutOfRange,
  SECOND_BLOCK,
  SILENT,
  STRAY,
  UNCLOSED_COMMENT,
  unclosedFence,
  uppercaseLanguage,
} from "./problems.ts";
import type { FenceToken, SceneSource, TextLine, Token } from "./types.ts";

type TokenOf<Kind extends Token["kind"]> = Extract<Token, { readonly kind: Kind }>;

interface SceneDraft {
  readonly id: string;
  readonly position: Position;
  readonly narration: NarrationItem[];
  block: TextBlock | undefined;
  fenced: boolean;
  truncated: boolean;
  paragraphs: number;
}

interface Draft {
  readonly scenes: SceneDraft[];
  readonly ids: Set<string>;
  readonly diagnostics: Diagnostic[];
  scene: SceneDraft | undefined;
  lines: TextLine[];
  translations: Translation[];
  stray: boolean;
  ignoring: boolean;
}

export function buildScenes(tokens: readonly Token[]): Result<readonly SceneSource[]> {
  const draft = createDraft();
  for (const token of tokens) handle(draft, token);
  flush(draft);
  for (const scene of draft.scenes) checkScene(draft, scene);
  const scenes = draft.scenes.map(({ id, position, narration, block }) => ({
    id,
    position,
    narration,
    block,
  }));
  return { value: scenes, diagnostics: draft.diagnostics };
}

function createDraft(): Draft {
  return {
    scenes: [],
    ids: new Set(),
    diagnostics: [],
    scene: undefined,
    lines: [],
    translations: [],
    stray: false,
    ignoring: false,
  };
}

function handle(draft: Draft, token: Token): void {
  if (token.kind === "blank") {
    flush(draft);
    draft.stray = false;
  } else if (token.kind === "heading") onHeading(draft, token);
  else if (token.kind === "fence") onFence(draft, token);
  else if (token.kind === "unclosed-comment") onUnclosedComment(draft, token);
  else if (!draft.ignoring) onNarration(draft, token);
}

function onUnclosedComment(draft: Draft, token: Position): void {
  report(draft, UNCLOSED_COMMENT, token);
  if (draft.scene !== undefined) draft.scene.truncated = true;
}

function onNarration(
  draft: Draft,
  token: TokenOf<"text" | "translation" | "quote" | "pause" | "malformed-pause">,
): void {
  if (token.kind === "text") onText(draft, token);
  else if (token.kind === "translation") onTranslation(draft, token);
  else if (token.kind === "quote") addTranslation(draft, MALFORMED_TRANSLATION, token);
  else if (token.kind === "pause") onPause(draft, token);
  else {
    flush(draft);
    report(draft, MALFORMED_PAUSE, token);
  }
}

function onHeading(draft: Draft, { level, text, line, column }: TokenOf<"heading">): void {
  flush(draft);
  draft.stray = false;
  const position = { line, column };
  if (level === SCENE_LEVEL && text !== "") {
    openScene(draft, text, position);
    return;
  }
  report(
    draft,
    level === SCENE_LEVEL ? EMPTY_ID : notSceneHeading(level, text),
    position,
    undefined,
  );
  draft.scene = undefined;
  draft.ignoring = true;
}

function openScene(draft: Draft, id: string, position: Position): void {
  const problem = sceneIdProblem(draft.ids, id);
  const scene = {
    id,
    position,
    narration: [],
    block: undefined,
    fenced: false,
    truncated: false,
    paragraphs: 0,
  };
  draft.scenes.push(scene);
  draft.ids.add(id);
  draft.scene = scene;
  draft.ignoring = false;
  if (problem !== undefined) report(draft, problem, position);
}

function sceneIdProblem(ids: ReadonlySet<string>, id: string): Problem | undefined {
  if (!isId(id)) return invalidSceneId(id);
  return ids.has(id) ? duplicateScene(id) : undefined;
}

function onText(draft: Draft, { text, line, column }: TokenOf<"text">): void {
  if (draft.scene === undefined) {
    if (!draft.stray) report(draft, STRAY, { line, column });
    draft.stray = true;
    return;
  }
  if (draft.translations.length > 0) flush(draft);
  draft.lines.push({ text, line, column });
}

function onTranslation(draft: Draft, token: TokenOf<"translation">): void {
  const { language, text, line, column } = token;
  if (language !== language.toLowerCase()) {
    addTranslation(draft, uppercaseLanguage(language), token);
    return;
  }
  if (draft.lines.length === 0) report(draft, ORPHAN, token);
  else draft.translations.push({ language, text, position: { line, column } });
}

function addTranslation(draft: Draft, problem: Problem, { line, column }: Position): void {
  report(draft, problem, { line, column });
  if (draft.lines.length > 0)
    draft.translations.push({ language: undefined, text: "", position: { line, column } });
}

function onPause(draft: Draft, { seconds, line, column }: TokenOf<"pause">): void {
  flush(draft);
  const position = { line, column };
  if (draft.scene === undefined) report(draft, STRAY, position);
  else if (seconds <= 0 || seconds > MAX_PAUSE_SECONDS)
    report(draft, pauseOutOfRange(seconds), position);
  else draft.scene.narration.push({ kind: "pause", seconds, position });
}

function onFence(draft: Draft, token: FenceToken): void {
  flush(draft);
  if (draft.ignoring) return;
  const { scene } = draft;
  const problem = fenceProblem(token, scene);
  if (scene !== undefined) scene.fenced = true;
  if (problem !== undefined) report(draft, problem, token);
  else if (scene !== undefined) scene.block = token.block;
}

function fenceProblem(token: FenceToken, scene: SceneDraft | undefined): Problem | undefined {
  if (!token.closed) return unclosedFence(token.marker);
  if (token.language !== SCENE_FENCE) return notSceneFence(token.language, token.marker);
  if (scene === undefined) return BLOCK_OUTSIDE;
  return scene.block === undefined ? undefined : SECOND_BLOCK;
}

function flush(draft: Draft): void {
  const { scene } = draft;
  const [first, ...rest] = draft.lines;
  if (scene === undefined || first === undefined) return;
  const paragraph = parseParagraph({
    lines: [first, ...rest],
    translations: draft.translations,
    index: scene.paragraphs,
    scene: scene.id,
  });
  scene.narration.push(paragraph.value);
  scene.paragraphs++;
  draft.diagnostics.push(...paragraph.diagnostics);
  draft.lines = [];
  draft.translations = [];
}

function checkScene(draft: Draft, scene: SceneDraft): void {
  if (scene.truncated) return;
  if (scene.block === undefined && !scene.fenced) report(draft, NO_BLOCK, scene.position, scene.id);
  if (scene.narration.length === 0) report(draft, SILENT, scene.position, scene.id);
}

function report(
  draft: Draft,
  problem: Problem,
  { line, column }: Position,
  scene = draft.scene?.id,
): void {
  draft.diagnostics.push(
    createDiagnostic(problem, { where: scene ?? DOCUMENT, scene, position: { line, column } }),
  );
}
