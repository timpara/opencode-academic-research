# OpenCode notes

This document covers OpenCode runtime mechanics that matter for `opencode-academic-research`. It is reference material for maintainers and curious users. End-user setup lives in [`SETUP.md`](SETUP.md).

---

## 1. Discovery model

OpenCode discovers skills, commands, and plugins by walking three directories:

```
~/.config/opencode/
├── skills/<name>/SKILL.md
├── commands/<name>.md
└── plugins/<name>.ts
```

(`$XDG_CONFIG_HOME/opencode/` if `XDG_CONFIG_HOME` is set.)

Project-level overrides live in `.opencode/` at the workspace root. This port ships at user level via `install.sh` symlinks, not at project level, so the skills are available in every OpenCode session regardless of working directory.

### Skill discovery

A skill is "any directory under `skills/` with a `SKILL.md` whose YAML frontmatter parses cleanly." OpenCode reads only the frontmatter on discovery; the body is loaded lazily when the skill activates. Required fields:

- `name` — string, must match directory name.
- `description` — string, used by the model to decide when to use the skill.

Recommended fields used in this repo:

- `version` — string (semver-ish).
- `license` — string.
- `compatibility` — space-separated runtimes (`opencode claude-code`).
- `allowed-tools` — comma-separated tool names the skill is allowed to call.
- `data_access_level` — `raw` / `redacted` / `verified_only` (upstream convention).
- `task_type` — `open-ended` or `outcome-gradable` (upstream convention).

### Command discovery

Slash commands are markdown files under `commands/` with YAML frontmatter. Required:

- `description` — what the command does, shown in the `/` palette.

Recommended:

- `agent` — which agent runs the command (`build`, `general`, `plan`). This port uses `build` since the commands may write files.
- `compatibility: opencode` — declares the command targets OpenCode.

OpenCode does not support per-command model pinning the way Claude Code did. The active session model runs the command.

### Plugin discovery

Plugins are TypeScript files under `plugins/` exporting a `Plugin` from `@opencode-ai/plugin`. OpenCode loads them at startup and registers their hook handlers.

---

## 2. Plugin runtime

### Hook surface

`@opencode-ai/plugin` exposes hooks including:

- `session.created` — fires when a new session starts.
- `chat.message` — fires for each new user message.
- `chat.params` — fires before sending the prompt to the model.
- `tool.execute.before` / `tool.execute.after` — fire around tool calls.

The port's `plugins/ars-session-loaded.ts` uses:
- `session.created` — startup announce (parity with the upstream Claude Code `SessionStart` hook).
- `tool.execute.before` — write-scope guard (port of the upstream `hooks/run_guard.sh` + `scripts/ars_write_scope_guard.py` PreToolUse hook).

### Runtime requirements

The plugin needs the `@opencode-ai/plugin` package installed at runtime. The repo's `package.json` declares it as a dev dependency; running `bun install` in the repo fetches it. If `bun install` is skipped, OpenCode loads the plugin file, the import fails, and the plugin silently does not run — there is no visible error.

### Why a plugin and not a system prompt

The upstream Claude Code `SessionStart` hook used `additionalContext` to inject text into the model's first prompt, listing the 13 commands and 3 plugin agents so the model knew they existed.

OpenCode does **not** need this. The model sees commands and skills via OpenCode's built-in discovery layer; injecting them again in a system message would burn context for no benefit. The port plugin therefore only logs the suite load. If you want a visible startup banner, modify `plugins/ars-session-loaded.ts` to call `client.session.message` or similar.

---

## 3. Permission rules

