# Spike 006: Encoding, segments and caching

|          |                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status   | Complete                                                                                                                                                                                                         |
| Date     | 2026-09-23                                                                                                                                                                                                       |
| Question | How do raw frames become the final mp4 fast, with per-scene caching, correct audio and soft EN/ES subtitle tracks?                                                                                               |
| Informs  | ADR 0007 (scene segment cache), ADR 0008 (soft subtitle tracks)                                                                                                                                                  |
| Machine  | Apple M5 Pro (15 CPU cores: 5 performance, 10 efficiency; 16 GPU cores), 24 GB, macOS (Darwin 25.4.0), ffmpeg 8.1.2 (Homebrew, built with libx264, libvmaf, VideoToolbox, AudioToolbox; no libass), Node 24.21.0 |

Every number is marked **(measured)** or **(estimated)**. Measured numbers come from 10-second, 300-frame clips at
1080p30 and include ffmpeg start-up (about 0.05 to 0.1 s), so throughput figures are lower bounds for long scenes.

## 1. Question and why it matters

`docs/goals.md` sets a final-render budget of **0.25 s per video second** (a 6-minute episode in 90 s), which means
the whole path from drawn frame to finished file must sustain **at least 133 frames per second**, or at most 7.5 ms per
frame. Spike 002 measured Skia rasterisation at 0.64 ms per frame with 15 workers, so drawing is no longer the
bottleneck; encoding is. The same goals require that editing one scene re-renders only that scene (ADR 0007), and
ADR 0008 requires English and Spanish subtitles as soft tracks.

Five sub-questions:

1. Which encoder and settings meet the throughput budget at acceptable quality and size?
2. Can scenes be encoded as separate segments and joined without re-encoding, frame-exactly?
3. How should audio be built so it stays in sync across joined scenes?
4. What do players actually do with soft `mov_text` tracks, and what sidecars are needed?
5. What goes into a cache key, how fast is hashing, and how is the cache laid out and cleaned?

## 2. Method

Two synthetic sources, generated once as raw frames and piped to ffmpeg on stdin, exactly as the engine will:

- **photo**: the Halden blood-smear photo (3264x2448) with a slow push-in (`zoompan`), a moving red ring and a
  caption-chip rectangle. Every pixel changes every frame, like the `Photo` drift component.
- **flat**: paper-coloured background, a grid, two solid shapes moving. Stands in for diagrams and text.

Each source is 300 RGBA frames (2.49 GB), kept in the page cache (reading it costs 0.14 s, so disk is not measured).
Base command:

```
cat photo.rgba | ffmpeg -f rawvideo -pix_fmt rgba -s 1920x1080 -r 30 -i - <encoder args> out.mp4
```

Quality: VMAF (libvmaf, default model) and SSIM against the source, both converted to yuv420p the same way. CPU time
from `/usr/bin/time -p` (user plus sys, including `cat` and the pipe). Segment joins verified with `ffprobe`
(frame count, durations, timestamp steps, keyframe positions), `framemd5` equality and a full decode. Apple
playback verified with a small Swift program using AVFoundation (the framework behind QuickTime and Safari):
asset duration, tracks, legible media-selection options, and decoding every frame with `AVAssetReader`. Audio sync
measured by cross-correlating a decoded linear chirp (non-periodic, so alignment is unambiguous) against the source.
Hashing benchmarked in Node 24. Full commands are in the appendix.

## 3. Findings

### F1. Hardware H.264 (VideoToolbox) tops out at about 250 fps and does not scale with parallel sessions

| Encoder, source photo        | Wall for 300 frames | Throughput     | CPU per frame      |
| ---------------------------- | ------------------- | -------------- | ------------------ |
| `h264_videotoolbox`, RGBA in | 1.16 s              | 258 fps        | 6.3 ms (measured)  |
| `h264_videotoolbox`, NV12 in | 1.14 s              | 263 fps        | 1.3 ms (measured)  |
| `hevc_videotoolbox`, RGBA in | 1.25 s              | 240 fps        | 6.3 ms (measured)  |
| `libx264 veryfast`, RGBA in  | 0.89 to 0.98 s      | 306 to 337 fps | 17.5 ms (measured) |
| `libx264 veryfast`, NV12 in  | 0.53 s              | 565 fps        | 16.3 ms (measured) |
| `libx264 medium`, RGBA in    | 1.64 s              | 183 fps        | 60.4 ms (measured) |

