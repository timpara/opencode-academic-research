# Migration notes — Claude Code → OpenCode

This document records what changed when porting `Imbad0202/academic-research-skills` (Claude Code plugin) to OpenCode, and gives the checklist for syncing future upstream releases.

If you are a user, you do not need to read this. See [`README.md`](README.md) and [`docs/SETUP.md`](docs/SETUP.md).

If you are a maintainer pulling in upstream changes, see §3.

---

## 1. What stayed the same

- Every `skills/<name>/SKILL.md` body (only frontmatter changed).
- Every `commands/ars-*.md` body (only frontmatter changed).
- Every file under `agents/`, `shared/`, `scripts/`, `examples/`, `docs/design/`.
- All 38 agent prompts, all schema files, all reference protocols.
- All 124 Python verification scripts.
- The CC-BY-NC-4.0 license and attribution chain (Cheng-I Wu → timpara → this port).

This means a citation integrity audit, a peer-review panel, or a claim-faithfulness check produces the same output in OpenCode as in Claude Code.

---

## 2. What changed

### 2.1 Directory mapping

| Upstream (Claude Code) | This repo (OpenCode) | Notes |
|---|---|---|
| `.claude-plugin/plugin.json` | removed | OpenCode discovers skills by file convention, no manifest needed. |
| `.claude-plugin/marketplace.json` | removed | No marketplace concept in OpenCode. |
| `.claude/CLAUDE.md` | merged into `AGENTS.md` | OpenCode reads `AGENTS.md` at workspace root. Routing Discipline v3.9.2 content migrated verbatim. |
| `.claude/settings.local.json` | removed | Per-user OpenCode settings live in `~/.config/opencode/`. |
| `hooks/hooks.json` | removed | OpenCode hooks are TypeScript plugins, not JSON-declared bash. |
| `scripts/announce-ars-loaded.sh` | removed | Replaced by `plugins/ars-session-loaded.ts`. |
| `skills/<name>` (symlinks) | `skills/<name>` (real dirs) | OpenCode discovers `skills/*/SKILL.md`; symlinks-to-self confused the scanner. |
| upstream `requirements-dev.txt` | `pyproject.toml` | `uv sync --extra dev` replaces `pip install -r requirements-dev.txt`. |
| n/a | `opencode.json` | Permission rules for `uv`, `pytest`, `ruff`, Python scripts. |
| n/a | `package.json` | Declares `@opencode-ai/plugin` dev dep. |
| n/a | `install.sh` | Symlinks skills/commands/plugins into `~/.config/opencode/`. |
| n/a | `plugins/ars-session-loaded.ts` | TypeScript replacement for the SessionStart bash hook. |
| n/a | `MIGRATION.md`, `docs/OPENCODE_NOTES.md` | Port documentation. |

### 2.2 Frontmatter diffs

**Skills** (`skills/<name>/SKILL.md`) — added three fields, kept everything else:

```diff
 ---
 name: deep-research
 description: ...
 version: 2.9.x
+license: CC-BY-NC-4.0
+compatibility: opencode claude-code
+allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, Task
 data_access_level: verified_only
 task_type: open-ended
 ---
```

**Slash commands** (`commands/ars-*.md`) — replaced `model:` with `agent:` + added `compatibility:`:

```diff
 ---
 description: ARS academic-paper `plan` mode — Socratic chapter-by-chapter planning
-model: sonnet
+agent: build
+compatibility: opencode
 ---
```

Model choice in OpenCode is per-session, not per-command. Commands the upstream pinned `opus` for (`/ars-full`, `/ars-reviewer`, `/ars-revision-coach`) should be run in an Opus or comparable session for best results.

### 2.3 Hook → plugin rewrite

Upstream `hooks/hooks.json` declared a `SessionStart` hook running `scripts/announce-ars-loaded.sh`, which printed a context block into the model's first turn listing the 13 commands.

OpenCode uses TypeScript plugins built on `@opencode-ai/plugin`. The port replaces the bash hook with `plugins/ars-session-loaded.ts`, which hooks `session.created` and logs the suite load to the OpenCode app log.

**Important difference**: the upstream hook injected text into the model's prompt to make commands discoverable. In OpenCode this is **not necessary** because the model sees commands and skills via OpenCode's built-in discovery. The plugin exists for observability and parity, not for prompt injection.

### 2.4 Discovery model

| Concern | Claude Code | OpenCode |
|---|---|---|
| Skill discovery | `.claude-plugin/plugin.json` lists skill paths | File convention: any `skills/*/SKILL.md` with valid YAML frontmatter |
| Command discovery | Same plugin manifest | File convention: any `commands/*.md` with `description` |
| Plugin discovery | `hooks/hooks.json` declarative | File convention: any `plugins/*.ts` exporting a `Plugin` |
| Permission control | Hard-coded in client | `opencode.json` `permission` rules |
| Model choice | Per-command frontmatter | Per-session |

---

## 3. Upstream sync checklist

When pulling in a new upstream release from `timpara/academic-research-skills` (or `Imbad0202/academic-research-skills`):

### 3.1 Fetch and merge

```bash
cd ~/projects/opencode-academic-research
git fetch upstream
git checkout -b sync/upstream-vX.Y.Z
git merge upstream/main
```

