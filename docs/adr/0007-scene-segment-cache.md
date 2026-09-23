# 0007. Use the scene as the unit of caching and parallel rendering

- Status: Proposed (revised after spikes 005 and 006)
- Date: 2026-09-23

## Context

The prototype re-rendered the whole 5:52 episode (11 minutes) for any edit, one frame at a time on one core. Most
edits touch one scene.

## Options

| Option                 | Problem                                                       |
| ---------------------- | ------------------------------------------------------------- |
| Whole-video render     | Every edit pays for every scene                               |
| Per-frame cache        | Huge storage; invalidation is fragile for anything that moves |
| **Per-scene segments** | Scene boundaries must be encoder-friendly                     |

## Decision

- **Segments**: each scene is encoded as its own video-only segment. Scene boundaries fall on whole frames (1,600
  audio samples per frame at 48 kHz and 30 fps). Segments join with ffmpeg's concat demuxer and `-c copy`; spike 006
  verified frame-exact joins (300 frames, 10.000 s, decoded frames identical) with both encoders below.
- **Encoder**: libx264 `veryfast`, CRF 18, `-g 60`, with explicit BT.709 conversion and colour tags (ffmpeg's default
  conversion shifts the series' colours, for example `#1B9E77` to `#0F8F76`). Up to 3 scenes encode in parallel.
  Measured: VMAF 95.1 at 1.6 MB per 10 s of photo content, 790 fps with 3 encoders, 323 fps under full CPU load,
  against a need of 133 fps. `--fast` uses `h264_videotoolbox` at 6 Mb/s for drafts on macOS; its constant-quality
  mode (`-q:v`) is never used (VMAF 78 on flat graphics).
- **Audio**: never per segment. Per-scene AAC drifts about 30 ms and leaves silence at every join. One continuous
  narration track is built for the whole video, encoded once (`aac_at` on macOS, 0.6 s per 6 minutes) and muxed after
  the join with the subtitle tracks.
- **Cache key**: SHA-256 (`node:crypto`, 2.49 GB/s, as fast as BLAKE3 natively) of every compiled track that
  intersects the scene's time range (including elements carried in with `keep`; spike 005, F11), the asset hashes,
  the engine version and the render options. Audio and subtitles are not in the key: they do not touch the video
  segment.
- **Cache layout**: `.lucent/cache/v1/`, cleaned by `lucent cache gc` with a 5 GB least-recently-used cap. A format
  change bumps `v1`.

## Consequences

- Editing one sentence re-renders one scene (typically 20 to 60 seconds of video); re-voicing alone re-renders no
  video at all, only the audio track.
- End to end, rasterisation plus encoding is estimated at 0.07 to 0.13 s per video second, with the encoder as the
  bottleneck (spikes 002 and 006).
- Continuity across scenes (`keep`, zoom-through) must be resolved at compile time, so that each scene renders from
  its own snapshot without the previous scene's frames.
- The cache lives in `.lucent/` in the project and can be deleted at any time.
