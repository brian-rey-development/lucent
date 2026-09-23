# Spike 001: Authoring format

|          |                                                                                                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status   | Complete                                                                                                                                                                          |
| Date     | 2026-09-23                                                                                                                                                                        |
| Question | What file format lets an agent (or a person) describe a narrated explainer with the fewest tokens, the fewest failed attempts, and full coverage of what the Halden lessons need? |
| Informs  | ADR 0002, 0005                                                                                                                                                                    |
| Machine  | MacBook M5 Pro, 15 CPU cores, 24 GB; Node 24.21; `yaml` 2.9.1; token counts with tiktoken `o200k_base` as a proxy for Claude's tokenizer (spike 007)                              |

## 1. Question and why it matters

The source file is what agents write, and writing is the most expensive token (`docs/goals.md`, section 4). The
format also decides how often an agent's first attempt fails, and every failure costs a `check` round trip. So there
are three things to minimise: tokens written, first-attempt failures, and ambiguity about what the file means.

The Manim prototype split each episode into a Markdown script and about 500 lines of Python, coupled by segment ids
and `wait_for_line(i, fraction)`. That coupling caused most of its timing bugs.

## 2. Method

1. Read prior art for narration-synced explainers (sources in section 7), including the manim-voiceover source code.
2. Encoded the same two scenes of episode 1 (`blood` and `molecule`: 8 spoken sentences, English plus Spanish,
   about 70 seconds of video) in four candidate formats, and counted tokens against the prototype's Manim code plus
   script for the same scenes.
3. Ran the real narration of episode 1 (36 English and 36 Spanish lines) through plain YAML rules to count how
   many lines would break or silently change.
4. Probed the `yaml` 2.9.1 parser with prose edge cases and measured parse time.

## 3. Findings

### 3.1 Narration is the irreducible majority of the tokens

Measured on the two scenes (tokenizer: `o200k_base` proxy):

| Encoding                                     | Total tokens | Narration (EN + ES) | Visual direction overhead | Overhead vs Manim |
| -------------------------------------------- | ------------ | ------------------- | ------------------------- | ----------------- |
| Manim code + Markdown script (prototype)     | 2,012        | 633                 | 1,379                     | 1.00              |
| A. YAML, plain scalars                       | 1,031        | 633                 | 398                       | 0.29              |
| B. YAML, all prose quoted                    | 1,047        | 633                 | 414                       | 0.30              |
| C. Markdown prose + one YAML block per scene | 971          | 633                 | 338                       | 0.25              |
| D. Markdown with inline directives           | 853          | 633                 | 220                       | 0.16              |

Every declarative option cuts the visual direction cost by 3.5x to 6x. Total source shrinks only about 2x, because
the words themselves are two thirds of the file. The format cannot reduce narration, so the right metric is the
overhead column.

### 3.2 Plain YAML breaks on real narration, sometimes silently

Measured on episode 1's real script: **8 of 72 lines (11%) fail to parse as plain YAML scalars**, all Spanish, all
because of a colon followed by a space ("Contalos: cuarenta y seis cromosomas").

Parser probes with `yaml` 2.9.1:

| Input                                 | Result                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `en: [Zoom in] far beyond...`         | Parse error (a line starting with `[` is a list)                            |
| `en: Chromosome one: the largest`     | Parse error                                                                 |
| `en: *emphasis* first`                | Parse error (`*` is an alias)                                               |
| `en: Pair #1 is the largest # really` | **Parses as `"Pair"`. The rest is silently dropped as a comment.**          |
| `flag: no`, `gt: 0/1`, `ratio: 1:30`  | Correct strings (YAML 1.2 core schema; the "Norway problem" does not apply) |

The silent truncation is the dangerous one: a narration line loses words, and nothing reports it.

### 3.3 Parsing cost is negligible

`yaml` 2.9.1 parses a 314-line episode in 1.24 ms (measured, median of 50). Parsing is not a factor in the 200 ms
`check` budget, whatever format is chosen.

### 3.4 Prior art converges on inline marks plus word timings

