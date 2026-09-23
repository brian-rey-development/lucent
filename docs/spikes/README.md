# Spikes

A spike is a **research document**, not a prototype. It answers one question with evidence: sources read,
throwaway experiments measured on the owner's machine, and options compared. Then it recommends. Experiment code
lives outside the repository; each spike's appendix records how to reproduce its numbers.

Spikes inform ADRs (`docs/adr/`). An ADR moves from Proposed to Accepted only when the spikes it depends on agree
with it, or the ADR is revised to match them.

| # | Question | Informs | Status |
|---|---|---|---|
| [001](001-authoring-format.md) | What file format minimises tokens and first-attempt failures while covering everything the lessons need? | 0002, 0005 | Complete |
| [002](002-rasterisation.md) | Which backend turns the SVG display list into 1080p frames fastest, matching the preview? | 0003, 0007 | Complete |
| [003](003-voice.md) | How do we get narration with word timings locally, fast, with compatible licences? | 0004, 0005 | Complete |
| [004](004-layout-and-text.md) | How does the engine know every box at compile time, and place labels without collisions? | 0009, 0006 | Complete |
| [005](005-animation-model.md) | How does "declare states, not transitions" produce good motion automatically? | 0006, 0007 | Complete |
| [006](006-encoding-and-caching.md) | How do frames become the final mp4 fast, with per-scene caching and soft subtitles? | 0007, 0008 | Complete |
| [007](007-agent-interface.md) | What agent interface keeps Lucent cheap in tokens and time, and how are budgets enforced? | 0010 | Complete |

## Template

```markdown
# Spike NNN: Title

| | |
|---|---|
| Status | In progress / Complete |
| Date | YYYY-MM-DD |
| Question | One sentence |
| Informs | ADR numbers |
| Machine | Hardware and tool versions |

## 1. Question and why it matters
Tie it to a budget in docs/goals.md.

## 2. Method
What was read, what was run.

## 3. Findings
Numbered, each with evidence. Every number is marked measured or estimated.

## 4. Options compared

## 5. Recommendation

## 6. Risks and unknowns

## 7. Sources

## Appendix: experiment details
```

## After the spikes

Once every spike is complete and the ADRs are reconciled, the next document is a prototype plan: the smallest
build that renders two real scenes and checks every budget in `docs/goals.md`. That plan is not a spike and lives in
`docs/plans/`.
