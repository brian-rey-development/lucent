# Spike 007: Agent interface and token budgets

|          |                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------- |
| Status   | Complete                                                                                                                    |
| Date     | 2026-09-23                                                                                                                  |
| Question | What agent interface keeps Lucent cheap in tokens and time, and how do we enforce the budgets in `docs/goals.md` section 4? |
| Informs  | ADR 0010                                                                                                                    |
| Machine  | Apple M5 Pro, macOS (Darwin 25.4), Node 24.21, pnpm 9.15, uv 0.12.2                                                         |

## 1. Question and why it matters

Lucent's main author is an AI agent. For an agent, every interaction has three costs: tokens read (definitions,
guides, tool results, images), tokens written (the video source), and wall-clock waiting (checks and renders).
ADR 0010 proposes one core library with two thin adapters (an MCP server as the primary agent interface and a
CLI), five tools, and budgets such as "all tool definitions under 600 tokens" and "catalog under 1,500 tokens".
`docs/goals.md` also claims that a full JSON Schema catalog is "5 to 10x larger" than a one-line-per-verb catalog.

This spike checks those numbers, decides how the budgets are measured and enforced offline, and settles the
questions the ADR left open: how images are budgeted, where warm state lives, what error messages look like, what
goes into skills and AGENTS.md, and how the future agent test (writing the `hela` scene) is measured.

## 2. Method

1. **Documentation review** of the current MCP specification (2026-07-28), the Claude Code MCP and skills docs, the
   Claude API vision and tool-use docs, Cursor's MCP docs and the AGENTS.md site (links in section 7).
2. **Observation of Claude Code in this session**: the system reminders list MCP tools as bare names under
   "deferred tools", and schemas are only loaded through a `ToolSearch` call.
3. **Token measurements** on real artefacts built in a scratch directory (appendix A):
   - the five tools registered with `@modelcontextprotocol/sdk` 1.30.0 and read back through a real `tools/list`
     call over an in-memory transport, so the JSON is exactly what a client receives;
   - a one-line-per-entry catalog for 17 components, and the same 17 components as zod 4.6.5 schemas exported with
     `z.toJSONSchema`;
   - a sample `guide` (core topic, with one complete example), a sample skill file, and sample errors in text and
     JSON.
4. **Tokenizer**: no `ANTHROPIC_API_KEY` is configured in this environment, so the `count_tokens` endpoint was not
   used. All counts use **tiktoken `o200k_base`** (with `cl100k_base` alongside) as a proxy. Claude's tokenizer is
   not public; section 3.3 discusses the expected error and the margin policy.
5. **Timing**: Node cold start and module import times, 5 runs each.

Every number below is labelled **measured** (with the tokenizer) or **estimated**.

## 3. Findings

### 3.1 MCP today: what clients actually do with tool definitions

- The current specification is **2026-07-28**. It describes MCP as a JSON-RPC protocol with **stateless,
  self-contained requests** and no protocol-level session: "MCP has no protocol-level session, so a server cannot
  rely on implicit per-connection state". Tool lists "MUST NOT vary per-connection". Long-running work is an opt-in
  **Tasks** extension; skills can be served over MCP through the "Skills over MCP" extension.
- Tool definitions carry `name`, `title`, `description`, `inputSchema`, optional `outputSchema`, `annotations`,
  `icons` and (in SDK 1.30 output) `execution.taskSupport`. Results can carry text, **image**, audio, resource links,
  embedded resources and `structuredContent`.
- The spec asks servers to return tools **in a deterministic order**, explicitly because it "improves LLM prompt
  cache hit rates when tools are included in model context".
- **Claude Code**: tool search is **on by default** and "defers loading of MCP server tools until Claude needs
  them". Only names are listed (observed in this session: e.g. `mcp__claude_ai_Linear__save_issue` appears as a
  name, its schema arrives only after `ToolSearch`). Claude Code prefixes tools as `mcp__<server>__<tool>`. It warns
  when a tool result exceeds **10,000 tokens** and truncates at **25,000** by default (`MAX_MCP_OUTPUT_TOKENS`);
  images count toward that limit. Oversized text results are written to a file and replaced by the path.
