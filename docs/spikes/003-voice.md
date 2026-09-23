# Spike 003: Voice and word timings

| | |
|---|---|
| Status | Complete |
| Date | 2026-09-23 |
| Question | How should Lucent produce narration audio with word-level timings locally, fast, and with licences compatible with an open source tool? |
| Informs | ADR 0004 (voice sidecar), ADR 0005 (narration-driven timing) |
| Machine | Apple M5 Pro (15 CPU cores: 5 performance, 10 efficiency), 24 GB, macOS 26.4.1, Python 3.13, kokoro 0.9.4, misaki 0.9.4, torch 2.14.0, onnxruntime 1.30.0 |

## 1. Question and why it matters

Narration drives time (ADR 0005): every cue phrase resolves to a word start, so the voice step must return **word
timings**, not just audio. The budgets in `docs/goals.md` that depend on it:

- An edited sentence is re-voiced in under 3 s, in the background, and the preview snaps to real timing.
- `check` never waits for voice.
- Local first: no network once models are installed.
- The licences must allow Lucent to be distributed as open source.

Sub-questions: how fast is Kokoro here, cold and warm? How do its timestamps map to words, and how accurate are they?
Can timings be produced without Python, which is the open question in ADR 0004? What do phonemisation and its licences
imply for distribution? How are pronunciations fixed, and how should the sidecar cache and parallelise?

## 2. Method

All experiments ran in a throwaway uv project in the session scratchpad. Nothing in Lucent was built.

1. **Speed.** `KPipeline(lang_code="a")` with voice `am_fenrir` on CPU and on MPS: import time, model load time, the
   first call, and four real narration sentences (5.7 to 10.9 s of audio each). Then torch thread counts of 1, 4, 8
   and 15, and three processes running in parallel.
2. **Token mapping.** Token dumps for contractions, digits, domain terms, a 22 s paragraph, a text long enough to
   split into chunks, and inline phoneme overrides.
3. **Accuracy.** Kokoro word starts compared with faster-whisper `small.en` word timestamps (int8, CPU) on four clips,
   matching words by normalised text.
4. **ONNX.** Inspected the graph of `onnx-community/Kokoro-82M-v1.0-ONNX` and searched for the duration tensor. Added
   it as an extra graph output, then compared it with PyTorch's `pred_dur` on identical input ids and style vector.
   Timed onnxruntime on CPU.
5. **Licences.** Read package metadata and licence files: kokoro, misaki, phonemizer-fork, espeakng-loader, kokoro-js,
   phonemizer.js, Homebrew espeak-ng, the Kokoro model card, Piper, MFA, faster-whisper.
6. **Dictionary coverage.** Ran misaki's G2P with no espeak fallback over every English line of the prototype scripts
   (67 lines, 1,666 words) plus five domain sentences, and counted the words it could not pronounce.

## 3. Findings

**F1. Kokoro on CPU is about 11 to 12 times faster than real time. MPS is slower.** Measured, single process, warm:

| Device | RTF, 4 sentences | Import | Model load | First call | RSS |
|---|---|---|---|---|---|
| CPU | 0.087 to 0.095 | 1.72 s | 2.40 s | 0.61 s | 2,439 MB |
| MPS | 0.107 to 0.244 | 2.23 s | 2.73 s | 6.37 s | 918 MB |

RTF is synthesis time divided by audio duration. A 10.9 s sentence took 0.95 s on CPU (measured). MPS is slower for
short sentences and costs 6.4 s on the first call, so **use CPU**.

**F2. Warm, one edited sentence re-voices in about 0.5 to 1 s. Cold, it takes about 3.4 s, which misses the budget.**
With `HF_HUB_OFFLINE=1` and a warm cache, a cold start was 1.53 s import, 1.70 s load and 0.14 s first call:
3.4 s before the first sentence starts (measured). The 3 s budget therefore needs a **warm sidecar**, as ADR 0004
already says. Warm synthesis of a 5.7 to 10.9 s sentence took 0.50 to 0.95 s (measured).

**F3. Threads saturate at 4. Parallel processes add throughput but cost memory.** Measured, 24.6 s of audio over
4 sentences:

| Setup | Wall time | RTF | Throughput |
|---|---|---|---|
| 1 process, 1 thread | 3.50 s | 0.143 | 7x real time |
| 1 process, 4 threads | 2.08 s | 0.085 | 12x |
| 1 process, 15 threads | 2.00 s | 0.081 | 12x |
| 3 processes x 5 threads | 3.03 to 3.46 s each, 73.7 s of audio in total | 0.123 to 0.141 each | 21x combined |

A full 6-minute episode voiced from scratch takes about 30 s with one warm process, or about 17 s with three
(estimated from the measured RTF). Each process holds about 2.4 GB (measured with PyTorch), so a pool is only for
first-time voicing of whole episodes.

**F4. Tokens are the source words, with timestamps in seconds. The sidecar has to handle three quirks.** Measured on
five texts, 157 tokens, none without a timestamp:

- **Contractions** are one token: `won't[0.325-0.588]`, `That's`, `isn't`. Good for cue matching.
- **Digits** stay one token that spans every spoken word: `1944[0.325-1.6]`, `249[2.013-3.337]`,
  `166011234[6.325-10.725]`. A cue can start at the number but not in the middle of it. Narration already spells
  numbers out (SERIES.md voice rules), and then every spoken word gets its own token.
- **Punctuation** gets its own tokens with timings (`.[1.175-1.25]`). Cue matching must skip them.
- **Chunks restart at zero.** Text longer than about 510 phonemes is split into chunks, and each chunk's timestamps
  start again at 0 (measured: a repeated sentence split into 2 chunks, both starting at 0.175 s). The sidecar must add
  each chunk's offset. The prototype never hit this because each line was synthesised on its own.

**F5. The timings match an independent aligner within the 150 ms target, except for one number.** Kokoro word starts
compared with faster-whisper word timestamps, measured on 110 matched words:

- Median absolute difference 33 ms, p90 125 ms, maximum 497 ms.
- The maximum is `million` after the digit token `249`. Whisper's timestamps around digits are known to be loose, so
  it is unclear which side is wrong.
- Whisper also puts every clip's first word at 0.0 s. Excluding those, per-clip means were 44 to 47 ms on prose and
  124 ms on the number-heavy clip.

Kokoro's timestamps are not an estimate made after the fact. They come from the durations the model uses to generate
the audio (`pred_dur` frames of 600 samples at 24 kHz; `join_timestamps` in `kokoro/pipeline.py`). They are exact for
the generated audio, up to where a token boundary falls.

**F6. The ONNX export hides the durations, but they can be exposed exactly with a one-line graph change.** The
published `onnx-community/Kokoro-82M-v1.0-ONNX` has one output, `waveform` (inputs `input_ids`, `style`, `speed`).
Inside the graph there is a single `/encoder/Round -> /encoder/Clip -> /encoder/Cast` chain, which is `pred_dur`.
Appending `/encoder/Cast_output_0` as a graph output, measured:

| Variant | Durations vs PyTorch | Warm synthesis, 6.3 s sentence |
|---|---|---|
| `model.onnx` (fp32, 310 MB) | Identical: 99 of 99 phonemes, max difference 0 frames | 0.67 to 0.75 s (RTF 0.107 to 0.119) |
| `model_quantized.onnx` | Max difference 1 frame (25 ms), total 254 against 252 frames | 2.37 s |

onnxruntime session load takes about 0.2 s (measured), against 1.7 s for the PyTorch model. With the patched fp32
graph, **word timings no longer require PyTorch**. `kokoro-js` does not expose durations: no `pred_dur` or
duration symbol exists in its bundle.

**F7. PyTorch can leave now. Python cannot, because of phonemisation.** Kokoro takes phonemes, not text. Its G2P is
misaki, which combines:
- 90,201 gold and 93,361 silver dictionary entries
- number and acronym rules
- spaCy part-of-speech tags to choose between heteronyms: `read` has 5 entries by POS, `live` has 2
- espeak-ng as a fallback for words outside the dictionaries

With misaki plus onnxruntime and no PyTorch, a cold start was 0.7 s import, 2.1 s load (about 1.2 s of it is spaCy,
measured separately) and 0.77 s for the first sentence. RSS was 1.0 GB instead of 2.4 GB, and the install drops
`torch` (553 MB on disk). All measured. Cold start barely improves, because G2P setup dominates it; the warm sidecar is
still needed.

