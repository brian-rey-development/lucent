# Lucent Markdown

A video is one `*.lucent.md` file: YAML frontmatter, then scenes. Each scene holds narration paragraphs and one
` ```scene ` block. The file stays valid Markdown and reads as a script. `lucent catalog` lists every verb.

This is the full reference. The condensed guide for agents, held to the 1,200-token budget in
[`goals.md`](goals.md), ships with the MCP server in phase 3.

Decisions behind the format: [ADR 0002](adr/0002-authoring-format.md), [ADR 0005](adr/0005-narration-driven-timing.md),
[spike 001](spikes/001-authoring-format.md).

## Frontmatter

```yaml
---
lucent: 0
title: Where the instructions live
voice: kokoro/am_fenrir
subtitles: [en, es]
colors: { dna: "#1F8FC4", A: "#1B9E77" }
assets: assets/images.yaml
---
```

| Key | Required | Value |
|---|---|---|
| `lucent` | Yes | Format version, `0` |
| `title` | Yes | Video title |
| `voice` | Yes | `engine/voice` |
| `subtitles` | Yes | Two-letter languages. The first is spoken; each other one needs a translation per paragraph |
| `colors` | No | Named colors for `color:` props, quoted: `"#1F8FC4"` |
| `assets` | No | The asset manifest, relative to the video file and inside its folder |

## Scenes

`## scene-id` starts a scene. Every id in the format (scenes, elements, cues, assets, points) is a lowercase letter
followed by lowercase letters, digits, `-` or `_`, and scene ids are unique. Any other heading is an error, and the
text under it is ignored until the next scene.

````markdown
## molecule

Each chromosome is one single, unbroken molecule of DNA.
> es: Cada cromosoma es una sola molécula de ADN, continua.

[Zoom in] far beyond what any light microscope can show.
> es: Si hacés zoom mucho más allá de lo que puede mostrar un microscopio óptico.

(pause 1.5s)

```scene
keep: $karyotype
do:
  - at: Zoom in
    zoom: $karyotype/chr1
    into:
      helix: { turning: true }
```
````

| Element | Syntax | Rule |
|---|---|---|
| Paragraph | Consecutive lines of text | One spoken sentence group, the unit of voice caching |
| Cue | `[phrase]` or `[phrase\|id]` | Unique per scene. `at:` takes the phrase, or the id when the cue has one |
| Translation | `> es: text` right after its paragraph | One line per extra subtitle language |
| Pause | `(pause 1.5s)` on its own line | Silence between paragraphs, at most 60 s |
| Comment | `<!-- ... -->` | Ignored anywhere, including across lines |

Narration is spoken as written: spell numbers ("forty-six"), write units as words ("microns"), and keep symbols such as
`%`, `µ` and `&` for on-screen text.

## Scene block

| Key | Value |
|---|---|
| `keep` | `$id` or a list: elements carried over from the previous scene |
| `enter` | `fade` or `cut` |
| `layout` | `stack`, `row` or `split` |
| `do` | The steps, in order |

Each step has exactly one verb, plus modifiers:

| Modifier | Meaning |
|---|---|
| `at: cue` | Start when the cue is spoken. `at: with` starts with the previous step. Without `at`, the step follows the previous one |
| `id: name` | Name the element to refer to it as `$name`. Photos and images default to their asset key, other verbs to the verb name |
| `dur: fast\|base\|slow` | Motion speed |
| `enter: fade\|cut` | Entrance style |

`hide`, `focus` and `zoom` create no element, so they take only `at` and `dur`. Nested steps (`sheet` children, `zoom`
`into`) take only `id`.

Targets are `$id` for an element on screen, or `$id/point` for a named point of its image. A state change gives an
element new props, and the engine animates the difference. Only verbs that list `change` in the catalog accept one,
and a change takes only `at` and `dur`:

```yaml
- at: order of those letters
  $legend: { seq: ATGGTGCATCTGACTCCTGAGGAG }
```

## Asset manifest

```yaml
blood:
  file: images/blood.jpg
  caption: Human blood smear · Wright's stain
  credit: Author, license, source
  points:
    wbc: [0.46, 0.41, 0.145]
```

`file` is relative to the manifest; `caption`, `credit` and `points` are optional. A point is `[u, v, r]`: `u` and `v`
are fractions of the image width and height, `r` a fraction of its shorter side, so points survive any rescale or
crop. `check` does not open image files.

## YAML rules

- Unknown keys are errors, with the closest valid key as the fix.
- A `#` after a value starts a comment and silently cuts the value, so it is an error (E103). Quote the value or put
  the comment on its own line.
- Anchors, aliases, tags and directives are not supported. Quote values that start with `*`, `&` or `!`, such as
  `"*emphasis*"`.

## Diagnostics

`CODE [file:]line:column where message; fix: action`. The file appears only for another file, such as the manifest.
`where` is the scene id followed by the YAML path inside its block (`blood.do[1].ring[0]`), `frontmatter.key`,
`manifest.asset.key`, or `document` for text outside any scene. Errors (E) fail `check`; warnings (W) do not.

| Range | Checks |
|---|---|
| E10x | YAML syntax and schema: unknown, invalid and missing keys |
| E11x | Steps: verbs and modifiers |
| E12x, E13x | Document structure: scenes, fences, comments, translations, cues, pauses |
| E14x | Asset manifest |
| E2xx, W2xx | References: elements, points, assets, colors, cues |
| W4xx | Pacing: paragraph length, subtitle reading speed |
| E5xx, W5xx | Speech: symbols and digits in narration |

`lucent catalog --codes` lists every code.
