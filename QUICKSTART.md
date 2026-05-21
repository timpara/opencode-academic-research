# Quick Start

Get from zero to your first AI-assisted research in 3 steps.

## Step 1: Install

```bash
# Install OpenCode (see opencode.ai for platform instructions)
# Install bun and uv as well

# Clone this repo somewhere stable
git clone https://github.com/timpara/opencode-academic-research.git ~/projects/opencode-academic-research
cd ~/projects/opencode-academic-research

# Symlink skills, commands, and plugins into your OpenCode config
./install.sh

# Install plugin runtime + Python deps
bun install
uv sync --extra dev
```

OpenCode auto-discovers skills from `~/.config/opencode/skills/<name>/SKILL.md`, commands from `~/.config/opencode/commands/*.md`, and plugins from `~/.config/opencode/plugins/*.ts`. See [docs/SETUP.md](docs/SETUP.md) for the full guide.

## Step 2: Launch

```bash
opencode
```

## Step 3: Start researching

Tell OpenCode what you want to do, or use one of the 13 `/ars-*` slash commands. It will pick the right skill and mode.

### Example: Guided research (Socratic mode)

```
You: "I have a vague idea about AI's impact on higher education quality assurance,
      but I'm not sure how to frame the research question. Can you guide me?"
```

The model enters Socratic mode — asking questions to help you clarify your thinking, not giving you answers directly. After 5-15 rounds of dialogue, you will have a focused research question and methodology direction.

### Example: Write a paper

```
You: "Help me write a paper about the impact of declining birth rates
      on private universities in Taiwan"
```

Or use the slash command: `/ars-plan` for guided planning, `/ars-full` for the full pipeline.

### Example: Review an existing paper

```
/ars-reviewer
```

Then paste or attach the paper.

### Example: Full pipeline (research → write → review → revise → publish)

```
/ars-full
```

Or in natural language: "I want to produce a complete research paper about how agentic AI is reshaping student learning outcome measurement."

This triggers the full 10-stage pipeline. Budget ~$4-6 in API costs and 2-4 hours of collaborative work.

## Which mode should I use?

| I want to... | Use this |
|-------------|----------|
| Explore a vague idea | `deep-research` socratic mode — just describe your interest |
| Get a quick literature summary | `deep-research` quick mode |
| Do a systematic review (PRISMA) | `deep-research` systematic-review mode |
| Write a paper from scratch | `/ars-full` or `academic-paper` full mode |
| Plan a paper chapter by chapter | `/ars-plan` |
| Get my paper reviewed | `/ars-reviewer` |
| Do everything end-to-end | `academic-pipeline` — say "I want a complete research paper" |

## What's next?

- [Full README](README.md) — all features, modes, installation options, and changelog
- [docs/SETUP.md](docs/SETUP.md) — detailed setup, troubleshooting, optional configuration
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — pipeline view, stage-by-stage matrix
- [中文版](README.zh-TW.md) — Traditional Chinese version
- [Pipeline showcase](examples/showcase/) — real artifacts from a complete pipeline run