Parallel VideoToolbox sessions share one hardware engine: 1, 2, 3 and 4 concurrent encodes gave 250, 262, 266 and
268 fps in aggregate (measured). Parallel x264 encodes scale with cores: 3 concurrent gave 792 fps (measured).

Under full CPU load (15 busy loops standing in for rasteriser workers), one VideoToolbox encode fell to 215 fps and
one x264 veryfast encode to 323 fps (measured). x264 is still faster, because on this chip it has 15 cores and
VideoToolbox has one engine.

### F2. VideoToolbox constant-quality mode fails on flat graphics

`-q:v` (constant quality) starves flat content of bits:

| Setting                      | photo size / VMAF  | flat size / VMAF               |
| ---------------------------- | ------------------ | ------------------------------ |
| VT `-q:v 65`                 | 1.38 MB / 92.1     | 53 KB / **78.0** (every frame) |
| VT `-q:v 75`                 | 2.78 MB / 95.1     | 59 KB / 90.4                   |
| VT `-q:v 85`                 | 8.21 MB / 96.7     | 121 KB / 96.6                  |
| VT `-b:v 6M -g 60`           | 5.25 MB / 96.2     | 44 KB / 98.5                   |
| VT `-b:v 8M -g 60`           | 6.71 MB / 96.4     | 47 KB / 97.9                   |
| x264 veryfast CRF 18 `-g 60` | **1.60 MB / 95.1** | 39 KB / 96.4                   |
| x264 veryfast CRF 16 `-g 60` | 2.29 MB / 95.8     | 37 KB / 94.6                   |
| x264 faster CRF 18 `-g 60`   | 2.46 MB / 96.0     | 37 KB / 94.9                   |
| x264 faster CRF 16 `-g 60`   | 3.26 MB / 96.3     | 38 KB / 97.0                   |
| VT HEVC `-q:v 75`            | 1.40 MB / 94.5     | not tested                     |

All measured, for 10 s of video. Flat-content VMAF scores vary by about 2 points between settings that look
equivalent, so treat anything above 94 as equivalent there. On photos, x264 veryfast reaches VMAF 95 at about a
quarter of the VideoToolbox size (1.60 MB against 5.25 to 6.71 MB). Extrapolated to a 6-minute photo-heavy episode:
about 58 MB with x264 veryfast CRF 18, about 190 to 240 MB with VideoToolbox 6 to 8 Mb/s (estimated).

VideoToolbox also defaults to a keyframe every 12 frames (measured with `ffprobe`); `-g 60` cut the flat clip from
104 KB to 47 KB.

### F3. Converting RGBA to YUV costs little; the pipe is fast enough

- One `cat | ffmpeg` pipe of RGBA sustains about 460 fps with no encoding (2.49 GB in 0.65 s, measured). NV12 (1.5
  bytes per pixel instead of 4) sustains about 1,360 fps (measured).
- ffmpeg's RGBA to yuv420p conversion cost 0.59 to 0.90 s of CPU for 300 frames, about 2 to 3 ms per frame, and
  added almost nothing to wall time (0.65 to 0.69 s, measured).
- Sending NV12 instead of RGBA saves about 1 ms of encoder wall time per frame with x264 (0.98 s to 0.53 s for 300
  frames, measured), but the engine would then have to convert on its own workers. Skia produces RGBA, and a
  JavaScript conversion would likely cost more than ffmpeg's SIMD code (estimated).

Conclusion: keep piping RGBA and let ffmpeg convert. Revisit only if profiling shows the ffmpeg process saturated.

### F4. Default conversion shifts every semantic colour; BT.709 must be explicit