- **Cursor** supports tools, prompts and resources, and "attaches returned images to the chat". Its docs do not say
  whether definitions load eagerly or lazily, nor give a tool limit. Other clients (Claude Desktop, IDE chats) were
  not verified; assume they load every definition at session start.
- **Resources and prompts**: Claude Code sends `resources/list` and `prompts/list`, but its docs do not describe how
  the model reaches them. Tools are the only surface every client exposes to the model reliably. Conclusion: put the
  guide and catalog behind **tools**, not resources.
- **Stateless requests match Lucent's design**: every tool takes a `path`, so no call depends on a previous one.

### 3.2 Measured token costs (tiktoken o200k, proxy for Claude)

| Artefact                                                                                          | Characters | o200k                   | cl100k | Status   |
| ------------------------------------------------------------------------------------------------- | ---------- | ----------------------- | ------ | -------- |
| Five tool definitions, as received from `tools/list` (with `annotations`, `execution`, `$schema`) | 2,216      | **514**                 | 490    | measured |
| Same, reduced to what the Claude API receives (`name`, `description`, `input_schema`)             | 1,877      | **437**                 | 422    | measured |
| Same, without the SDK's `$schema` key                                                             | 1,617      | **365**                 | 347    | measured |
| Per tool (API shape, with `$schema`): guide 69, catalog 58, check 92, snap 113, render 103        |            | 435 total               |        | measured |
| Tool descriptions alone: 18 to 22 tokens each                                                     |            |                         |        | measured |
| Deferred names in Claude Code, `mcp__lucent__lucent_*` x5                                         |            | **50**                  |        | measured |
| Deferred names if tools are named `check`, `snap`... (`mcp__lucent__check`) x5                    |            | **39**                  |        | measured |
| Catalog, one line per entry (17 components + header + state-change line)                          | 1,636      | **375**                 | 370    | measured |
| Same 17 components as JSON Schema, minified                                                       | 9,327      | **2,480**               | 2,388  | measured |
| Same, pretty-printed                                                                              | 17,326     | **4,199**               | 4,189  | measured |
| One entry's schema (`ring`), pretty-printed, against its catalog line (~30)                       | 1,296      | 387                     | 385    | measured |
| Sample guide (core topic, complete example, rules, loop, error format)                            | 2,660      | **758**                 | 762    | measured |
| Sample SKILL.md (frontmatter + six steps)                                                         | 675        | **171**                 | 164    | measured |
| Five check errors, text lines                                                                     | 380        | **122** (19 to 30 each) | 122    | measured |
| Three check errors as JSON with spans and fixes, plus a timeline entry                            | 719        | **227**                 | 224    | measured |

Conclusions:

- **ADR 0010's 600-token budget holds** with room to spare: 365 to 437 tokens in the API shape (measured, o200k).
  In Claude Code the steady-state cost is about **50 tokens** of names until a tool is first used (measured).
- **The "5 to 10x" claim holds**: the minified JSON Schema is **6.6x** the one-line catalog, pretty-printed
  **11.2x**, and a single entry's schema about **13x** its catalog line (all measured, o200k).
- **The guide budget of 2,000 is loose**: a complete core guide with an example measured 758 tokens. A budget of
  1,200 keeps it honest.
- **Text errors are about 2x cheaper than JSON** per issue (about 24 against about 60 to 75 tokens, measured).
  Agents should get text; programs get JSON.
- A catalog line averages about **21 tokens** (measured), so the 1,500 budget fits about 70 entries.

### 3.3 Offline budget tests and the tokenizer margin

- Claude's tokenizer is not published and differs from `o200k_base`. Anthropic's own tool-use table shows the
  tool-use system prompt jumping from 497 tokens (Opus 4.6) to 675 (Opus 4.7) and back to 286 to 290 (Opus 4.8 and
  later), which is consistent with tokenizer changes between model generations (documented numbers, interpretation
  estimated).
- **Estimated**: current Claude tokenizers count between 1.0x and 1.35x the o200k count on English prose and code.
  This is not measured here.
