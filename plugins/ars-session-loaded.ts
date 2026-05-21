import type { Plugin } from "@opencode-ai/plugin"

/**
 * ars-session-loaded
 *
 * OpenCode port of the upstream Claude Code SessionStart hook
 * (hooks/hooks.json -> scripts/announce-ars-loaded.sh).
 *
 * Logs a short notice to the OpenCode app log when a new session is
 * created, so the user can confirm the Academic Research Skills suite
 * is active.
 *
 * Skill auto-discovery in OpenCode is metadata-driven
 * (skills/<name>/SKILL.md frontmatter), so this plugin does NOT need to
 * inject a system message to make the skills visible to the model. It
 * exists for observability and parity with the upstream announce script.
 *
 * Hook channel: the @opencode-ai/plugin runtime exposes a single
 * `event` callback for lifecycle events. We filter for
 * `session.created` and ignore everything else.
 */
export const ARSLoadedPlugin: Plugin = async ({ client }) => {
  const message = [
    "Academic Research Skills (ARS) loaded.",
    "",
    "Skills auto-discovered:",
    "  - deep-research          (13 agents, 7 modes)",
    "  - academic-paper         (12 agents, 10 modes)",
    "  - academic-paper-reviewer (7 agents, 6 modes)",
    "  - academic-pipeline      (10-stage orchestrator)",
    "",
    "Slash commands:",
    "  /ars-plan            Socratic chapter-by-chapter planning",
    "  /ars-full            Full pipeline (research -> finalize)",
    "  /ars-lit-review      Literature review",
    "  /ars-outline         Detailed outline + evidence map",
    "  /ars-abstract        Bilingual abstract + keywords",
    "  /ars-reviewer        Simulated peer-review panel",
    "  /ars-revision        Apply reviewer comments",
    "  /ars-revision-coach  Revision roadmap + response letter",
    "  /ars-citation-check  Citation error report",
    "  /ars-format-convert  LaTeX / DOCX / PDF / Markdown",
    "  /ars-disclosure      Venue-specific AI-usage statement",
    "  /ars-mark-read       Record human-read signal",
    "  /ars-unmark-read     Rescind human-read signal",
  ].join("\n")

  return {
    event: async ({ event }) => {
      if (event.type !== "session.created") {
        return
      }
      try {
        await client.app.log({
          body: {
            service: "ars-session-loaded",
            level: "info",
            message,
          },
        })
      } catch (_err) {
        // Best-effort. Never break the session.
      }
    },
  }
}