ffmpeg converts RGB to YUV with the BT.601 matrix by default and writes no colour tags. HD players decode with
BT.709. Decoding solid frames as BT.709 (measured):

| Source colour          | Default, untagged | Explicit BT.709 and tagged |
| ---------------------- | ----------------- | -------------------------- |
| `#B4432F` accent       | `#BE4D2C`         | `#B3432F`                  |
| `#1F8FC4` DNA cyan     | `#1486C7`         | `#208FC5`                  |
| `#1B9E77` base A green | `#0F8F76`         | `#1A9D76`                  |

The default shifts the colours that the series uses to mean things (A is green, DNA is cyan). The fix:
`-vf scale=out_color_matrix=bt709:out_range=tv` plus `-colorspace bt709 -color_primaries bt709 -color_trc bt709
-color_range tv`.

### F5. Scene segments join frame-exactly with stream copy, with both encoders

Three segments of 97, 113 and 90 frames (deliberately uneven), encoded separately with identical settings and
`-video_track_timescale 15360`, joined with the concat demuxer and `-c copy` (all measured):

| Check                                                     | libx264 veryfast (B-frames on)           | h264_videotoolbox 8 Mb/s            |
| --------------------------------------------------------- | ---------------------------------------- | ----------------------------------- |
| Frames in joined file                                     | 300                                      | 300                                 |
| Duration                                                  | 10.000000 s                              | 10.000000 s                         |
| Timestamp step                                            | 0.03333 s everywhere, none non-monotonic | same                                |
| Keyframes                                                 | at frames 0, 97, 210                     | at every 12th frame plus 97 and 210 |
| Decoded frames identical to decoded segments (`framemd5`) | yes                                      | yes                                 |
| Full decode errors                                        | none                                     | none                                |
| AVFoundation (QuickTime/Safari stack)                     | playable, 300 frames decoded             | playable                            |

Joining 36 segments into a 6-minute file took 0.30 s (measured). Each segment starts on an IDR frame because each is
a fresh encoder session; x264's default closed GOP was enough.

### F6. Per-scene AAC drifts; one continuous audio track is exact

Design A put each scene's audio (a slice of a chirp) in its segment as AAC and joined with `-c copy`. Design B joined
the video first, then muxed one continuous WAV encoded once. Offsets of the decoded audio against the source
(measured):

| Design, encoder | At start | After join 1 | After join 2 | Gap at joins                 | Audio length vs video          |
| --------------- | -------- | ------------ | ------------ | ---------------------------- | ------------------------------ |
| A, `aac`        | +21.3 ms | +52.0 ms     | +82.7 ms     | silence (RMS 0.000 to 0.001) | +21 ms                         |
| A, `aac_at`     | +44.0 ms | +83.3 ms     | +37.4 ms     | silence at join 1            | +71 ms, video grew to 10.019 s |
| B, `aac`        | 0.00 ms  | 0.00 ms      | 0.00 ms      | none                         | +5 ms of tail padding          |
| B, `aac_at`     | 0.00 ms  | 0.00 ms      | 0.00 ms      | none                         | +25 ms of tail padding         |

Why: an AAC encoder prepends priming samples (encoder delay) and pads the last frame to 1,024 samples. A single file
records this in its edit list, but joining with stream copy keeps every segment's priming and padding. The error
accumulates at about 30 ms per join, so a 12-scene episode would drift by about a third of a second (estimated), well
past the 150 ms cue-accuracy limit in spike 001. Apple TN2258 documents the mechanism.

Audio encoding for a 6-minute track took 0.60 s with `aac_at` and 1.36 to 3.70 s with ffmpeg's `aac` (measured,
depending on sample rate). Final mux with two subtitle tracks and `+faststart` took 0.08 s for 55 MB (measured).

### F7. Soft subtitle tracks work, but "default" means different things in different players

