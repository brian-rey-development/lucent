# Goals and budgets

Lucent is **local first, fast, performant, and cheap for AI agents to use**, in time and in tokens. Every design
decision is judged against the budgets below. A feature that breaks a budget needs an ADR explaining why.

## 1. Local first

- Works offline after installation. The only networked commands install models or fetch licensed assets.
- No account, no telemetry, no cloud rendering.
- Caches live in the project (`.lucent/`) and the user cache directory, and are always safe to delete.
- Fonts ship with Lucent as OFL-licensed static files (for example Inter and JetBrains Mono). System fonts such as
  Avenir Next cannot be redistributed and resolve differently across machines (spike 004).

## 2. Fast for the person in the loop

| Loop | Budget |
|---|---|
| Visual edit (props, colours, labels) visible in preview | < 100 ms |
| Edited sentence re-voiced, preview snaps to real timing | < 3 s, in the background; preview never blocks on voice |
| CLI cold start for `check` | < 300 ms |

## 3. Performant for the machine

| Work | Budget (M5 Pro, 15 cores) |
|---|---|
| Final render, 1080p30 | <= 0.25 s per video second (a 6-minute episode in 90 s). Manim today: 1.9 s |
| Re-render after editing one scene | Only that scene; unchanged scenes cost 0 |
| Memory | < 4 GB during a full render |

## 4. Cheap for agents

An agent's cost is tokens read plus tokens written plus wall-clock waiting. Each is budgeted.

| Budget | Target | Why |
|---|---|---|
| Guide an agent must read | <= 1,200 tokens | Paid once per session; a full sample guide measured 758 (spike 007) |
| Catalog (`lucent catalog`) | <= 1,500 tokens, one line per verb or component | Measured 375 tokens for 17 components; the same as JSON Schema is 6.6x larger minified, 11.2x pretty-printed |
| Source for 60 s of video | ~400 tokens | Writing is the most expensive token |
| One error | <= 40 tokens, with a concrete fix | Measured 19 to 30 as plain text; JSON doubles it |
| `lucent check` wall clock | < 200 ms, never renders, never synthesises voice | It runs after every edit |
| MCP tool definitions | <= 600 tokens for all tools | Measured 437; Claude Code lists only names (50) until a tool is used |
| Visual review | One 1344x756 contact sheet per request, only when asked | Images cost `ceil(w/28) x ceil(h/28)` tokens: 1,296 for the sheet, 2,691 for a raw 1080p frame |
| Re-reading output | Never needed | Every problem maps back to a source line |

Budgets are enforced in CI by counting with `o200k_base` (offline) and failing at the budget divided by 1.35, an
estimated allowance for Claude's tokenizer that an optional `count_tokens` check confirms (spike 007).

The rule behind the table: **text checks first, pixels last.** Layout overlaps, off-screen elements, unreadable
pacing, missing cues and speech-hostile text are all detected by `check` from the compiled layout, without rendering
a frame or spending vision tokens. The contact sheet exists for taste, not for finding bugs.

## 5. What these goals rule out

- A browser on the render path: screenshots alone cost 7.7 ms per frame, the whole per-frame budget (spike 002,
  ADR 0003).
- Large or chatty agent interfaces: the MCP server has five tools with definitions under 600 tokens in total (437 measured), and
  every tool returns only what the agent needs to act (ADR 0010).
- Layout decided by the renderer: the engine must know every box at compile time to check it (ADR 0009).