- **Policy**: CI counts with `o200k_base` (offline, deterministic, available as `js-tiktoken` in Node) and fails at
  **budget / 1.35**. A separate, optional job calls the free `count_tokens` endpoint when an API key is present and
  records the real ratio in `bench/tokenizer-ratio.json`; if the ratio drifts above 1.35, the divisor is updated.
  With this rule, today's tool definitions pass only after dropping `$schema` (365 < 444; 437 is just under, 514
  from the raw SDK output would fail). The recommendation is to emit `inputSchema` without `$schema`.

### 3.4 Image cost, and the contact sheet size

- Claude sees images in **28 x 28 pixel patches**: cost = `ceil(width / 28) x ceil(height / 28)` visual tokens. The
  older rule of thumb, `width x height / 750`, is outdated.
- Two tiers: **standard** (long edge 1,568 px, at most 1,568 visual tokens) and **high resolution** (Claude 4.7 and
  later: long edge 2,576 px, at most 4,784 visual tokens). A 1920 x 1080 image costs 1,560 tokens on the standard
  tier after downscaling, but **2,691** on high-resolution models, which do not downscale it.
- Therefore the contact sheet must be **sized by Lucent, not by the client**. **1344 x 756** costs exactly
  **1,296 visual tokens on both tiers** (computed with the documented formula), holds a 4 x 4 grid of 336 x 189
  thumbnails (16 settled states), and is never resized by either tier.
- Claude Code counts image results against `MAX_MCP_OUTPUT_TOKENS` (25,000 by default), so one sheet is far inside
  the limit.

### 3.5 Warm state: where the heavy process lives

- Each MCP client session starts its **own** stdio server process. Two agents in the same project (or Claude Code
  plus Cursor) would each load the voice model and each keep their own caches. Putting warm state in the MCP server
  duplicates it.
- Measured cold costs on this machine: bare Node start about 30 ms; importing zod about 30 ms; importing the MCP SDK
  45 to 93 ms (5 runs each). A cold CLI `check` fits the 300 ms budget without a daemon; **the voice model and
  decoded images do not**, since loading PyTorch takes seconds (estimated from the prototype, not measured here).
- Design that follows: a **per-project daemon** (`lucentd`) owns heavy state (voice sidecar, compiled scenes, decoded
  assets, render queue). The MCP server and the CLI are both thin clients that connect to it, or start it when absent.
  Pitfalls and their fixes:

| Pitfall                                                                                                                                                                               | Fix                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| macOS limits a unix socket path to 104 bytes. A socket inside a project with a long path overflows (the old Halden path with `.lucent/run/lucent.sock` is already 92 chars, measured) | Put sockets in the user cache dir, named by a short hash of the project root              |
| Stale socket after a crash                                                                                                                                                            | Lock file with pid and engine version; on connect failure check the pid, unlink, restart  |
| Two clients start the daemon at once                                                                                                                                                  | Exclusive create of the lock file (`O_EXCL`) or `flock`; the loser connects to the winner |
| Engine upgraded while a daemon runs                                                                                                                                                   | Version handshake on connect; mismatch restarts the daemon                                |
| Several agents render the same file                                                                                                                                                   | Render queue deduplicates by scene cache key; checks are read-only and never queue        |
| Forgotten daemons                                                                                                                                                                     | Idle shutdown after 15 minutes without requests                                           |

- Long renders: the spec's Tasks extension exists, but client support is not verified. Renders stay synchronous with
  progress notifications and a `scene` scope, which keeps typical calls to seconds.

### 3.6 Error messages that an agent fixes in one iteration

Prior art converges on the same parts:

- **Elm** ("Compiler errors for humans"): say what happened in plain words, point at the exact code, suggest the fix.
- **Rust**: stable error codes (`E0308`), primary and secondary spans, `help:` suggestions tagged with an
  **applicability** level; `MachineApplicable` suggestions are applied automatically by `cargo fix`.
- **miette** (Rust): code, labels on spans, a help line, and a URL per code.
- **LSP diagnostics**: `range`, `severity`, `code`, `source`, `message`, `relatedInformation`, and `CodeAction`
  quick fixes carrying the exact text edit.