The muxed file has `tx3g` (`mov_text`) tracks tagged `eng` and `spa`, and ffmpeg round-trips the Spanish text with
accents intact (measured). AVFoundation lists the options English, English Forced, Spanish and Spanish Forced, and
reports **"English Forced" as the default option regardless of the disposition flags** (measured with `default` on
English only, on both, and on neither). In Apple players, subtitles therefore stay off (forced-only) until the viewer
picks a language or has captions enabled in system settings. VLC and mpv are expected to honour the default flag
(not tested here).

Elsewhere:

- **Browsers**: `<video>` shows subtitles from `<track>` elements, which take WebVTT files. In-band `tx3g` tracks
  should be treated as unsupported in Chrome and Firefox (not tested here). `ffmpeg -i en.srt en.vtt` converts
  correctly (measured).
- **YouTube**: uploads accept SRT, VTT and other sidecar formats. Whether YouTube imports `tx3g` tracks from an
  uploaded MP4 is not documented (YouTube Help, checked 2026-09-23).

### F8. Hashing is not a bottleneck, and node:crypto is enough

| Implementation                        | Throughput | 1 MB photo | 60 s voice WAV (5.8 MB) | 26 KB compiled scene |
| ------------------------------------- | ---------- | ---------- | ----------------------- | -------------------- |
| `node:crypto` SHA-256                 | 2.49 GB/s  | 0.30 ms    | 1.65 ms                 | 0.008 ms             |
| `@napi-rs/blake-hash` BLAKE3 (native) | 2.56 GB/s  | 0.38 ms    | 2.23 ms                 | 0.011 ms             |
| `hash-wasm` BLAKE3 (WebAssembly)      | 1.19 GB/s  | 0.84 ms    | 4.87 ms                 | 0.023 ms             |
| `@noble/hashes` BLAKE3 (pure JS)      | 0.09 GB/s  | 11.2 ms    | 55.4 ms                 | 0.248 ms             |

All measured, single-threaded. On this CPU, SHA-256 uses hardware instructions and matches native BLAKE3, so a
dependency buys nothing. The `blake3` npm package (last release 2022) **fails to install**: it depends on
`blake3-wasm@2.1.7`, which is not published. `statSync` costs 1.1 µs per file (measured), so a size-and-mtime check
before hashing makes unchanged assets nearly free.

### F9. End to end, encoding is the bottleneck and still inside the budget

| Stage                                                 | Throughput                              | Source                     |
| ----------------------------------------------------- | --------------------------------------- | -------------------------- |
| Skia rasterisation, 15 workers                        | about 1,560 fps (0.64 ms per frame)     | Spike 002 (measured there) |
| RGBA pipe into ffmpeg                                 | about 460 fps per pipe                  | F3 (measured)              |
| VideoToolbox H.264                                    | about 250 fps, no scaling with sessions | F1 (measured)              |
| x264 veryfast, one encoder under full CPU load        | about 320 fps                           | F1 (measured)              |
| x264 veryfast, 3 scene encoders in parallel, idle CPU | about 790 fps                           | F1 (measured)              |
| **Budget**                                            | **133 fps**                             | goals.md                   |

With rasterisation and encoding sharing the CPU, the combined x264 path needs about 30 ms of CPU per frame (9.6 ms
rasterising, 17.5 ms encoding, 2 to 3 ms converting), or about 2 ms per frame across 15 cores: roughly 400 to 500 fps
(estimated). VideoToolbox is capped at about 250 fps. Either way a 6-minute episode (10,800 frames) takes an
estimated 25 to 45 s of frames plus about 1 s to encode audio, join and mux (measured parts). That is 0.07 to 0.13 s
per video second, against a budget of 0.25 s. Re-rendering one 30-second scene: about 3 s of frames plus 0.4 s to
join and mux (estimated).

## 4. Options compared

### Video encoder

