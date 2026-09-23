# Lucent Markdown

A video is one `*.lucent.md` file: YAML frontmatter, then scenes. `lucent catalog` lists the verbs,
`lucent catalog --codes` the diagnostics.

## Frontmatter

```yaml
---
lucent: 0
title: Where the instructions live
voice: kokoro/am_fenrir
subtitles: [en, es]
colors: { dna: "#1F8FC4" }
assets: assets/images.yaml
---
```

The first four keys are required. The first subtitle language is spoken; each other one needs a
translation per paragraph. `colors` names values for `color:` props; quote hex. `assets` is the
manifest path, inside the video's folder.

## Scenes

````markdown
## molecule

Each chromosome is one molecule. [Zoom in] far.
> es: Cada cromosoma es una molécula. Hacé zoom.

(pause 1.5s)

```scene
keep: $karyotype
do:
  - at: Zoom in
    zoom: $karyotype/chr1
```
````

- `## id` starts a scene. Every id (scenes, elements, cues, assets, points) matches
  `[a-z][a-z0-9_-]*`; scene ids are unique. Other headings are errors.
- A paragraph is consecutive text lines, spoken as one clip.
- `[phrase]` or `[phrase|id]` marks a cue, unique per scene.
- `> es: text` after a paragraph translates it.
- `(pause 1.5s)` adds silence, up to 60 s.
- `<!-- comments -->` are ignored anywhere.
- One ` ```scene ` block per scene.

Narration is spoken as written: spell numbers and units ("forty-six microns").

## Scene block

- `keep`: `$id` or a list, carried over from the previous scene.
- `enter`: `fade|cut`. `layout`: `stack|row|split`.
- `do`: steps in order, each with one verb plus modifiers:
  - `at: cue` starts it on the cue's phrase, or its id for `[phrase|id]`. `at: with` starts it with
    the previous step; no `at` follows it.
  - `id: name` names the element `$name`. Photos and images default to their asset key, other verbs
    to the verb name.
  - `dur: fast|base|slow`, `enter: fade|cut`.
- `hide`, `focus` and `zoom` take only `at` and `dur`. Nested steps take only `id`.
- `$id` targets an element on screen, `$id/point` a point of its image.

A state change gives an element new props, animated. Verbs listing `change` in the catalog accept
one, with `at` and `dur` only:

```yaml
- at: order of those letters
  $legend: { seq: ATGGTG }
```

## Asset manifest

```yaml
blood:
  file: images/blood.jpg
  caption: Human blood smear
  credit: Author, license, source
  points:
    wbc: [0.46, 0.41, 0.145]
```

`file` is required, relative to the manifest, and must exist. A point is `[u, v, r]`: fractions of
the image width, height and shorter side.

## YAML rules

- Unknown keys are errors; the fix names the closest key.
- ` #` after a value starts a comment that can cut it: error E103. Quote the value or move the
  comment to its own line.
- No anchors, aliases, tags or directives: quote values starting with `*`, `&` or `!`.

## Diagnostics

`CODE [file:]line:column where message; fix: action`. `file` appears only for the manifest. `where`
is `scene.do[1].ring[0]`, `frontmatter.key`, `manifest.asset.key` or `document`. Errors (E) fail
`check`; warnings (W) do not.