| Tool                                                                 | How visuals sync to speech                                                                                                                                                                                                                                                           | Lesson for Lucent                                                                                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| manim-voiceover 0.4.0                                                | SSML-style marks inside the text: `<bookmark mark='A'/>trigger animations`, then imperative `self.wait_until_bookmark("A")`. Word boundaries come from the TTS service (Azure) or from Whisper transcription, and a mark's time is interpolated by character distance (`tracker.py`) | Inline marks work. Its weaknesses are the ones Lucent removes: imperative waits, named marks separate from the words, and transcription when the TTS gives no timings |
| SSML `<mark name="..."/>` (W3C), supported by cloud TTS speech marks | Named marks in the text, reported back with times                                                                                                                                                                                                                                    | A standard, but verbose and needs ids                                                                                                                                 |
| Motion Canvas                                                        | Generator code with `yield* waitUntil('event')`; event times are dragged by hand in the editor timeline                                                                                                                                                                              | Timing lives in a GUI, not in the file: not agent-friendly                                                                                                            |
| Remotion                                                             | Frames and sequences in React code                                                                                                                                                                                                                                                   | Timing is code                                                                                                                                                        |
| Lucent v0.1 draft                                                    | `say` string per scene with `[cue]` brackets; steps reference cues                                                                                                                                                                                                                   | Closest to our needs; one `say` string per scene prevents per-sentence caching                                                                                        |
| Slidev, Marp                                                         | Markdown with YAML frontmatter and structured blocks                                                                                                                                                                                                                                 | Precedent for prose-first Markdown carrying structure                                                                                                                 |
| Fountain (screenplays)                                               | Plain-text, prose-first markup that tools parse                                                                                                                                                                                                                                      | Writers review scripts as prose                                                                                                                                       |

Our `[phrase]` cue is a lighter SSML mark: it needs no id because the phrase names itself, and it cannot drift from
the words it marks.

### 3.5 Colocating the action with the cue saves tokens but grows a mini-language

Format D puts the action inside the narration: `These pale discs are :ring[red blood cells]{target="$blood/rbc_1
$blood/rbc_2" label="no nucleus"}`. It is the cheapest (220 tokens of overhead), and a cue can never mismatch its
phrase. But writing the two scenes exposed the cost:

- Structured content collapses into attribute strings: the census sheet became
  `bar="0.84 red blood cells | every other cell"`, a private syntax inside a string.
- Two actions at one cue need chaining (`hide=$census`, `then="bases ACGT id=legend"`), another private syntax.
- The narration becomes hard to read and review as prose, which is how the owner approved episode 1.

Each of these is a grammar we would own, document and validate by hand. That is the "new DSL" ADR 0002 rejected.

### 3.6 Separating what is said from what is shown fits the work

Format C keeps two concerns apart:

- **Prose** (what is said): written, reviewed and translated as ordinary Markdown paragraphs. No quoting rules at
  all, so section 3.2's failures cannot happen in narration.
- **Direction** (what is shown): a small YAML block per scene, validated against the catalog schema. It contains
  short values (asset keys, point names, short labels), where YAML's pitfalls are rare and detectable.

The file is still valid Markdown: it renders readably on GitHub and in any editor, and the owner reviews the script
exactly as with episode 1.

### 3.7 Coverage: the format expresses all of episode 1

Every beat of episode 1 maps to a step, a component or the escape hatch:

| Episode 1 beat                                                  | Construct                                       | Built-in or custom |
| --------------------------------------------------------------- | ----------------------------------------------- | ------------------ |
| Maya timeline, age ticks, event cards                           | `timeline`                                      | Built-in           |
| Sequencer photo, push-in, caption                               | `photo` + `drift`                               | Built-in           |
| Variant file scrolling, counter to 25,000, one line singled out | `vcf` + `number` + `focus`                      | Built-in           |
| Title card                                                      | `title`                                         | Built-in           |
| Skin photo, band of nuclei outlined                             | `photo` + `ring` (`shape: band`)                | Built-in           |
| HeLa nucleus circled, stat card                                 | `ring` + `stat`                                 | Built-in           |
| Tennis ball filling with thread                                 | `custom: TangledThread`                         | Custom             |
| Blood rings, labels, census bar, white cell ring                | `ring` + `label` + `sheet` + `bar`              | Built-in           |
| Dividing cells ringed, chip                                     | `photo` + `ring` + `label`                      | Built-in           |
| Karyotype, pair numbers, mother and father marks, X and Y       | `image` + `label` on points + `ring`            | Built-in           |
| Zoom into chromosome 1, helix, 2 nm marker                      | `zoom` + `into` + `helix` + `measure`           | Built-in           |
| Base tiles turn into the HBB sequence                           | `bases`, then a state change `$legend: { seq }` | Built-in           |
| Question card, building blocks, credits                         | `title`, `row` of tiles, generated credits      | Built-in           |