| Option                                | Throughput                                       | CPU                       | Size for VMAF about 95 on photos | Flat content               | Portability            |
| ------------------------------------- | ------------------------------------------------ | ------------------------- | -------------------------------- | -------------------------- | ---------------------- |
| **libx264 veryfast, CRF 18, `-g 60`** | 306 to 565 fps each; scales with parallel scenes | 17.5 ms per frame         | **1.60 MB per 10 s**             | Good                       | Everywhere (Linux, CI) |
| libx264 faster, CRF 16 to 18          | Similar wall time, twice the CPU                 | about 29 ms per frame     | 2.46 to 3.26 MB                  | Good                       | Everywhere             |
| libx264 medium, CRF 18                | 183 fps                                          | 60 ms per frame           | 2.63 MB                          | Good                       | Everywhere             |
| h264_videotoolbox, 6 Mb/s, `-g 60`    | about 250 fps total, one engine                  | about 1 to 6 ms per frame | 5.25 MB                          | Good                       | Apple only             |
| h264_videotoolbox, `-q:v`             | about 250 fps                                    | same                      | 2.78 MB at q75                   | **Fails** (VMAF 78 at q65) | Apple only             |
| hevc_videotoolbox                     | about 240 fps                                    | same                      | 1.40 MB at q75 (VMAF 94.5)       | Not tested                 | Weaker browser support |

### Audio

| Option                                                       | Sync at joins                                 | Cost                               |
| ------------------------------------------------------------ | --------------------------------------------- | ---------------------------------- |
| Per-scene AAC inside segments                                | Drifts about 30 ms per join, silence at joins | None extra                         |
| **One continuous track, encoded once, muxed after the join** | Exact (0.00 ms)                               | 0.6 s per 6 minutes with `aac_at`  |
| Per-scene PCM, joined, then encoded once                     | Exact (same as above)                         | Same, with per-scene audio caching |

### Hashing

| Option                    | Verdict                                      |
| ------------------------- | -------------------------------------------- |
| **`node:crypto` SHA-256** | As fast as native BLAKE3 here, no dependency |
| `@napi-rs/blake-hash`     | Equal speed, one more native dependency      |
| `blake3` (npm)            | Does not install                             |

## 5. Recommendation

**Per scene, on a cache miss**, pipe RGBA from the rasteriser pool into one ffmpeg process:

```
ffmpeg -f rawvideo -pix_fmt rgba -s 1920x1080 -r 30 -i pipe:0 \
  -vf scale=out_color_matrix=bt709:out_range=tv \
  -c:v libx264 -preset veryfast -crf 18 -g 60 -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -video_track_timescale 15360 -an <cache>/<key>.tmp.mp4
```

then rename the file into the cache (atomic). Run up to 3 scene encoders at once, sharing the CPU with the
rasteriser pool. Offer `--fast` (`h264_videotoolbox -b:v 6M -g 60`, same colour arguments) for drafts on Apple
machines: it leaves the CPU to the rasteriser, at 3 to 4 times the file size. Never use VideoToolbox `-q:v`.

**Per video:**

1. Join cached segments with `-f concat -safe 0 -c copy` (0.3 s per 6 minutes).
2. Build **one continuous audio track**. Place each sentence's WAV at its frame-quantised start time, encode once
   (`aac_at` on macOS, `aac` elsewhere, 128 kb/s) and cache it by a hash of placements plus sentence audio hashes.
3. Write one SRT per language from the same timeline.
4. Mux video (copy), audio (copy) and `mov_text` tracks tagged `eng` and `spa`, with `+faststart`.
5. Write `.srt` and `.vtt` sidecars next to the mp4, for browsers and YouTube.

