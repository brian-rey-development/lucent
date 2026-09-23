# 0012. Let a blank line separate a paragraph from its translations

- Status: Accepted
- Date: 2026-09-23

## Context

ADR 0002 puts each translation on a `> es:` line directly under its paragraph. Prettier, the most common Markdown
formatter, inserts a blank line before every blockquote. Running it on a valid `.lucent.md` file turned every
translation into E131 "translation without a paragraph", so the file broke in any editor that formats on save.
CommonMark renders both forms the same way: a blockquote may interrupt a paragraph.

## Options

- Keep the rule and tell authors to exclude `*.lucent.md` from formatters. It costs nothing in the parser, but every
  user has to learn it, usually after the formatter has already broken a file.
- Accept blank lines between a paragraph and its translations. The file survives any formatter, and both forms read
  the same as a script.

## Decision

Translations attach to the paragraph before them, across blank lines. A text line after a blank line still starts
a new paragraph. A translation with no paragraph before it in the scene is still E131.

## Consequences

- Lucent files can be formatted with Prettier; a test checks the example before and after formatting.
- A stray `> es:` line far below a paragraph now attaches to it, and when that paragraph already has an `es`
  translation it is reported as a duplicate (E135) instead of an orphan.