What makes an agent fix things in one pass is the same list: a stable **code**, an exact **location** that maps to a
source line, the **fact** (what is wrong), one **concrete fix**, and **did you mean** with the nearest valid value.
Two findings go beyond the ADR:

1. **Machine-applicable fixes should be applied by Lucent, not by the agent.** An unknown point with a single close
   match, a cue phrase with different capitalisation or a missing quote at the start of a narration line can be fixed
   mechanically. `check` with `fix: true` applies them and reports what it changed, saving a whole agent iteration
   and its tokens.
2. **Do not return `structuredContent` from `lucent_check`.** The spec says a tool that returns structured content
   SHOULD also return the same JSON as text, so the model can end up reading both. Text lines are about 2x cheaper
   per issue (3.2). JSON stays available through the CLI's `--json`.

JSON shape for `--json` (LSP-compatible, so an editor extension can reuse it):

```json
{"ok": false, "issues": [{"code": "E201", "severity": "error", "scene": "blood", "path": "do[1].ring",
  "range": {"line": 42, "col": 13}, "message": "unknown point $blood/rbc3",
  "known": ["wbc", "rbc_1", "rbc_2"],
  "fix": {"applicability": "machine", "replace": "$blood/rbc_1"}}]}
```

### 3.7 Skills and AGENTS.md

- Claude Code loads only a skill's `description` at startup; the full `SKILL.md` enters the conversation when the
  skill is invoked and **stays for the rest of the session**. `description` plus `when_to_use` is truncated at
  1,536 characters. Reference material belongs in separate files that load on demand.
- AGENTS.md is read by Codex, Jules, Aider, Copilot, Cursor, VS Code, Zed, Devin, Windsurf and others; the nearest
  file to the edited file wins.
- What goes where:

| Place               | Content                                                          | Budget                                |
| ------------------- | ---------------------------------------------------------------- | ------------------------------------- |
| Skill `description` | When to use Lucent, one sentence                                 | ~40 tokens, always loaded             |
| `SKILL.md` body     | The six-step loop only (sample measured 171 tokens)              | <= 300 tokens, stays loaded after use |
| `lucent_guide`      | The format itself                                                | <= 1,200 tokens, read once            |
| `lucent_catalog`    | Components and verbs                                             | <= 1,500 tokens, read once            |
| AGENTS.md section   | Two lines: "use the Lucent MCP tools; call `lucent_guide` first" | ~40 tokens                            |

Nothing about the format is duplicated in the skill or AGENTS.md: they point to `guide`, so there is one source of
truth and one budget.

### 3.8 Measuring the agent test (writing the `hela` scene)

- **Setup**: a fresh headless agent (`claude -p` with `--mcp-config` pointing at `lucent mcp` and
  `--output-format stream-json`), a task prompt of fixed wording, the asset manifest with the `hela` points, and no
  other context. N = 5 runs per model (estimated sufficient to see gross failures, not to compare close designs).
- **Metrics**, all taken from the stream log:
  - **First-try validity**: the first `lucent_check` returns zero E issues.
  - **Iterations to clean**: the number of `lucent_check` calls until zero E issues.
  - **Tokens**: input, output and cache-read tokens from the `usage` fields, reported separately.
  - **Images requested**: `lucent_snap` calls (target: 0 to reach a clean check).
  - **Wall clock** from first to last tool call.
- **Pass**: median iterations to clean <= 2, first-try validity in at least 3 of 5 runs, zero images needed.
- **Baseline**: the same prompt asking for Manim code, with the rendered stills judged by the owner. This compares
  the whole loop, not only tokens.

## 4. Options compared

| Option                                              | Context cost                                               | Reach                                      | Images                         | Warm state                                | Verdict                                     |
| --------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ | ------------------------------ | ----------------------------------------- | ------------------------------------------- |
| CLI only                                            | 0 until used                                               | Shell agents only                          | Two calls (write PNG, read it) | Needs a daemon anyway                     | Good for people and CI, not enough alone    |
| MCP only                                            | ~50 tokens in Claude Code, 365 to 437 elsewhere (measured) | Every MCP client                           | One call                       | Per-session process, duplicated per agent | Good for agents, awkward for people and CI  |
| **MCP + CLI over one core, daemon for heavy state** | Same as MCP                                                | Everyone                                   | One call                       | Shared across agents and the CLI          | **Recommended**                             |
| Guide and catalog as MCP resources                  | Lower in theory                                            | Client support for model access unverified | n/a                            | n/a                                       | Rejected: tools reach the model everywhere  |
| Full JSON Schema catalog                            | 2,480 to 4,199 tokens (measured)                           | n/a                                        | n/a                            | n/a                                       | Rejected: 6.6 to 11.2x the one-line catalog |