**Timeline rule:** scene boundaries are whole frames. At 30 fps a frame is exactly 1,600 samples at 48 kHz (800 at
Kokoro's 24 kHz), so the audio and subtitle timelines use the same integer grid and never drift. Rates that do not
divide the sample rate evenly (29.97) are not supported.

**Segment cache key**: SHA-256 of canonical JSON (sorted keys) containing:

- The cache schema version.
- The Lucent version.
- The rasteriser name and version (`@napi-rs/canvas`, because Skia updates change pixels).
- The `ffmpeg -version` first line and the exact encoder arguments.
- Width, height, fps and frame count.
- Every compiled track that intersects the scene's frame range, including elements carried in with `keep` (spike 005).
- Content hashes of every asset and font file used.

**Audio and subtitles are not in the segment key**, so a translation fix or a re-voiced sentence with unchanged
timing costs only a re-mux (0.1 s).

**Cache layout** (`.lucent/cache/v1/`):

```
segments/ab/abcdef....mp4      one scene
segments/ab/abcdef....json     frames, duration, encoder, created, lastUsed
audio/<key>.m4a                continuous tracks
voice/<key>.wav + .json        sentence audio and word timings (ADR 0004)
assets.json                    path -> { size, mtimeMs, sha256 }; re-hash only when size or mtime changes
```

**Invalidation and cleanup**: the Lucent version is in every key, and a change to the cache format moves to `v2/`
(delete `v1/` in one step). `lucent cache gc` removes entries unused for 14 days and not referenced by the current
compile, then evicts least recently used entries (by `lastUsed` in the metadata, not filesystem access times) down
to a size cap (default 5 GB). Writes go to a temporary name and are renamed; a per-key lock file prevents two
processes from rendering the same scene.

### Changes to the ADRs

- **ADR 0007**:
  - Name the encoder and its arguments, including the BT.709 conversion and tags (F4) and `-g 60`.
  - State that audio is never inside segments and that one continuous track is muxed after the join (F6).
  - List the key contents above. Audio and subtitles stay out of the key.
  - Add the whole-frame boundary rule and the `v1/` cache layout with garbage collection.
- **ADR 0008**:
  - Replace "the first language marked as default" with a statement that the default flag is honoured by VLC-type
    players, while Apple players show a synthesised forced-only default (F7).
  - Add `.vtt` and `.srt` sidecars as required outputs for browsers and YouTube.

## 6. Risks and unknowns

- **Node to ffmpeg pipe throughput is unmeasured.** These tests piped with `cat`. Node writing 8.3 MB frames into a
  child's stdin with backpressure may be slower. Mitigation: write whole frames, raise `highWaterMark`, and measure in
  the implementation's first benchmark.
- **Synthetic sources.** Real scenes with small text and thin coloured strokes were not encoded. With yuv420p, colour
  resolution is halved, so coloured strokes 1 to 2 pixels wide will blur (estimated). Guideline until measured:
  coloured strokes of at least 3 px and coloured text of at least 24 px at 1080p.
- **Licence of the encoder.** Homebrew's ffmpeg is built with `--enable-gpl` because of libx264. Lucent runs ffmpeg as
  a separate program and does not link it, so Lucent's own licence is unaffected. Bundling an x264-enabled ffmpeg
  binary with Lucent would carry GPL obligations for that binary. Keep ffmpeg a user-installed dependency, as
  it is today.
- **VideoToolbox varies by chip and does not exist on Linux.** This is another reason to default to x264.
- **Player behaviour for subtitles** was verified only for AVFoundation. VLC, mpv, Chrome, Firefox and YouTube's
  handling of in-band tracks are expectations, not measurements.
- **Parallel x264 alongside a saturated rasteriser pool** was simulated with busy loops, not with the real Skia pool.
  The 400 to 500 fps combined figure is an estimate.
- **Cache size.** About 58 MB of segments per photo-heavy 6-minute episode (estimated from the 10-second clip); ten
  episodes with a few stale versions each fit comfortably under 5 GB.

## 7. Sources

- FFmpeg H.264 encoding guide (CRF, presets): https://trac.ffmpeg.org/wiki/Encode/H.264
- FFmpeg concat demuxer: https://ffmpeg.org/ffmpeg-formats.html#concat-1
- FFmpeg scale filter (`out_color_matrix`, `out_range`): https://ffmpeg.org/ffmpeg-filters.html#scale-1
- Apple TN2258, AAC encoder delay and synchronization: https://developer.apple.com/library/archive/technotes/tn2258/_index.html
- AVFoundation media selection (legible groups, forced subtitles): https://developer.apple.com/documentation/avfoundation/avmediaselectiongroup
- Netflix VMAF: https://github.com/Netflix/vmaf
- ITU-R BT.709: https://www.itu.int/rec/R-REC-BT.709
- MDN, the `<track>` element (WebVTT): https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track
- YouTube Help, supported subtitle and caption files: https://support.google.com/youtube/answer/2734698
- Node.js crypto: https://nodejs.org/api/crypto.html
- npm `blake3` (unmaintained, broken dependency): https://www.npmjs.com/package/blake3

## Appendix: experiment details

Scratch directory (throwaway): `scratchpad/research/006/`.

**Sources**

```
ffmpeg -loop 1 -i blood.jpg -filter_complex "[0:v]scale=3840:-2,zoompan=z='1+0.0008*on':x='iw/2-(iw/zoom/2)':\
y='ih/2-(ih/zoom/2)':d=300:s=1920x1080:fps=30,drawbox=x='700+t*30':y=380:w=300:h=300:color=0xB4432F@1:t=6,\
drawbox=x=80:y=940:w=620:h=90:color=0xFBF8F1@0.92:t=fill,format=rgba" -frames:v 300 -f rawvideo photo.rgba

ffmpeg -f lavfi -i "color=c=0xFBF8F1:s=1920x1080:r=30,format=rgba" -filter_complex "[0:v]drawbox=x='200+t*60':\
y=300:w=400:h=400:color=0x1F8FC4@1:t=fill,drawbox=x=1100:y='200+t*40':w=500:h=120:color=0xD98B1C@1:t=fill,\
drawgrid=w=160:h=160:t=2:c=0xDDD6C8@1,format=rgba" -frames:v 300 -f rawvideo flat.rgba
```

**Quality**

```
ffmpeg -i out.mp4 -f rawvideo -pix_fmt rgba -s 1920x1080 -r 30 -i photo.rgba \
  -lavfi "[0:v]format=yuv420p,setpts=PTS-STARTPTS[d];[1:v]format=yuv420p,setpts=PTS-STARTPTS[r];[d][r]libvmaf=n_threads=14" -f null -
```

**Segments** (frames 0 to 96, 97 to 209, 210 to 299 cut from the raw file with `dd bs=8294400`)

```
dd if=photo.rgba bs=8294400 skip=97 count=113 | ffmpeg -f rawvideo -pix_fmt rgba -s 1920x1080 -r 30 -i - \
  -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -video_track_timescale 15360 s1.mp4
ffmpeg -f concat -safe 0 -i list.txt -c copy joined.mp4
ffprobe -select_streams v:0 -show_entries frame=pts_time,key_frame -of json joined.mp4
ffmpeg -i joined.mp4 -f framemd5 -     # compared with the three segments decoded in sequence
```

**Audio sync**: a 10 s chirp, `aevalsrc='0.5*sin(2*PI*(200*t+90*t*t))':s=48000`, split at samples 155,200 and 336,000
(the frame boundaries 97 and 210). Offsets found by cross-correlating 50 ms windows of the decoded track against the
source with numpy; gaps found as the minimum RMS of 5 ms windows within 60 ms of each join.

**Subtitles**

```
ffmpeg -i joined.mp4 -i en.srt -i es.srt -map 0:v -map 0:a -map 1 -map 2 -c:v copy -c:a copy -c:s mov_text \
  -metadata:s:s:0 language=eng -metadata:s:s:1 language=spa -disposition:s:0 default -disposition:s:1 0 \
  -movflags +faststart final.mp4
```

AVFoundation check (`avcheck.swift`): loads `.duration`, `.isPlayable`, `.tracks` with `languageCode`, the `.legible`
media selection group with its default option, and counts frames read by `AVAssetReaderTrackOutput`.

**CPU load simulation**: 15 concurrent `yes > /dev/null` processes while encoding.

**Hashing**: `bench.mjs` hashed a 40 MB buffer three times, the photo 20 times, a 5.8 MB buffer 20 times and a 26 KB
JSON 200 times per implementation, after one warm-up call.