A Node-only path needs a TypeScript G2P. Two options:
- **Port misaki.** Its dictionaries are Apache-2.0 JSON, about 6 MB for US English. `en.py` is 712 lines, and it needs
  a POS tagger. Estimated 2 to 4 days to reach parity.
- **Use `phonemizer` for npm.** This is what kokoro-js uses: espeak-ng compiled to WebAssembly. Pronunciation quality
  is lower than misaki's gold dictionaries (not measured). There is also a licence problem; see F8.

**F8. Licences: the models and misaki are permissive; everything espeak-ng is GPL-3.0.** Verified from package
metadata and licence files:

| Component | Licence | Role |
|---|---|---|
| Kokoro-82M weights | Apache-2.0 (model card; trained on permissive, public domain and CC BY audio) | Model |
| kokoro (Python) | Apache-2.0 | Pipeline |
| misaki | Apache-2.0 | G2P |
| spaCy, `en_core_web_sm` | MIT | POS tagging inside misaki |
| num2words | LGPL | Imported by misaki to spell out numbers; acceptable as an unmodified, replaceable library |
| onnxruntime | MIT | Inference |
| phonemizer-fork (Python) | GPL-3.0-or-later | Imported in-process by misaki's espeak fallback |
| espeak-ng (Homebrew 1.52.0) and the copy bundled by `espeakng-loader` | GPL-3.0-or-later | Fallback G2P |
| `phonemizer` (npm 1.2.1) | Declared Apache-2.0, but it bundles espeak-ng compiled to WebAssembly, which is GPL-3.0 | kokoro-js G2P |
| kokoro-js | Apache-2.0, depends on the above | Rejected in ADR 0004 |
| Piper (`OHF-Voice/piper1-gpl`, active) | GPL-3.0. The MIT `rhasspy/piper` is archived | Alternative TTS |

The practical line (not legal advice):
- Lucent must not **link or bundle** GPL code in its default distribution. That covers importing phonemizer in the
  same Python process and shipping the npm `phonemizer` wasm.
- Running a separately installed `espeak-ng` binary as an optional **subprocess** is generally treated as aggregation,
  not a derivative work.
- As installed today, `kokoro` requires `misaki[en]`, and that extra pulls in phonemizer-fork and espeakng-loader
  together with spaCy and num2words (verified from package metadata). `misaki.en` itself imports only spaCy and
  num2words, so the sidecar should depend on `misaki`, `spacy` and `num2words` directly, not on `kokoro` or the
  `misaki[en]` extra, and call espeak-ng itself only when the user opts in.

**F9. Without espeak, 0.8% of words are unpronounceable, and the gap can be closed with the lexicon.** Measured with
misaki and no fallback, over 1,666 words:
- 13 words were unresolved: `Oswald`, `Avery` (3 times), `Rockefeller`, `Martha`, `magnified`, `Erwin`, `Chargaff`
  (3 times), `Halden`, `Phred`.
- Domain acronyms resolved on their own: `SCN1A` became "S C N one A", and `GRCh38` became "G R C H thirty eight".

When KPipeline has no fallback it **silently skips** unknown words ("OOD words will be skipped"). The sidecar must
report them instead. `check` can then raise an error, for example `W206 blood.say[2] "Chargaff" not in dictionary;
fix: add lexicon: { Chargaff: ... }`, turning a silent audio defect into a 30-token fix.

**F10. Pronunciation overrides work inline, and cue matching is unaffected.**
- misaki accepts `[word](/phonemes/)`. The token keeps its original text (`HeLa`) and gets the override phonemes, so
  cues and subtitles still match the written word.
- A Lucent `lexicon: { HeLa: "/hˈilə/" }` can be applied by rewriting each occurrence into this syntax before G2P.
  Lexicon entries belong in the cache key.
- One caution, measured: the default for `HeLa` (`hˌilˌɑ`, transcribed by whisper as "Hila") was already right, and a
  wrong override (`hˈɛlə`) made it worse ("Hella"). Overrides should be heard in preview before they are accepted.
- Separately, `chr2` was read as "C H R two": raw identifiers do not belong in narration.

**F11. The environment is fragile in two places, and both break local first.**
- `espeakng-loader` 0.2.4's bundled espeak-ng aborts the process on macOS arm64. It looks for its data at a
  hard-coded CI path (`/Users/runner/work/.../phontab`), and `ESPEAK_DATA_PATH` did not help. Measured. It worked only
  after pointing phonemizer at Homebrew's espeak-ng.
