# 0010. One core library, two thin interfaces: an MCP server and a CLI

- Status: Proposed (revised after spike 007)
- Date: 2026-09-23

## Context

An agent's cost is tokens read, tokens written and time spent waiting (budgets in `docs/goals.md`). There are two
ways for an agent to reach Lucent:

|                         | MCP server                                                                                                                                         | CLI                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Context cost before use | Tool definitions. Claude Code defers them (only names are listed until a tool is needed); other clients may load every definition at session start | Zero                                         |
| Reach                   | Any MCP client, including those without a shell (Claude Desktop, claude.ai, IDE chats)                                                             | Only agents that run shell commands          |
| Images                  | Returned as image content in the tool result, in one call                                                                                          | Write a PNG, then a second call to read it   |
| Warm state              | Natural: the server is a long-lived process holding the voice model, compiled scenes and asset cache                                               | Needs a separate daemon to avoid cold starts |
| Humans, scripts, CI     | Awkward                                                                                                                                            | Natural (`just`, pipes, CI)                  |
| Output control          | Fixed per tool                                                                                                                                     | The agent can pipe to `head` or `grep`       |
| Debugging               | A protocol layer in between                                                                                                                        | Run the command and read the output          |

Neither is better on every row. What costs tokens is the size and noise of what each call returns, and both
interfaces can return exactly the same thing.

## Decision

All behaviour lives in a core library of plain functions that return structured results (`check`, `snap`,
`render`, `catalog`, `guide`). Two adapters, each only formatting and transport:

**Warm state lives in a per-project background process**, not in either adapter: it keeps the voice sidecar, compiled
scenes and decoded assets in memory and watches files. The MCP server and the CLI both connect to it over a unix
socket stored in the user cache directory (macOS limits socket paths to 104 bytes), and start it when it is not
running.

**MCP server** (`lucent mcp`, stdio, `@modelcontextprotocol/sdk` 1.30, MIT), the primary interface for agents. Five
tools, each description under 60 tokens, definitions emitted without `$schema` and in a fixed order. Measured: 437
tokens as the API receives them, 50 tokens in Claude Code until a tool is used (spike 007):

| Tool             | Input                    | Returns                                                                                                                                    |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `lucent_guide`   | `topic?`                 | The format guide (<= 1,200 tokens)                                                                                                         |
| `lucent_catalog` | `name?`                  | One line per verb or component; the JSON Schema of one entry when `name` is given                                                          |
| `lucent_check`   | `path`, `scene?`, `fix?` | Coded errors as plain text (19 to 30 tokens each) and the timeline summary; `fix: true` applies fixes that have exactly one correct answer |
| `lucent_snap`    | `path`, `scene?`, `at?`  | One contact-sheet image at 1344x756 (1,296 image tokens on every current model)                                                            |
| `lucent_render`  | `path`, `scene?`         | Output path, duration and render time, when done                                                                                           |

Tools take a `path`, never the file's content, so the agent edits with its own tools and never echoes the source
through a call.

**CLI** (`lucent <command>`). The same five commands plus `dev` (preview) for people, scripts and CI, with `--json`
for structured output (about twice the tokens per issue, so agents get plain text by default).

A **skill file** (Claude Code) and an `AGENTS.md` section, under 300 tokens: call `guide` once, edit, call `check`
until clean, `snap` only to judge taste, then `render`.

## Consequences

- Agents in any MCP client get Lucent with a small, fixed context cost and images in one call.
- People and CI get a normal CLI; neither interface has features the other lacks, because both call the core.
- Budget tests count the tokens of the tool definitions, the guide, the catalog and sample errors. The interface
  cannot silently grow.
- Two adapters to maintain. They stay thin: an adapter containing logic is a bug.
