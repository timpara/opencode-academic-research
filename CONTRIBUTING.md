# Contributing to opencode-academic-research

Thank you for your interest in contributing. This document explains what kinds of contributions we accept for this OpenCode port.

> **Where to send your PR.** Most contributions belong upstream at [`Imbad0202/academic-research-skills`](https://github.com/Imbad0202/academic-research-skills) (workflow content, agent prompts, Python scripts) or at the maintained fork [`timpara/academic-research-skills`](https://github.com/timpara/academic-research-skills). This port only owns the OpenCode packaging layer: `opencode.json`, `package.json`, `pyproject.toml`, `plugins/`, `install.sh`, and the OpenCode-specific docs (`README.md`, `docs/SETUP.md`, `MIGRATION.md`, `docs/OPENCODE_NOTES.md`). If your change is to a `SKILL.md` body, an `agents/*.md` file, or anything under `scripts/`, please open the PR upstream first; it will flow into this repo on the next sync.

---

## How to submit a contribution

This repo uses the standard **fork-and-PR** workflow. Fork on GitHub, clone your fork, create a branch, make your changes, push, then open a PR against `timpara/opencode-academic-research`.

## Development workflow

```bash
# Python lint and tests
uv run ruff check scripts/
uv run ruff format scripts/
uv run pytest scripts/

# TypeScript plugin
bun install
bun build plugins/ars-session-loaded.ts --target=bun --no-bundle  # syntax check
```

---

## What we accept in this repo

### OpenCode packaging (port-specific)

These changes belong here, not upstream:

- **OpenCode packaging fixes** — `opencode.json` permission rules, `package.json` dep bumps, `pyproject.toml` config, `install.sh` improvements.
- **Plugin bugs and improvements** — anything under `plugins/`.
- **OpenCode-specific docs** — `README.md`, `docs/SETUP.md`, `MIGRATION.md`, `docs/OPENCODE_NOTES.md`, OpenCode-port entries in `CHANGELOG.md`.
- **Slash-command frontmatter** — when adding new OpenCode-specific frontmatter fields (the command body itself is upstream content).

### Upstream content (please send upstream)

These changes belong at [`timpara/academic-research-skills`](https://github.com/timpara/academic-research-skills) or [`Imbad0202/academic-research-skills`](https://github.com/Imbad0202/academic-research-skills):

- Skill behavior and prompts (`skills/*/SKILL.md` body)
- Agent definitions (`agents/*.md`, `skills/*/agents/*.md`)
- Python verification scripts (`scripts/`)
- Shared protocols and references (`shared/`)
- Slash-command bodies
- Workflow logic, evaluation sets, journal lists, schemas

After the upstream PR merges, run the sync procedure in [`MIGRATION.md`](MIGRATION.md) §3 to pull it into this repo.

---

## PR guidelines

- **One concern per PR** — don't mix unrelated changes
- **Describe what and why** — explain the motivation, not just the change
- **Reference issues** — if your PR addresses an open issue, link it
- **Test your changes** — if you're modifying agent definitions, try running the skill to confirm it works as expected
- **Keep READMEs in sync** — if your change affects user-facing documentation, update `README.md`, `README.zh-CN.md`, `README.zh-TW.md`, and `README.ja-JP.md` when applicable

---

## Governance

### Maintainer

The upstream repo is maintained by [Cheng-I Wu](https://github.com/Imbad0202) (HEEACT). The maintained fork and this OpenCode port are maintained by [timpara](https://github.com/timpara). Each maintainer has final say on their respective repo.

### Decision principles

1. **Accuracy over completeness** — we'd rather have fewer, verified journal entries than a long unvetted list
2. **Human-in-the-loop always** — contributions that reduce human oversight or enable fully autonomous paper generation will be declined
3. **No detection evasion** — features designed to make AI-generated text harder to detect (as opposed to higher quality) are out of scope. See [Issue #3](https://github.com/Imbad0202/academic-research-skills/issues/3) for context.
4. **Discipline diversity welcome** — ARS defaults to higher education research but aims to be domain-agnostic. Discipline-specific modules are encouraged.

---

## Release checklist

Most release mechanics are CI-enforced (`check_version_consistency.py` keeps CLAUDE.md / SKILL.md / CHANGELOG / plugin manifests / README badge in lockstep; the release-cooldown workflow paces tags). One convention is editorial and lives here:

### `Real-use findings` subsection (#395)

When drafting a release's CHANGELOG entry, include a **`Real-use findings`** subsection if any of the release's issues were discovered through actual use of the suite on a real paper — one line per issue, naming the run that surfaced it. Paper-derived / external-motivation work (the Zhao / Kong / Kim tracks) does NOT belong here; the subsection exists precisely to make the other provenance class visible. Background: the v3.6.7 production chapter run surfaced 17 drift patterns, but that lived-experience provenance was buried in spec prose with no fixed, greppable home — and release motivation since v3.8 has been almost entirely external papers, which is itself a signal worth seeing per release. If a release has no real-use findings, omit the subsection; never pad it.

## Academic integrity policy

This repo is designed to be **assistive, not deceptive**. See [POSITIONING.md](POSITIONING.md) for the full design philosophy. Contributors must not add features designed to evade AI detection tools. If unsure, open an issue to discuss before submitting a PR.

---

## Credit

Contributors are credited in commit messages, CHANGELOG entries, and the Contributors section of the README. For significant contributions (new features, major reference files), we also add a mention in the relevant release notes.

## License

By contributing, you agree that your contributions will be licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). See [POSITIONING.md](POSITIONING.md) for usage terms.

## When adding a new skill

Read [`shared/ground_truth_isolation_pattern.md`](shared/ground_truth_isolation_pattern.md) before writing the SKILL.md. It explains the three-layer model behind the `data_access_level` and `task_type` frontmatter fields and lists the do/don't rules for handling evaluation rubrics, gold labels, and answer keys.