Beyond episode 1, the series needs (from `prototypes/manim/SERIES.md`): `table` (Chargaff, codons, VCF fields),
`strand` with 5' and 3' ends and `reverse` / `complement` state changes, `flow` (central dogma), `punnett` and
`pedigree`, `pileup`, `ruler` for coordinates, `chart` for allele frequencies. Diffraction patterns and Griffith's
mice start as custom components. None needs a format change; all are catalog entries.

Honest limits: 3D molecules only as pre-rendered clips; unrelated shapes cross-fade instead of morphing (spike 005);
no themes or styles beyond one until needed.

## 4. Options compared

|                                              | A. Plain YAML                    | B. Quoted YAML        | **C. Markdown + scene block**                                          | D. Inline directives                             |
| -------------------------------------------- | -------------------------------- | --------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| Overhead tokens (two scenes)                 | 398                              | 414                   | **338**                                                                | 220                                              |
| Breaks on real narration                     | 11% of lines, one class silently | No (if always quoted) | **No**                                                                 | No                                               |
| Cue can mismatch its phrase                  | Yes (caught by `check`)          | Yes (caught)          | **Yes (caught)**                                                       | No                                               |
| Structured steps                             | Native                           | Native                | **Native (YAML block)**                                                | Attribute strings                                |
| Reads as a script for review and translation | Poor                             | Poor                  | **Good**                                                               | Noisy                                            |
| Parser we own                                | None                             | None                  | **A line-based splitter (headings, paragraphs, `>` lines, one fence)** | A directive grammar and attribute mini-languages |
| Known to agents                              | Very                             | Very                  | **Very (Markdown, YAML)**                                              | Moderately (remark directives)                   |

## 5. Recommendation

Adopt **C: Lucent Markdown** (`*.lucent.md`), and revise ADR 0002 accordingly.

````markdown
---
lucent: 0
title: Where the instructions live
voice: kokoro/am_fenrir
subtitles: [en, es]
colors: { dna: "#1F8FC4", A: "#1B9E77", C: "#2C6FB7", G: "#D98B1C", T: "#C8463D" }
assets: assets/images.yaml
---

## blood

But not every cell has a nucleus. This is a drop of human blood, smeared thin and stained.
> es: Pero no todas las células tienen núcleo. Esto es una gota de sangre humana, extendida y teñida.

These pale discs are [red blood cells]. Look for a purple dot inside them and you won't find one.
> es: Estos discos pálidos son glóbulos rojos. Buscá un punto violeta adentro y no vas a encontrar ninguno.

Your body has roughly [thirty trillion] cells, and more than eighty percent of them are red blood cells.
> es: Tu cuerpo tiene unos treinta billones de células, y más del ochenta por ciento son glóbulos rojos.

It's reading cells like the one in the middle. A [white blood cell]. Rare in blood, but it kept its nucleus.
> es: Está leyendo células como la del medio: un glóbulo blanco. Escaso en la sangre, pero conserva su núcleo.

```scene
do:
  - photo: blood
    focus: wbc
    drift: slow
  - at: red blood cells
    ring: [$blood/rbc_1, $blood/rbc_2]
    label: no nucleus
  - at: thirty trillion
    id: census
    sheet:
      - text: "≈ 30 trillion cells in a human body"
      - bar: { share: 0.84, label: red blood cells, rest: every other cell }
      - note: "Sender, Fuchs & Milo, PLoS Biology, 2016"
  - at: white blood cell
    hide: $census
  - at: with
    ring: $blood/wbc
    label: white blood cell · nucleus kept
```
````

