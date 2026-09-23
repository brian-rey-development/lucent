export const MANIFEST = "blood:\n  file: blood.jpg\n  points:\n    wbc: [0.46, 0.41, 0.145]";

export const VIDEO = `---
lucent: 0
title: Blood
voice: kokoro/am_fenrir
subtitles: [en]
assets: assets/images.yaml
---

## blood

This is [blood].

\`\`\`scene
do:
  - at: blood
    photo: blood
\`\`\`

## cells

These are [cells].

\`\`\`scene
keep: $blood
do:
  - at: cells
    ring: $blood/wbc
\`\`\``;