## 5. Recommendation

Keep ADR 0010's shape (one core library, MCP server and CLI as thin adapters, five tools) with these changes:

1. **Heavy state moves to a per-project daemon** (`lucentd`). The MCP server and the CLI are both thin clients.
   Sockets live in the user cache dir, named by a hash of the project root; lock file with pid and version; idle
   shutdown at 15 minutes.
2. **Tool definitions**: emit `inputSchema` without `$schema`, keep descriptions at 25 tokens or fewer, and return
   tools in a fixed order. Measured total: **365 tokens (o200k)**, under a CI threshold of 444 (600 / 1.35).
3. **Keep the `lucent_` prefix** on tool names. It costs 11 extra tokens across five deferred names in Claude Code
   (measured) and avoids collisions in clients that do not prefix by server.
4. **`lucent_check` returns text only** (no `structuredContent`) and accepts `fix: true` to apply machine-applicable
   fixes and report them.
5. **Contact sheet fixed at 1344 x 756**: 1,296 visual tokens on every model tier, 16 thumbnails.
6. **Budgets and their enforcement** (update `docs/goals.md`):

| Budget               | Old      | New                                          | Measured sample    |
| -------------------- | -------- | -------------------------------------------- | ------------------ |
| Guide                | 2,000    | **1,200**                                    | 758                |
| Catalog              | 1,500    | 1,500                                        | 375 for 17 entries |
| All tool definitions | 600      | 600                                          | 365                |
| Skill body           | 300      | 300                                          | 171                |
| One error line       | 40       | 40                                           | 19 to 30           |
| Image                | "~1,500" | **1,296 exactly**, `ceil(w/28) x ceil(h/28)` | computed           |

CI counts with `js-tiktoken` `o200k_base` and fails at budget / 1.35. An optional job calibrates against Claude's
`count_tokens` when a key is present.

Final tool definitions (API shape, as they should be emitted):

```json
[
  {"name": "lucent_guide",
   "description": "Lucent video format guide. Read once before writing or editing a .lucent.md file.",
   "input_schema": {"type": "object", "properties": {"topic": {"type": "string", "enum": ["core", "voice", "assets"]}}}},
  {"name": "lucent_catalog",
   "description": "Components and verbs, one line each. Pass name for one entry's full JSON Schema.",
   "input_schema": {"type": "object", "properties": {"name": {"type": "string"}}}},
  {"name": "lucent_check",
   "description": "Validate a video file without rendering. Returns coded issues with fixes and a timeline summary. Run after every edit.",
   "input_schema": {"type": "object", "properties": {
     "path": {"type": "string", "description": "Path to a .lucent.md file"},
     "scene": {"type": "string", "description": "Limit to one scene id"},
     "fix": {"type": "boolean", "description": "Apply machine-applicable fixes"}}, "required": ["path"]}},
  {"name": "lucent_snap",
   "description": "Contact sheet image of settled states, for judging look and pacing. Run check first; use sparingly.",
   "input_schema": {"type": "object", "properties": {
     "path": {"type": "string", "description": "Path to a .lucent.md file"},
     "scene": {"type": "string", "description": "Limit to one scene id"},
     "at": {"type": "array", "items": {"type": "number"}, "description": "Seconds; omit for settled states"}}, "required": ["path"]}},
  {"name": "lucent_render",
   "description": "Render mp4 with subtitle tracks. Only changed scenes re-render. Returns output path and timings.",
   "input_schema": {"type": "object", "properties": {
     "path": {"type": "string", "description": "Path to a .lucent.md file"},
     "scene": {"type": "string", "description": "Limit to one scene id"},
     "quality": {"type": "string", "enum": ["draft", "final"]}}, "required": ["path"]}}
]
```

