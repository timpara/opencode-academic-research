# Academic Research Skills for OpenCode

[![Version](https://img.shields.io/badge/version-v3.9.4.2--opencode.1-blue)](https://github.com/timpara/opencode-academic-research/releases)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/license-CC%20BY--NC%204.0-lightgrey)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Upstream](https://img.shields.io/badge/upstream-academic--research--skills-orange)](https://github.com/timpara/academic-research-skills)

[简体中文版](README.zh-CN.md) | [繁體中文版](README.zh-TW.md) | [日本語版](README.ja-JP.md)

A suite of [OpenCode](https://opencode.ai) skills, slash commands, and a plugin for academic research. It covers the full pipeline from literature review to peer-review-ready manuscript.

This repo is the OpenCode port of [`timpara/academic-research-skills`](https://github.com/timpara/academic-research-skills), itself a fork of the original Claude Code plugin by **Cheng-I Wu** ([Imbad0202/academic-research-skills](https://github.com/Imbad0202/academic-research-skills)). All workflow content, agent prompts, and Python verification scripts come from upstream. This port replaces the Claude Code plugin packaging with OpenCode's file-based skill / command / plugin discovery.

**Install in under a minute** (OpenCode 0.x or later):

```bash
git clone https://github.com/timpara/opencode-academic-research.git
cd opencode-academic-research
./install.sh   # symlinks skills/, commands/, plugins/ into ~/.config/opencode/
bun install    # installs @opencode-ai/plugin for the session-loaded plugin
uv sync --extra dev  # installs Python deps for the verification scripts
```

Then open OpenCode and try `/ars-plan` to walk through your paper structure via Socratic dialogue, or jump to [Quick install](#quick-install) for a step-by-step guide.

> **AI is your copilot, not the pilot.** This tool will not write your paper for you. It handles the grunt work — hunting down references, formatting citations, verifying data, checking logical consistency — so you can focus on the parts that actually require your brain: defining the question, choosing the method, interpreting what the data means, and writing the sentence after "I argue that."
>
> Unlike a humanizer, this tool does not help you hide the fact that you used AI. It helps you write better. Style Calibration learns your voice from past work. Writing Quality Check catches the patterns that make prose feel machine-generated. The goal is quality, not cheating.

### Why human-in-the-loop, not full automation?

Lu et al. (2026, *Nature* 651:914-919) built **The AI Scientist** — the first fully autonomous AI research system to publish a paper through blind peer review at a top-tier ML venue (ICLR 2025 workshop, score 6.33/10 vs workshop average 4.87). Their Limitations section enumerates the failure modes that any fully-autonomous AI research pipeline inherits: implementation bugs, hallucinated results, shortcut reliance, bug-as-insight reframing, methodology fabrication, frame-lock, citation hallucinations.

ARS is built on the premise that **a human researcher augmented by AI avoids these failure modes better than either alone**. Stage 2.5 and Stage 4.5 integrity gates run a 7-mode blocking checklist (see [`skills/academic-pipeline/references/ai_research_failure_modes.md`](skills/academic-pipeline/references/ai_research_failure_modes.md)); the reviewer offers an opt-in calibration mode that measures its own FNR/FPR against a user-supplied gold set.

[**Zhao et al.**](https://arxiv.org/abs/2605.07723) (2026-05) audited 111M references across 2.5M papers on arXiv, bioRxiv, SSRN, and PMC. Their conservative estimate is 146,932 hallucinated citations for 2025 alone, with an observed mid-2024 inflection; for the bioRxiv-to-PMC pairing they report 85.3% preprint-to-published persistence. The paper describes "real citations deployed to support claims the cited references do not actually make" as an open challenge. ARS v3.7.1 added trust-chain frontmatter for source provenance; v3.7.3 added locator infrastructure (three-layer citation anchors) for future claim-level audits and surfaces advisory risk signals at cite time (ARS labels the claim-faithfulness gap internally as "L3"; this is ARS terminology, not the paper's). v3.7.x is motivated by Zhao et al.'s corpus-scale findings; corpus-scale evaluation of ARS itself remains future work.

v3.8 closes the second half of the L3 gap. v3.7.3 made every citation carry a locator anchor; v3.8 adds an opt-in audit pass (`ARS_CLAIM_AUDIT=1`) that fetches the cited source against each anchor and judges whether the claim is actually supported. Five new HIGH-WARN classes (claim-not-supported, negative-constraint-violation, fabricated-reference, anchorless, constraint-violation-uncited) gate-refuse output through the formatter terminal hard gate. Calibration is shipped as a 20-tuple gold set with FNR<0.15 + FPR<0.10 acceptance thresholds; ramp-on plan is deferred to post-calibration evidence per v3.8 spec §5.

v3.3 was inspired by [**PaperOrchestra**](https://arxiv.org/abs/2604.05018) (Song, Song, Pfister & Yoon, 2026, Google): Semantic Scholar API verification, anti-leakage protocol, VLM figure verification, and score trajectory tracking.

---

## Architecture & pipeline

**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — the full pipeline view: flow diagram, stage-by-stage matrix, data-access flow, skill dependency graph, quality gates, and mode list.

The architecture doc covers *what runs in which stage*.

## Quick install

**Prerequisites**

- [OpenCode](https://opencode.ai) installed and authenticated (`opencode auth login`)
- [`bun`](https://bun.sh) for the TypeScript plugin
- [`uv`](https://docs.astral.sh/uv/) for the Python verification scripts
- An API key for your chosen model (Anthropic, OpenAI, GitHub Copilot, or any other OpenCode-supported provider)
- *Optional:* Pandoc for DOCX, tectonic + Source Han Serif TC for APA 7.0 PDF (Markdown output works without either)

**Install steps**

```bash
# 1. Clone
git clone https://github.com/timpara/opencode-academic-research.git
cd opencode-academic-research

# 2. Symlink into your OpenCode config
./install.sh

# 3. Install the plugin runtime
bun install

# 4. Install Python verification deps
uv sync --extra dev
```

`install.sh` creates symlinks from `~/.config/opencode/{skills,commands,plugins}/` into this repo so OpenCode auto-discovers them. Edit files here and changes show up in the next OpenCode session.

**Verify it works:** open OpenCode and run `/ars-plan`, then describe a paper you are working on. ARS will start a Socratic dialogue to map out chapter structure. For a single-shot test instead, try `/ars-lit-review "your topic"`.

**[docs/SETUP.md](docs/SETUP.md)** — full guide: install OpenCode, set up provider keys, optional Pandoc / tectonic for DOCX / PDF, cross-model verification (`ARS_CROSS_MODEL`), and the three installation methods (symlink via `install.sh`, manual symlink, global copy).

**Using the original Claude Code plugin?** The upstream remains supported at [`Imbad0202/academic-research-skills`](https://github.com/Imbad0202/academic-research-skills) (and the maintained fork at [`timpara/academic-research-skills`](https://github.com/timpara/academic-research-skills)). Workflow content is identical; only the packaging differs.

## Performance & cost

**[docs/PERFORMANCE.md](docs/PERFORMANCE.md)** — per-mode token budgets, full-pipeline estimate (~$4–6 for a 15k-word paper), and recommended OpenCode settings.

## Slash commands

| Command | Skill | Mode | What it does |
|---|---|---|---|
| `/ars-plan` | academic-paper | plan | Socratic chapter-by-chapter planning |
| `/ars-full` | academic-pipeline | (pipeline) | Full pipeline: research → write → review → revise → finalize |
| `/ars-lit-review` | academic-paper | lit-review | Annotated bibliography as paper section |
| `/ars-outline` | academic-paper | outline-only | Detailed outline + evidence map |
| `/ars-abstract` | academic-paper | abstract-only | Bilingual abstract + keywords |
| `/ars-reviewer` | academic-paper-reviewer | full | Simulated peer-review panel |
| `/ars-revision` | academic-paper | revision | Apply reviewer comments, produce response-to-reviewers |
| `/ars-revision-coach` | academic-paper | revision-coach | Revision roadmap + response letter skeleton |
| `/ars-citation-check` | academic-paper | citation-check | Citation error report |
| `/ars-format-convert` | academic-paper | format-convert | LaTeX / DOCX / PDF / Markdown |
| `/ars-disclosure` | academic-paper | disclosure | Venue-specific AI-usage statement |
| `/ars-mark-read` | academic-paper | n/a | Record human-read signal for a citation key |
| `/ars-unmark-read` | academic-paper | n/a | Rescind a prior human-read mark |

## Guides & articles

- [Academic Writing Shouldn't Be a Solo Act](https://open.substack.com/pub/edwardwu223235/p/academic-writing-shouldnt-be-a-solo?r=4dczl&utm_medium=ios) — full pipeline walkthrough (English)
- [學術寫作不該是一個人的事：一套開源 AI 協作工具如何改變研究者的工作流](https://open.substack.com/pub/edwardwu223235/p/ai?r=4dczl&utm_medium=ios) — 完整使用指南（繁體中文）

---

## Features at a glance

- **Deep Research** — 13-agent research team with Socratic guided mode, PRISMA systematic review, intent detection, dialogue health monitoring, optional cross-model DA, Semantic Scholar API verification.
- **Academic Paper** — 12-agent paper writing with Style Calibration, Writing Quality Check, LaTeX hardening, visualization, revision coaching, citation conversion, anti-leakage protocol, and VLM figure verification.
- **Academic Paper Reviewer** — 7-agent multi-perspective peer review with 0–100 quality rubrics (EIC + 3 dynamic reviewers + Devil's Advocate), concession threshold protocol, attack intensity preservation, optional cross-model DA critique / calibration, R&R traceability matrix, read-only constraint.
- **Academic Pipeline** — 10-stage pipeline orchestrator with adaptive checkpoints, claim verification, Material Passport, optional `repro_lock`, optional cross-model integrity verification, mid-conversation reinforcement, and score trajectory tracking.
- **Data Access Level Metadata** (v3.3.2+) — every skill declares `data_access_level` (`raw` / `redacted` / `verified_only`); enforced by `scripts/check_data_access_level.py`. Pattern adapted from Anthropic's automated-w2s-researcher (2026). See [`shared/ground_truth_isolation_pattern.md`](shared/ground_truth_isolation_pattern.md).
- **Task Type Annotation** (v3.3.2+) — every skill declares `task_type` (`open-ended` or `outcome-gradable`). All current ARS skills are `open-ended`.
- **Benchmark Report Schema** (v3.3.5+) — JSON Schema + lint for honest benchmark comparisons. See [`shared/benchmark_report_pattern.md`](shared/benchmark_report_pattern.md).
- **Artifact Reproducibility Lockfile** (v3.3.5+) — optional `repro_lock` sub-block on Material Passport. **Configuration documentation, not replay guarantee** — LLM outputs are not byte-reproducible. See [`shared/artifact_reproducibility_pattern.md`](shared/artifact_reproducibility_pattern.md).

---

## Showcase: real pipeline output

See the complete artifacts from a real 10-stage pipeline run — peer review reports, integrity verification reports, and the final paper:

**[Browse all pipeline artifacts →](examples/showcase/)**

| Artifact | Description |
|---|---|
| [Final Paper (EN)](examples/showcase/full_paper_apa7.pdf) | APA 7.0 formatted, LaTeX-compiled |
| [Final Paper (ZH)](examples/showcase/full_paper_zh_apa7.pdf) | Chinese version, APA 7.0 |
| [Integrity Report — Pre-Review](examples/showcase/integrity_report_stage2.5.pdf) | Stage 2.5: caught 15 fabricated refs + 3 statistical errors |
| [Integrity Report — Final](examples/showcase/integrity_report_stage4.5.pdf) | Stage 4.5: zero regressions confirmed |
| [Peer Review Round 1](examples/showcase/stage3_review_report.pdf) | EIC + 3 Reviewers + Devil's Advocate |
| [Re-Review](examples/showcase/stage3prime_rereview_report.pdf) | Verification after revisions |
| [Peer Review Round 2](examples/showcase/stage3_review_report_r2.pdf) | Follow-up review |
| [Response to Reviewers](examples/showcase/response_to_reviewers_r2.pdf) | Point-by-point author response |
| [Post-Publication Audit Report](examples/showcase/post_publication_audit_2026-03-09.pdf) | Independent full-reference audit: found 21/68 issues missed by 3 rounds of integrity checks |

---

## Companion: Experiment Agent

If your research involves running experiments (code or human studies) before writing, the [Experiment Agent](https://github.com/Imbad0202/experiment-agent) skill fills the gap between ARS Stage 1 (RESEARCH) and Stage 2 (WRITE).

```
ARS Stage 1 RESEARCH  →  RQ Brief + Methodology Blueprint
        ↓
  experiment-agent     →  run/manage experiments → validate results
        ↓
ARS Stage 2 WRITE     →  write paper with verified experiment results
```

**What it does**: executes code experiments (Python, R, etc.) with real-time monitoring, manages human study protocols with IRB ethics checklist, interprets statistics with 11-type fallacy detection, and verifies reproducibility.

**How to use together**: pause the ARS pipeline after Stage 1, run experiments in a separate experiment-agent session, then bring the results (with Material Passport) back to ARS Stage 2. ARS requires zero modification. The experiment-agent itself is currently Claude Code only; an OpenCode port is not yet available.

---

## Usage

### Quick start

```
# Start a full research pipeline
You: "I want to write a research paper on AI's impact on higher education QA"

# Start with Socratic guidance
You: "Guide my research on AI in educational evaluation"

# Write a paper with guided planning
You: "Guide me through writing a paper on demographic decline"

# Review an existing paper
You: "Review this paper" (then provide the paper)

# Check pipeline status
You: "status"
```

### Individual skills

#### Deep Research (7 modes)

```
"Research the impact of AI on higher education"       → full mode
"Give me a quick brief on X"                          → quick mode
"Do a systematic review on X with PRISMA"             → systematic-review mode
"Guide my research on X"                              → socratic mode (guided)
"Fact-check these claims"                             → fact-check mode
"Do a literature review on X"                         → lit-review mode
"Review this paper's research quality"                → review mode
```

#### Academic Paper (10 modes)

```
"Write a paper on X"                                  → full mode
"Guide me through writing a paper"                    → plan mode (guided)
"Build a paper outline"                               → outline-only mode
"I have a draft, here are reviewer comments"          → revision mode
"Parse these reviewer comments into a roadmap"        → revision-coach mode
"Write an abstract for this paper"                    → abstract-only mode
"Turn this into a literature review paper"            → lit-review mode
"Convert to LaTeX" / "Convert citations to IEEE"      → format-convert mode
"Check citations"                                     → citation-check mode
"Generate an AI disclosure statement for NeurIPS"     → disclosure mode
```

#### Academic Paper Reviewer (6 modes)

```
"Review this paper"                                   → full mode (EIC + R1/R2/R3 + Devil's Advocate)
"Quick assessment of this paper"                      → quick mode
"Guide me to improve this paper"                      → guided mode
"Check the methodology"                               → methodology-focus mode
"Verify the revisions"                                → re-review mode
"Calibrate this reviewer against my gold set"         → calibration mode
```

#### Academic Pipeline (Orchestrator)

```
"I want to write a complete research paper"           → full pipeline from Stage 1
"I already have a paper, review it"                   → mid-entry at Stage 2.5 (integrity first)
"I received reviewer comments"                        → mid-entry at Stage 4
```

> Pipeline ends with **Stage 6: Process Summary** — auto-generates a paper creation process record with 6-dimension Collaboration Quality Evaluation (1–100 scoring).

### Supported languages

- **Traditional Chinese** (繁體中文) — default when user writes in Chinese
- **English** — default when user writes in English
- Bilingual abstracts (Chinese + English) for academic papers

> **Using a different language?** Socratic mode (deep-research) and Plan mode (academic-paper) use **intent-based activation** — they detect the meaning of your request, not specific keywords. This means they work in **any language** without modification.
>
> The general `Trigger Keywords` section (which determines whether the skill is activated at all) still lists English and Traditional Chinese keywords. If you find the skill is not activating reliably in your language, you can add your language's keywords to the `### Trigger Keywords` section in each `SKILL.md` file to improve matching confidence.

### Supported citation formats

- APA 7.0 (default, including Chinese citation rules)
- Chicago (Notes & Author-Date)
- MLA
- IEEE
- Vancouver

### Supported paper structures

- IMRaD (empirical research)
- Thematic Literature Review
- Theoretical Analysis
- Case Study
- Policy Brief
- Conference Paper

---

## Port notes

This repo differs from upstream in packaging only:

- **Skills** live under `skills/<name>/SKILL.md` (real directories, not symlinks). OpenCode discovers them by frontmatter.
- **Slash commands** under `commands/ars-*.md` use `agent: build` and `compatibility: opencode` frontmatter instead of `model: sonnet|opus`. Model choice is per-session in OpenCode.
- **Session-start hook** (upstream `hooks/hooks.json` + `scripts/announce-ars-loaded.sh`) is replaced by `plugins/ars-session-loaded.ts`, a TypeScript plugin built on `@opencode-ai/plugin`.
- **Python scripts** keep their upstream content. The port adds `pyproject.toml` so you can install with `uv sync --extra dev` instead of `pip install -r requirements-dev.txt`.
- **`.claude-plugin/` and `.claude/`** directories are removed. Project rules from upstream `.claude/CLAUDE.md` live in [`AGENTS.md`](AGENTS.md) at the repo root.

For a full mapping see [`MIGRATION.md`](MIGRATION.md) and [`docs/OPENCODE_NOTES.md`](docs/OPENCODE_NOTES.md).

---

## License

This work is licensed under [CC-BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).

**You are free to:**
- Share — copy and redistribute the material
- Adapt — remix, transform, and build upon the material

**Under the following terms:**
- **Attribution** — You must give appropriate credit
- **NonCommercial** — You may not use the material for commercial purposes

**Attribution format:**
```
Based on Academic Research Skills by Cheng-I Wu
https://github.com/Imbad0202/academic-research-skills
OpenCode port: https://github.com/timpara/opencode-academic-research
```

---

## Contributors

**Cheng-I Wu** (吳政宜) — Original author and upstream maintainer of [`Imbad0202/academic-research-skills`](https://github.com/Imbad0202/academic-research-skills). All workflow content, agent prompts, and verification scripts are his.

**[timpara](https://github.com/timpara)** — Fork maintainer ([`timpara/academic-research-skills`](https://github.com/timpara/academic-research-skills)) and OpenCode port maintainer (this repo).

**[aspi6246](https://github.com/aspi6246)** — Upstream contributor. The v3.1 optimization was inspired by patterns from [Claude-Code-Skills-for-Academics](https://github.com/aspi6246/Claude-Code-Skills-for-Academics): read-only constraint pattern, anti-pattern codification as first-class design, cognitive framework approach, and lean skill size philosophy.

**[mchesbro1](https://github.com/mchesbro1)** — Upstream contributor. Originally proposed and drafted the IS Basket of 8 journals for `academic-paper-reviewer/references/top_journals_by_field.md`.

**[cloudenochcsis](https://github.com/cloudenochcsis)** — Upstream contributor. Extended the IS section from the *Basket of 8* to the full *Senior Scholars' Basket of 11*.

**[eltociear](https://github.com/eltociear)** (Ikko Eltociear Ashimine) — Upstream contributor. Translated the Japanese README.

**[xpfo-go](https://github.com/xpfo-go)** (xpfo) — Upstream contributor. Translated the Simplified Chinese README.

---

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md) for the full upstream changelog and the OpenCode port-specific entries.