Rules:

- **Frontmatter** (YAML): video settings, colours, asset manifest path.
- **`## id`** starts a scene. Ids are `[a-z0-9-]+`.
- **A paragraph is one spoken sentence group** in the first `subtitles` language, and the unit of voice caching.
  `[phrase]` marks a cue. `(pause 1.5s)` alone on a line is a pause.
- **`> es: text`** directly after a paragraph is its translation for each extra subtitle language, always with the
  language prefix.
- **One ` ```scene ` block per scene**: optional `keep`, `enter`, `layout`, and the `do` list. One verb per step,
  unknown keys are errors (ADR 0002).
- **No inline YAML comments inside scene blocks.** A ` #` after a value is error E103 with the fix ("quote the
  value"), which turns section 3.2's silent truncation into a loud, one-line error. Full-line comments are allowed.
- **Image points** live in the asset manifest as `name: [u, v, r]`: `u` and `v` are fractions of the image width and
  height, `r` a fraction of the image's shorter side, so points survive any rescale or crop (spike 004).
- **Parsing**: a line-based splitter we own (about 100 lines) for the Markdown subset, so every node keeps an exact
  line and column; the `yaml` package for frontmatter and scene blocks. No general Markdown parser is needed.

## 6. Risks and unknowns

- **Cue drift.** An agent rewrites a sentence and drops the bracketed phrase that a step references. `check`
  catches it (E204, with the closest phrase), at the cost of one iteration. Spike 007's agent test should measure how
  often this happens.
- **Repeated phrases.** A cue phrase appearing twice in a scene is ambiguous. Rule: it must be unique within the
  scene, or written `[phrase|id]` with an explicit id.
- **Markdown tooling.** Formatters with prose wrapping could merge a `>` line into the paragraph. Our splitter treats
  a line starting with `> xx:` as a translation regardless, and `lucent fmt` normalises files.
- **Direction far from its words.** In long scenes the reader must match `at:` phrases to paragraphs by eye. The
  timeline summary from `check` shows each cue with its time, which mitigates this.
- **Unmeasured:** how well agents write this format on the first try. That is the fresh-agent test in spike 007.

## 7. Sources

- manim-voiceover, bookmark example and tracker: https://github.com/ManimCommunity/manim-voiceover (examples/bookmark-example.py, src/manim_voiceover/tracker.py, services/base.py), version 0.4.0 on PyPI (2026-06-14)
- manim-voiceover documentation: https://voiceover.manim.community
- SSML 1.1, `mark` element: https://www.w3.org/TR/speech-synthesis11/#S3.3.2
- YAML 1.2.2 specification (plain scalars, comments): https://yaml.org/spec/1.2.2/
- `yaml` npm package 2.9.1: https://eemeli.org/yaml/
- Motion Canvas time events: https://motioncanvas.io/docs/time-events
- Slidev syntax (frontmatter per slide): https://sli.dev/guide/syntax
- Fountain screenplay format: https://fountain.io
- Lucent v0.1 draft (owner-provided, not in the repository)

## Appendix: experiment details

Files in the session scratchpad, `research/001/`:

- `probe.mjs`: YAML edge cases and parse timing (`yaml` 2.9.1, Node 24.21).
- `yaml_plain.yaml`, `yaml_quoted.yaml`, `md_fenced.md`, `md_inline.md`: the four encodings of the same two scenes.
- `manim_code.py` + `manim_script.md`: the prototype's code for the same scenes (`scene.py` lines 339 to 371 and 440
  to 508) and their script segments.
- Token counts: `tiktoken` `o200k_base` via `uvx --with tiktoken`. Narration tokens were counted on the EN and ES
  text with cue brackets removed, and subtracted from each total to get the overhead.
- Narration breakage: every `EN:` and `ES:` line of `prototypes/manim/episodes/ep01_where_the_instructions_live/script.md`
  checked for `: `, a trailing `:`, ` #` and YAML indicator characters at the start.
