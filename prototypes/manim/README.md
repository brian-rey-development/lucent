# Halden lessons (Manim prototype)

Frozen reference, moved from the Halden Genomics repository's `lessons/` folder on 2026-09-23. It produced episode 1
and is the quality bar and first customer for Lucent (see the repository README). It is not developed further.

Narrated, animated lessons on the biology and engineering behind Halden Genomics. Real
micrographs anchor what is real; animation explains mechanisms no photo can show.

Separate uv project, excluded from the product workspace: Manim and Kokoro (torch) never
touch the product's CI or images.

## Render an episode

```bash
cd prototypes/manim
uv sync
uv run halden-lesson fetch-assets                  # download licensed images, regenerate credits
uv run halden-lesson render ep01_where_the_instructions_live --quality low    # fast preview
uv run halden-lesson render ep01_where_the_instructions_live                  # 1080p
```

Output: `output/<episode>.mp4` with an English (default) and a Spanish subtitle track, plus
the `.srt` files next to it. Nothing is burned into the frame.

System dependencies: `brew install ffmpeg espeak-ng pkgconf` (Cairo and Pango come with Manim's
dependencies on macOS via Homebrew).

## How an episode is built

```
episodes/<episode>/
  script.md     # the source of truth: EN narration, ES subtitle, visual note per segment
  scene.py      # Manim scene; every animation syncs to a spoken line via narrate()/wait_for_line()
```

- **Voice**: Kokoro-82M, voice `am_fenrir`, synthesized per line and cached by content hash in
  `output/media/voice/`. Editing one sentence re-synthesizes only that sentence.
- **Sync**: `with self.narrate("segment") as n:` schedules the audio; `n.wait_for_line(i, fraction)`
  holds the animation until that point in the speech. Subtitle cues come from the real clip lengths.
- **Images**: `assets/images.toml` lists Wikimedia Commons files. `fetch-assets` accepts only
  public domain, CC0 and CC BY / BY-SA, and writes `assets/CREDITS.md` and `assets/credits.json`.
  Credits appear on screen on each photo and at the end of the episode.

## Style rules

- Story and stakes before facts; a question before every answer; evidence before conclusions.
- One idea per segment. Continuity over cuts: shapes turn into the next idea.
- Colour always means the same thing: A green, C blue, G orange, T red, DNA cyan.
- Real photos for what is real, captioned with what they actually show (check the file's
  description, not just its title).
- Every factual claim is checked and noted at the bottom of `script.md`.
