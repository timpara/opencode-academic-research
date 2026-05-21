# Setup guide — opencode-academic-research

This guide walks through installing the OpenCode port of Academic Research Skills on macOS, Linux, or Windows (WSL).

For the upstream Claude Code plugin, see [`Imbad0202/academic-research-skills`](https://github.com/Imbad0202/academic-research-skills) or [`timpara/academic-research-skills`](https://github.com/timpara/academic-research-skills). This guide is OpenCode-only.

---

## 1. Prerequisites

### Required

- **[OpenCode](https://opencode.ai)** — install via the official instructions for your platform.
- **[bun](https://bun.sh)** — runtime for the TypeScript plugin (`plugins/ars-session-loaded.ts`).
- **[uv](https://docs.astral.sh/uv/)** — Python package and project manager for the verification scripts under `scripts/`.
- **git** — to clone the repo.
- **A model provider** — Anthropic, OpenAI, GitHub Copilot, Google, or any other OpenCode-supported provider. Authenticate with `opencode auth login`.

### Optional

- **Pandoc** — required for DOCX output (`format-convert` mode → DOCX). `brew install pandoc` / `apt install pandoc`.
- **tectonic** — required for APA 7.0 PDF compilation. See [tectonic-typesetting.github.io](https://tectonic-typesetting.github.io).
- **Source Han Serif TC** — required for Traditional Chinese PDF rendering. Download from [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Serif+TC).

If you only need Markdown output, skip the optional tools.

---

## 2. Install

```bash
# 1. Clone
git clone https://github.com/timpara/opencode-academic-research.git
cd opencode-academic-research

# 2. Symlink skills, commands, and plugins into your OpenCode config
./install.sh

# 3. Install the plugin runtime (in the repo)
bun install

# 4. Install Python verification deps (in the repo)
uv sync --extra dev
```

`install.sh` creates symlinks from `~/.config/opencode/{skills,commands,plugins}/` into your clone. Edit a file here and the next OpenCode session picks it up.

Useful flags:

- `./install.sh --dry-run` — print what would happen, do nothing.
- `./install.sh --force` — overwrite existing files (backs them up as `*.bak`).
- `./install.sh --uninstall` — remove the symlinks.

### Where files end up

| Source in repo | Symlinked to |
|---|---|
| `skills/<name>/` | `~/.config/opencode/skills/<name>` |
| `commands/ars-*.md` | `~/.config/opencode/commands/ars-*.md` |
| `plugins/ars-session-loaded.ts` | `~/.config/opencode/plugins/ars-session-loaded.ts` |

If you set `XDG_CONFIG_HOME` to something other than `~/.config`, the script honors it.

---

## 3. Verify

Open OpenCode (in any working directory) and run:

```
/ars-plan
```

You should see a Socratic dialogue from the `academic-paper` skill ask about your paper.

For a one-shot test instead:

```
/ars-lit-review "your topic"
```

The `academic-paper` skill should produce a literature review section.

If neither happens, see [Troubleshooting](#5-troubleshooting).

---

## 4. Optional configuration

### Model provider

OpenCode picks the model from your session settings, not from skill frontmatter. The upstream Claude Code plugin pinned `model: opus` for some commands (`/ars-full`, `/ars-reviewer`, `/ars-revision-coach`) for depth; in OpenCode, choose a comparable model (Claude 4.7 Opus, GPT-5 Pro, etc.) for those commands and a cheaper model for the rest.

### Environment variables

The Python verification scripts read several optional env vars:

- `S2_API_KEY` — Semantic Scholar API key (raises rate limit from 1 req/s to 10 req/s).
- `ARS_CLAIM_AUDIT=1` — enable opt-in claim-faithfulness audit at Stage 4→5.
- `ARS_CROSS_MODEL=1` — enable cross-model verification at integrity gates (Stage 2.5, 4.5).
- `ARS_PASSPORT_RESET=1` — promote every FULL checkpoint to a context-reset boundary.
- `ARS_SOCRATIC_READING_PROBE=1` — enable the opt-in honesty probe in Socratic Mentor.

Set them in your shell rc file or pass per-command.

### Cross-model verification

To use a second model as an independent verifier, install its CLI alongside OpenCode (for example `gemini` or `codex`) and set `ARS_CROSS_MODEL=1`. The integrity-check scripts under `scripts/` call out to whichever CLI you have available.

---

## 5. Troubleshooting

### `/ars-plan` is not recognized

Check that the symlinks exist:

```bash
ls -la ~/.config/opencode/commands/ | grep ars-
ls -la ~/.config/opencode/skills/ | grep -E 'academic|deep-research'
```

If the directory is empty, re-run `./install.sh` and check for permission errors.

### The plugin does not run on session start

```bash
ls -la ~/.config/opencode/plugins/ars-session-loaded.ts
cd ~/projects/opencode-academic-research && bun install
```

The plugin imports `@opencode-ai/plugin`. If `bun install` was not run in the repo, the import fails silently.

### Python script fails with `ModuleNotFoundError`

```bash
cd ~/projects/opencode-academic-research
uv sync --extra dev
uv run python -c "import yaml, ruamel.yaml, jsonschema; print('ok')"
```

Run all scripts with `uv run` so they pick up the project venv. Bare `python scripts/...` will not have the deps.

### Pandoc / tectonic / PDF compilation fails

`format-convert` to DOCX needs `pandoc` on PATH. `format-convert` to PDF needs `tectonic` plus, for Traditional Chinese, the `Source Han Serif TC` font installed system-wide. If either is missing, fall back to Markdown output.

### `uv sync` fails with `invalid peer certificate: UnknownIssuer`

Some Linux installs ship a `uv` build that does not see the system CA bundle by default. Two workarounds:

```bash
# Option A: tell uv to use the system TLS stack
uv sync --extra dev --native-tls

# Option B: point uv at the system cert bundle explicitly
SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt uv sync --extra dev --native-tls
```

If both fail, your distro's CA bundle path is different — check `/etc/pki/tls/certs/ca-bundle.crt` (RHEL/Fedora) or your distro's docs.

### `bun` is not installed

If `bun` is not available and you cannot install it via the official script (e.g. `unzip` is missing and you have no sudo), install it via `npm` instead:

```bash
npm install -g bun
bun --version  # should print 1.x
```

### Upstream-only docs reference `/plugin marketplace add`

That command is Claude Code only. In OpenCode use `git clone` + `./install.sh` instead. If you find a stale reference in the docs, please open an issue or PR — the port maintainer wants to scrub all such references.

---

## 6. Update

To pull the latest upstream changes:

```bash
cd ~/projects/opencode-academic-research
git fetch upstream
git checkout -b sync/<date>
git merge upstream/main
# resolve conflicts; run the MIGRATION.md §3 post-merge checklist
git checkout main && git merge sync/<date>
```

See [`MIGRATION.md`](../MIGRATION.md) for the full post-merge checklist (frontmatter re-application, hook→plugin sync, etc.).

---

## 7. Uninstall

```bash
cd ~/projects/opencode-academic-research
./install.sh --uninstall
```

This removes only the symlinks that point into this repo. Other files in `~/.config/opencode/` are left alone.