- The first `KPipeline` run **downloads `en_core_web_sm` with pip at run time**. `HF_HUB_OFFLINE=1` works once the
  model is cached.

Both argue for a sidecar with pinned, vendored dependencies, installed by `lucent voices install` and verified offline.

## 4. Options compared

| Option | Word timings | Cold start (first sentence) | Warm RTF | Memory | Install weight | GPL exposure | Python |
|---|---|---|---|---|---|---|---|
| A. Kokoro PyTorch (KPipeline) in a Python sidecar | Yes, native | 3.4 s (measured) | 0.08 to 0.09 (measured) | 2.4 GB | torch 553 MB | In-process phonemizer unless removed | Yes |
| **B. misaki plus Kokoro ONNX with `pred_dur` exposed, Python sidecar** | **Yes, identical to A (fp32)** | **3.6 s (measured)** | **0.11 to 0.12 (measured)** | **1.0 GB** | **onnxruntime 77 MB plus model 310 MB** | **None by default; espeak opt-in by subprocess** | **Yes, small** |
| C. TypeScript G2P port plus `onnxruntime-node` plus patched ONNX | Yes | About 0.5 s (estimated) | About 0.11 (estimated, same runtime) | About 0.5 GB (estimated) | Model plus dictionaries | None | No |
| D. kokoro-js (phonemizer.js plus transformers.js) | No | About 1 s (estimated) | Not measured | Not measured | Small | GPL wasm bundled | No |
| E. kokoro-js plus whisper forced alignment | Approximate (F5: p90 125 ms) | Several seconds (estimated) | Slower (two models) | High | Two models | Same as D | No |
| F. Piper | Phoneme alignments available (not verified here) | Not measured | Not measured | Small | Small | GPL-3.0 (active fork) | Optional |

For recorded human narration, one path is optional forced alignment: faster-whisper (MIT) with word timestamps,
mapped to the script words by sequence alignment, or the Montreal Forced Aligner (MIT, more precise, heavier). The
sidecar contract already fits this: audio plus script in, word timings out.

## 5. Recommendation

1. **Keep a Python sidecar for now (ADR 0004 stands), but change what is inside it to option B:** misaki plus
   onnxruntime plus the fp32 Kokoro ONNX graph, patched once at install to output `/encoder/Cast_output_0`.
   - It drops PyTorch: 2.4 GB of memory becomes 1.0 GB, and the install loses 553 MB.
   - Durations stay identical (F6).
   - Depend on `misaki`, `spacy` and `num2words` directly, not on `kokoro` or `misaki[en]`, so no GPL code runs
     in-process (F8).
2. **Make the sidecar warm and addressable.** It is one long-lived process that speaks JSON lines over stdio:
   - Request: `{id, text, voice, speed, lexicon}`.
   - Response: `{id, wav, duration, words: [{text, start, end}], ood: [...]}`.
   - Words exclude punctuation, and chunk offsets are already added (F4).
   - Use one process with 4 threads by default (F3). A pool of up to 3 processes is only for first-time voicing of a
     whole video.
3. **Cache key:** a SHA-256 over:
   - the engine version and the model file hash
   - the voice, the speed, and the lexicon entries that occur in the text
   - the normalised text
   Store the wav plus a JSON of word timings. Tokens that are only punctuation are omitted.
4. **Unknown words are errors, not silence (F9).**
   - The sidecar returns `ood`, and `check` reports each unknown word with a lexicon fix.
   - espeak-ng is an optional fallback: detect a system binary, call it as a subprocess, and record which words used
     it.
5. **ADR 0005 changes:**
   - Cues resolve against word tokens with punctuation skipped.
   - A cue phrase must start on a word token. A phrase inside a digit token is error E205, with the fix "spell the
     number out".
   - Keep the 150 ms target: measured agreement is 33 ms median and 125 ms p90 (F5).
6. **Plan the Python exit as a later milestone (option C), not now.** It needs a TypeScript port of misaki, estimated
   at 2 to 4 days plus a POS tagger. The ONNX graph and the durations are already solved (F6). Once G2P is ported,
   Python leaves Lucent.

## 6. Risks and unknowns

- **G2P quality in a future TypeScript port** is unmeasured. Heteronyms need POS tagging, which is where a naive
  dictionary lookup fails.