### 3.2 Resolve expected conflicts

The following files have port-specific changes that will conflict on every sync. Take **theirs** for content, then re-apply the port-specific changes:

- `skills/<name>/SKILL.md` — re-add `license`, `compatibility`, `allowed-tools` to frontmatter. Body should be upstream's verbatim.
- `commands/ars-*.md` — replace upstream's `model: sonnet|opus` with `agent: build` and add `compatibility: opencode`. Body should be upstream's verbatim.
- `README.md`, `docs/SETUP.md`, `QUICKSTART.md`, `CONTRIBUTING.md` — keep ours. Cherry-pick content updates from upstream's diff as needed.
- `CHANGELOG.md` — prepend a new `[vX.Y.Z-opencode.N]` entry under the OpenCode-port header explaining what came in.

Files you should NOT touch (always take upstream):

- `agents/`, `shared/`, `scripts/`, `examples/`, `docs/design/`
- `skills/*/agents/`, `skills/*/references/`, `skills/*/templates/`
- The body of every `SKILL.md` and `commands/ars-*.md`

### 3.3 Handle new files

If upstream added a new file:

- **New `.claude-plugin/*` or `.claude/*` file** → delete it.
- **New `hooks/*.json` or `scripts/announce-*.sh`** → delete and port the behavior into `plugins/`.
- **New skill** (`skills/<newname>/SKILL.md`) → add port frontmatter fields, then add a corresponding `commands/ars-<mode>.md` if upstream did not.
- **New slash command** (`commands/ars-<new>.md`) → swap `model:` → `agent:`, add `compatibility:`.
- **New Python dep in upstream `requirements-dev.txt`** → add to `pyproject.toml` `[project]` or `[project.optional-dependencies].dev`.

### 3.4 Handle deletions

If upstream deleted a file we depend on (for example, `.claude/CLAUDE.md` content we migrated to `AGENTS.md`), keep the migrated content here unless upstream's deletion was itself the point of the release.

### 3.5 Validate

```bash
# Python
uv sync --extra dev
uv run ruff check scripts/
uv run pytest scripts/

# Plugin
bun install
# manual: open OpenCode, check session-created log entry appears

# Symlinks
./install.sh --dry-run   # should report all as "already linked" or "link"
```

### 3.6 Smoke-test in OpenCode

Open OpenCode in a fresh project directory and verify:

1. `/ars-plan` triggers Socratic dialogue.
2. `/ars-lit-review "test topic"` produces a literature review section.
3. `/ars-reviewer` (with a small test paper) produces a review panel.
4. `/ars-full` enters the pipeline orchestrator.

### 3.7 Merge and tag

```bash
git checkout main
git merge sync/upstream-vX.Y.Z
git tag vX.Y.Z-opencode.1
git push origin main --tags
```

---

## 4. Things to watch on the next upstream sync

- **`.claude/CLAUDE.md`** — upstream removed this in their v3.9.2 refactor. The port migrated the Routing Discipline content into `AGENTS.md`. If upstream re-adds the file or changes the protocol, re-sync `AGENTS.md`.
- **`shared/references/intent_clarification_protocol.md`** — `AGENTS.md` references this path. If upstream renames or moves it, fix the cross-reference.
- **`scripts/check_v3_6_7_pattern_protection.py`** — hard-pins agent file paths. If upstream moves agent files, the lint will break in CI.
- **`requirements-dev.txt`** — if upstream re-adds it (the port deleted it), keep the port's `pyproject.toml` as the source of truth and ignore upstream's file.
- **`hooks/hooks.json`** — upstream maintains this for the Claude Code PreToolUse hook. The port deletes it (the guard is implemented in `plugins/ars-session-loaded.ts`). If upstream adds new hook entries, evaluate whether to port the behavior into the TypeScript plugin.
- **`scripts/ars_write_scope_guard.py`** — the Python guard script is Claude Code-specific (emits Claude hook JSON, reads `CLAUDE_PLUGIN_ROOT`). The port keeps it for reference and test coverage but does not execute it. The OpenCode enforcement lives in `plugins/ars-session-loaded.ts`.
- **CI workflows** — upstream's `.github/workflows/` reference `requirements-dev.txt` and `hooks/hooks.json`. The port replaces these with `pyproject.toml` (`pip install -e ".[dev]"`) and an OpenCode-compatible guard validation step.
- **New slash commands** — upstream uses `model: sonnet` or `model: opus`. The port replaces with `agent: build` + `compatibility: opencode`. Check for new commands after every merge.

### Known pre-existing lint debt in `scripts/`

`uv run ruff check scripts/` reports ~238 issues on the v3.9.4.2 import (mostly import-sort and unused-import). These come from the upstream Python suite and are **not** introduced by the port. The port keeps the scripts byte-identical to upstream so future merges stay clean. Do not run `ruff --fix` against `scripts/` unless you are willing to maintain the diff against upstream forever; instead, send the fix upstream and pull it back on the next sync.

---

## 5. Open questions for upstream

When in doubt about behavior, ask in [`timpara/academic-research-skills` issues](https://github.com/timpara/academic-research-skills/issues) (or `Imbad0202/academic-research-skills`). Do not assume the port should diverge silently.