The measured 365 tokens were counted without the `fix` parameter; it adds an estimated 10 to 15 tokens (o200k).

## 6. Risks and unknowns

- **Tokenizer ratio** (Claude against o200k) is estimated, not measured. Mitigated by the 1.35 divisor and the
  calibration job.
- **Clients other than Claude Code and Cursor** were not verified for eager or deferred loading, image support or
  tool limits.
- **Tasks extension support** in clients is unknown; long renders rely on synchronous calls with progress.
- **Daemon complexity**: process lifecycle bugs (stale locks, orphaned voice processes) are a classic source of
  flakiness. It needs integration tests that kill the daemon mid-request.
- **Machine-applicable fixes** can be wrong if a heuristic is too eager. Only fixes with exactly one candidate are
  marked `machine`.
- **The samples are drafts.** The real guide and catalog will grow; the budgets are what keep them honest.
- **Format revision.** The samples were measured against the single-YAML format. ADR 0002 has since moved to
  `*.lucent.md` (Markdown prose plus one YAML block per scene). Tool definitions change by one word
  (`.lucent.md`); the guide sample must be rewritten for the new format and re-measured, which is expected to stay
  well under 1,200 tokens (estimated).

## 7. Sources

- MCP specification 2026-07-28: https://modelcontextprotocol.io/specification/latest
- MCP tools (definitions, results, errors, deterministic order): https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- Claude Code and MCP (tool search, output limits, discovery cache): https://code.claude.com/docs/en/mcp
- Claude Code skills (progressive loading, 1,536-character listing limit): https://code.claude.com/docs/en/skills
- Claude vision (28 px patches, tiers, limits): https://platform.claude.com/docs/en/build-with-claude/vision
- Claude tool use (tool-use system prompt tokens per model, what counts as input): https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- Cursor MCP: https://cursor.com/docs/context/mcp
- AGENTS.md: https://agents.md/
- Elm, "Compiler errors for humans": https://elm-lang.org/news/compiler-errors-for-humans
- Rust compiler diagnostics and applicability: https://rustc-dev-guide.rust-lang.org/diagnostics.html
- miette: https://docs.rs/miette
- LSP diagnostics and code actions: https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/

## Appendix A: experiment details

Scratch directory (throwaway, not part of Lucent):
the session scratchpad (`research/007`), outside the repository

| File                                                               | What it is                                                                                                                                                              |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools.mjs`                                                        | Registers the five tools with `McpServer` (SDK 1.30.0, zod 4.6.5), lists them through `Client` over `InMemoryTransport`, writes `tools.json` and the API-shape variants |
| `gen.mjs`                                                          | 17 component schemas in zod; writes `catalog.schema.json` (pretty and minified) and `ring.schema.json` via `z.toJSONSchema`                                             |
| `catalog.txt`, `guide.md`, `skill.md`, `errors.txt`, `errors.json` | Hand-written samples in the proposed formats                                                                                                                            |
| `startup.mjs`                                                      | Import timing for zod and the MCP SDK                                                                                                                                   |

Counting: `uv run --with tiktoken python` with `o200k_base` and `cl100k_base`, on the exact file bytes.

Observed details worth keeping:

- SDK 1.30 output includes `"$schema": "http://json-schema.org/draft-07/schema#"` in every `inputSchema`, plus
  `annotations` and `execution: {"taskSupport": "forbidden"}`. The spec defaults to JSON Schema 2020-12 when
  `$schema` is absent, so dropping it is safe.
- Node cold start (5 runs): bare `node -e ""` 0.02 to 0.05 s; zod import 29 to 35 ms; MCP SDK import 46 to 93 ms;
  whole script 0.12 to 0.16 s wall clock.
- Image costs computed with `ceil(w/28) x ceil(h/28)`: 1344 x 756 = 1,296; 1456 x 819 = 1,560; 1568 x 882 = 1,792
  (over the standard tier cap, so it would be downscaled); 1920 x 1080 = 2,691 on high-resolution models.