`opencode.json` at the repo root declares permission rules so OpenCode knows which commands the user has pre-approved for ARS:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["AGENTS.md"],
  "permission": {
    "bash": {
      "uv *": "allow",
      "uv run *": "allow",
      "pytest *": "allow",
      "ruff *": "allow",
      "python scripts/*": "allow",
      "git status": "allow",
      "git diff*": "allow",
      "git log*": "allow",
      "ls *": "allow",
      "cat *": "allow",
      "*": "ask"
    },
    "edit": "allow",
    "write": "allow"
  }
}
```

These rules apply when the project is opened as a workspace. They do NOT apply when the skills run in some other workspace; in that case OpenCode uses the rules from that workspace's own `opencode.json` plus the user's `~/.config/opencode/opencode.json`. If you use ARS often, copy the relevant rules into your user config.

---

## 4. Model selection

OpenCode picks the model from session settings or the global default. The port preserves the upstream's implicit recommendation in comments but does not enforce it:

| Skill / mode | Upstream recommended | OpenCode equivalent |
|---|---|---|
| `academic-pipeline` full | Opus | Claude 4.7 Opus / GPT-5 Pro |
| `academic-paper-reviewer` full | Opus | Claude 4.7 Opus / GPT-5 Pro |
| `academic-paper` revision-coach | Opus | Claude 4.7 Opus / GPT-5 Pro |
| All other commands | Sonnet | Claude 4.7 Sonnet / GPT-5 Mini |
| Never | Haiku | (skip Claude Haiku / GPT-5 Nano) |

Set your session model in OpenCode before running the heavier commands.

---

## 5. Skill lazy-loading

When a skill activates, OpenCode loads `SKILL.md` plus any referenced files (e.g., agent prompts under `<skill>/agents/`, references under `<skill>/references/`). This is similar to upstream Claude Code's behavior.

The upstream skills reference files using relative paths from `SKILL.md`. The port keeps these paths intact. Where the upstream referenced `.claude/CLAUDE.md`, the port rewrote the reference to `AGENTS.md (project root)` — see the sed pass in the porting commits for the exact diff.

---

## 6. Write-scope guard

The upstream v3.10 release introduced a PreToolUse hook (`hooks/run_guard.sh` + `scripts/ars_write_scope_guard.py`) that enforces per-agent write boundaries. In Claude Code, this is wired via `hooks/hooks.json`. In the OpenCode port, the guard is implemented natively in the TypeScript plugin using `tool.execute.before`.

### How it works

The guard reads `scripts/ars_phase_scope_manifest.json`, which maps each of the 23 Bucket A agents to their allowed write globs (e.g., `phase1_*/**`, `phase7_*/**`). When a write tool (Write, Edit, MultiEdit) targets a file inside a `phase*_*/` directory, the guard checks whether that path matches any agent's allowed globs.

### Modes

- **Advisory** (default): Logs a warning when a write would violate scope boundaries. Does not block.
- **Strict** (`ARS_WRITE_GUARD=strict`): Logs an error for scope violations.

### Limitations vs upstream

The upstream Claude Code hook receives the `agent_type` in the hook payload, enabling per-agent enforcement. OpenCode's `tool.execute.before` does not (yet) expose which subagent is active, so the port enforces a weaker invariant: "all writes into phase directories must match at least one agent's allowed globs." This catches the most common failure mode (writing into the wrong phase number) but cannot catch same-phase cross-agent violations.

### Files

| File | Purpose |
|------|---------|
| `plugins/ars-session-loaded.ts` | Guard implementation (TypeScript, runs in OpenCode) |
| `scripts/ars_phase_scope_manifest.json` | Agent-to-glob mapping (platform-agnostic data) |
| `scripts/ars_write_scope_guard.py` | Upstream guard logic (Python, Claude Code only) |
| `hooks/run_guard.sh` | Upstream launcher (shell, Claude Code only) |

---

## 7. Known limitations

### 7.1 No cross-agent dispatch like Claude Code's plugin agents

Upstream v3.7.0 introduced "plugin-shipped agents" (`agents/synthesis_agent.md`, `agents/research_architect_agent.md`, `agents/report_compiler_agent.md`) as symlinks into `deep-research/agents/`. These were special in Claude Code because the plugin manifest registered them as top-level agents.

OpenCode does not (yet) have a comparable concept. The files still exist in this repo under `agents/`, and the skills' internal Task-tool dispatch still finds them via the existing relative paths. The user-facing `Task` tool sees them as ordinary agent files. There is no functional regression, just one less layer of indirection.

### 7.2 Python script invocation

Several commands (`/ars-mark-read`, `/ars-unmark-read`) shell out to Python scripts under `scripts/`. The commands assume `python` resolves to a Python with the deps installed. If you used `uv` (recommended), prefix with `uv run` or activate the venv. The `opencode.json` permission rules already allow `uv` and `python scripts/*` so OpenCode will not prompt.

### 7.3 SessionStart timing

`session.created` fires after OpenCode initializes the session but before the first user message. If you add UI-facing output to the plugin, be aware some clients buffer log messages until after the first model response.

---

## 8. Why not a single mega-skill?

We considered packaging the four skills as a single `academic-research-suite` skill (matching the Codex CLI sibling distribution shape). We kept four because:

1. OpenCode's skill model rewards small, well-scoped descriptions for routing accuracy.
2. The upstream skill boundary maps to the routing protocol in `shared/references/intent_clarification_protocol.md`; collapsing them would require rewriting the routing rules.
3. Periodic upstream syncs are simpler when the file layout matches upstream.

---

## 9. References

- OpenCode docs: [`opencode.ai/docs`](https://opencode.ai/docs)
- `@opencode-ai/plugin` package: [`opencode.ai/docs/plugins/`](https://opencode.ai/docs/plugins/)
- Upstream Claude Code plugin: [`Imbad0202/academic-research-skills`](https://github.com/Imbad0202/academic-research-skills)
- Maintained Claude Code fork: [`timpara/academic-research-skills`](https://github.com/timpara/academic-research-skills)