- **The patched ONNX graph** relies on the node name `/encoder/Cast`. A new export could rename it. Guard it with a test
  that compares durations against a stored fixture.
- **Accuracy around numbers:** one 497 ms disagreement (F5). The ground truth was not established, because nobody
  listened. The spelled-out-numbers rule avoids it in practice.
- **Linux and Windows** speed and the espeak packaging were not measured.
- **Kokoro voices** are stored as `.pt` tensors. Option B converts them to `.npy` once at install. The onnx-community
  repository also ships `.bin` voices, which were not verified here.
- **Licence conclusions** are an engineering reading of the licence files, not legal advice.
- **Spanish narration** (`lang_code="e"`) uses espeak-ng for G2P in Kokoro, which makes GPL unavoidable for a
  non-English voice unless another G2P is found. Lucent currently voices only English.

## 7. Sources

- Kokoro model card and licence: https://huggingface.co/hexgrad/Kokoro-82M
- Kokoro ONNX export: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
- kokoro (Python) source, `pipeline.py` `join_timestamps`, `model.py` `pred_dur`: https://github.com/hexgrad/kokoro
- misaki (Apache-2.0): https://github.com/hexgrad/misaki
- kokoro-js 1.2.1 and phonemizer 1.2.1 on npm: https://www.npmjs.com/package/kokoro-js, https://www.npmjs.com/package/phonemizer
- kokoro-onnx (MIT): https://github.com/thewh1teagle/kokoro-onnx
- espeak-ng (GPL-3.0-or-later): https://github.com/espeak-ng/espeak-ng
- Piper, active GPL fork: https://github.com/OHF-Voice/piper1-gpl; archived MIT original: https://github.com/rhasspy/piper
- faster-whisper (MIT): https://github.com/SYSTRAN/faster-whisper
- Montreal Forced Aligner (MIT): https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner

## Appendix: experiment details

Scripts are in the session scratchpad (`research/003/`) and are not part of Lucent. Here is enough detail to
reproduce them.

**Environment workaround.** Before importing `kokoro`, point phonemizer at Homebrew's espeak-ng, because the
`espeakng-loader` 0.2.4 bundle aborts (F11):

```python
from misaki import espeak  # sets the bundled loader paths first
from phonemizer.backend.espeak.wrapper import EspeakWrapper
EspeakWrapper.set_library("/opt/homebrew/lib/libespeak-ng.dylib")
EspeakWrapper.set_data_path("/opt/homebrew/share/espeak-ng-data")
```

**Exposing durations from the ONNX graph:**

```python
import onnx
m = onnx.load("model.onnx")
m.graph.output.append(onnx.helper.make_tensor_value_info("/encoder/Cast_output_0", onnx.TensorProto.INT64, None))
onnx.save(m, "patched_model.onnx")
# run: wav, durations = session.run(None, {"input_ids": ids, "style": pack[len(phonemes) - 1], "speed": [1.0]})
# ids = [0] + [vocab[c] for c in phonemes] + [0]; each duration frame is 600 samples at 24 kHz (1/40 s)
```

Word timestamps from durations follow Kokoro's `join_timestamps`:
- Walk the tokens, and sum the durations of each token's phonemes plus a following space when `whitespace` is set.
- The first frame belongs to the BOS token.
- Kokoro divides by 80 in half-frame units, which is equivalent to 40 frames per second.

**Accuracy comparison.**
- faster-whisper 1.2.1, `small.en`, int8, CPU, `word_timestamps=True`. The model download and load took 105 s the
  first time.
- Words were normalised to `[a-z0-9']` and matched greedily within a 3-token window.
- 110 matches over the `contractions`, `long` and `numbers` clips. The `lexicon` clip matched no words, because whisper
  transcribed the overridden names differently ("Hella sells an ...").

**Sentences used for speed tests** (from the Halden episode 1 script):
1. "These pale discs are red blood cells. Look for a purple dot inside them and you won't find one."
2. "Chromosome one, the largest, is about two hundred and forty-nine million units long."
3. "Your body has roughly thirty trillion cells, and more than eighty percent of them are red blood cells. Counted
   one by one, most of your cells carry no DNA at all."
4. "In nineteen forty-four, an experiment with bacteria gave the first hard evidence that they were wrong. That's
   where we go next."
