# 0004. Synthesise voice with Kokoro in a Python sidecar behind a file contract

- Status: Proposed (revised after spike 003)
- Date: 2026-09-23

## Context

Narration drives timing (ADR 0005), so the voice step must return **word timings**, not only audio. Verified on
2026-09-22: Kokoro-82M's Python `KPipeline` (voice `am_fenrir`) returns a start and end time per token. The owner
chose this voice by ear. Rendering must work offline.

## Options

| Option                                                          | For                                                      | Against                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| **Kokoro in a Python sidecar**                                  | Works today, word timings included, voice already chosen | A second runtime; PyTorch is large                                    |
| `kokoro-js` in Node                                             | One runtime                                              | No word timings; last release May 2025                                |
| `kokoro-js` plus forced alignment (whisper via transformers.js) | One runtime                                              | Two models, alignment errors on names and numbers, slower             |
| Kokoro ONNX in Node (`onnxruntime-node`)                        | One runtime, fast                                        | Unverified whether the export exposes the durations timings come from |
| Cloud TTS                                                       | High quality                                             | Not local, costs money, breaks offline rendering                      |

## Decision

A small, long-lived Python process, `lucent-voice`, speaking JSON lines over stdio. It is built from misaki (Apache-2.0,
text to phonemes), spaCy, num2words and onnxruntime running Kokoro's **fp32 ONNX graph patched to expose the
predicted durations** (`/encoder/Cast_output_0`). It does not install PyTorch, the `kokoro` package or `misaki[en]`.

Spike 003 measured the patched graph against PyTorch: identical durations (0 frames of difference), memory from 2.4 GB
to 1.0 GB, 553 MB of PyTorch removed. Warm synthesis runs at 11 to 12x real time on CPU (an edited sentence in 0.5 to
1 s); MPS is slower than CPU; one process with 4 threads is the default.

Contract: a request carries sentences, voice, lexicon and output directory; the reply carries, per sentence, a wav
path, the duration, word timings with chunk offsets, and `ood`: words the phonemiser could not pronounce. Results are
cached by a hash of engine, voice, lexicon and sentence text. The TypeScript side validates replies with zod and knows
nothing about Kokoro.

espeak-ng (GPL-3.0) is never loaded in-process. It is an optional external program for words outside the dictionary.
Without it, those words come back in `ood`, and `check` reports each one with a lexicon fix instead of letting Kokoro
skip them silently (0.8% of words in spike 003, mostly proper names).

## Consequences

- Editing one sentence re-synthesises one sentence.
- `lucent check` never waits for the sidecar: cue phrases are validated against the text, and unvoiced sentences
  use an estimated duration until real timings arrive (ADR 0010).
- A cold start takes 3.4 s, over the 3 s budget, so the process stays warm inside the per-project background process
  (ADR 0010).
- Installation must fetch the spaCy model and voice files up front; the first run must never download anything
  (spike 003 found both a runtime pip download and an espeak crash on macOS arm64 in the stock packages).
- Any engine that honours the contract can replace Kokoro, including recorded human narration aligned afterwards.
- Installing Lucent requires uv as well as Node. The CLI checks both and explains what is missing.
- Python can leave later: the model already runs on onnxruntime (which has a Node binding); only misaki's
  text-to-phoneme step has no TypeScript equivalent. A port is estimated at 2 to 4 days.
