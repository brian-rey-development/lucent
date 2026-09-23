import { createDiagnostic, type Diagnostic, type Place, type Problem } from "../diagnostics/index.ts";
import { paragraphsOf, WORDS_PER_SECOND, type Paragraph, type Translation, type Video } from "../model/index.ts";
import { countWords } from "../text/index.ts";
import { MAX_CHARACTERS_PER_SECOND } from "./constants.ts";
import { duplicateTranslation, missingTranslation, notInSubtitles, spokenLanguage, tooFast } from "./problems.ts";

interface Languages {
  readonly spoken: string | undefined;
  readonly translated: readonly string[];
}

export function analyzeSubtitles({ settings, scenes }: Video): readonly Diagnostic[] {
  if (settings.subtitles === undefined) return [];
  const [spoken, ...translated] = settings.subtitles;
  return scenes.flatMap((scene) =>
    paragraphsOf(scene).flatMap((paragraph) =>
      analyzeParagraph(paragraph, { spoken, translated }, { where: scene.id, scene: scene.id }),
    ),
  );
}

function analyzeParagraph(paragraph: Paragraph, languages: Languages, place: Place): readonly Diagnostic[] {
  const { translations } = paragraph;
  const problems = translations.flatMap((translation, index) =>
    translationProblems(paragraph, translation, index, languages).map((problem) =>
      createDiagnostic(problem, { ...place, position: translation.position }),
    ),
  );
  if (translations.some(({ language }) => language === undefined)) return problems;
  const missing = languages.translated.filter(
    (language) => !translations.some((translation) => translation.language === language),
  );
  return [
    ...problems,
    ...missing.map((language) =>
      createDiagnostic(missingTranslation(language), { ...place, position: paragraph.position }),
    ),
  ];
}

function translationProblems(
  paragraph: Paragraph,
  translation: Translation,
  index: number,
  languages: Languages,
): readonly Problem[] {
  const { language, text } = translation;
  if (language === undefined) return [];
  if (language === languages.spoken) return [spokenLanguage(language)];
  if (!languages.translated.includes(language)) return [notInSubtitles(language)];
  if (paragraph.translations.findIndex((other) => other.language === language) !== index)
    return [duplicateTranslation(language)];
  const seconds = countWords(paragraph.text) / WORDS_PER_SECOND;
  if (seconds === 0) return [];
  const rate = Math.round(text.length / seconds);
  return rate > MAX_CHARACTERS_PER_SECOND ? [tooFast(language, rate)] : [];
}
