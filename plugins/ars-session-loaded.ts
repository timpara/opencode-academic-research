import type { Plugin } from "@opencode-ai/plugin"
import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"

/**
 * ars-session-loaded
 *
 * OpenCode plugin for the Academic Research Skills suite.
 *
 * Hooks:
 *   event (session.created)       — logs a startup notice confirming ARS is active
 *   tool.execute.before           — write-scope guard: enforces per-agent write
 *                                   boundaries from ars_phase_scope_manifest.json
 *   shell.env                     — injects ARS env vars into shell executions
 *   experimental.session.compacting — preserves ARS state across context compaction
 *
 * The write guard is ADVISORY by default — it logs violations but does not
 * block writes. Set ARS_WRITE_GUARD=strict to throw and block out-of-scope writes.
 */

// --- Types ---

interface AgentEntry {
  bucket: string
  skill: string
  phase: string
  allowed_write_globs: string[]
}

interface PhaseManifest {
  version: number
  agents: Record<string, AgentEntry>
}

// --- Helpers ---

/**
 * Load the phase scope manifest from the repo.
 * Searches relative to plugin location and cwd.
 */
function loadManifest(pluginDir: string, workDir: string): PhaseManifest | null {
  const candidates = [
    resolve(pluginDir, "..", "scripts", "ars_phase_scope_manifest.json"),
    resolve(workDir, "scripts", "ars_phase_scope_manifest.json"),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, "utf-8"))
      } catch {
        return null
      }
    }
  }
  return null
}

/**
 * Match a file path against a glob pattern.
 * Supports: "phase1_*\/**", "phase7_*\/paper.md", "**\/*.yaml"
 */
function matchGlob(filePath: string, glob: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "")
  const regexStr = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/{{GLOBSTAR}}/g, ".*")
  return new RegExp(`^${regexStr}$`).test(normalized)
}

/**
 * Count unique *_agent.md files in a directory tree.
 */
function countAgents(workDir: string): number {
  try {
    const { execSync } = require("node:child_process")
    const output = execSync(
      `find "${workDir}/skills" -name "*_agent.md" -not -path "*/.git/*" 2>/dev/null | wc -l`,
      { encoding: "utf-8" },
    )
    return parseInt(output.trim(), 10) || 0
  } catch {
    return 38 // fallback to known count
  }
}

// --- Plugin ---

export const ARSPlugin: Plugin = async ({ client, directory, worktree }) => {
  const pluginDir = dirname(new URL(import.meta.url).pathname)
  const workDir = worktree || directory
  const manifest = loadManifest(pluginDir, workDir)
  const isStrict = process.env.ARS_WRITE_GUARD === "strict"
  const agentCount = countAgents(workDir)

  // Build the startup message
  const guardStatus = manifest
    ? `active${isStrict ? " [STRICT — will block out-of-scope writes]" : " [advisory]"}`
    : "manifest not found (guard disabled)"

  const startupMessage = [
    `Academic Research Skills (ARS) v3.13.0 loaded.`,
    ``,
    `Skills:`,
    `  deep-research            13 agents, 8 modes`,
    `  academic-paper           12 agents, 11 modes`,
    `  academic-paper-reviewer   7 agents, 6 modes`,
    `  academic-pipeline        10-stage orchestrator`,
    ``,
    `Commands: 16 (/ars-plan, /ars-full, /ars-lit-review, /ars-reviewer, ...)`,
    `Agents: ${agentCount} unique *_agent.md files`,
    `Write-scope guard: ${guardStatus}`,
  ].join("\n")

  return {
    // --- Session event: announce ARS on session creation ---
    event: async ({ event }) => {
      if (event.type === "session.created") {
        try {
          await client.app.log({
            body: {
              service: "ars-session-loaded",
              level: "info",
              message: startupMessage,
            },
          })
        } catch {
          // Best-effort. Never break the session.
        }
      }
    },

    // --- Write-scope guard: enforce phase boundaries on file writes ---
    "tool.execute.before": async (input, output) => {
      if (!manifest) return

      // Only guard write-capable tools
      const writeTools = ["write", "edit", "multiedit", "apply_patch"]
      const toolName = (input.tool ?? "").toLowerCase()
      if (!writeTools.includes(toolName)) return

      // Extract the target file path from tool args
      const args = output.args as Record<string, unknown> | undefined
      const filePath =
        (args?.filePath as string) ??
        (args?.file_path as string) ??
        (args?.path as string) ??
        ""
      if (!filePath) return

      // Normalize to workspace-relative path
      const relative = filePath.startsWith(workDir)
        ? filePath.slice(workDir.length + 1)
        : filePath.replace(/^\.\//, "")

      // Only guard writes to phase directories (phase1_*, phase2_*, etc.)
      // Infrastructure files (scripts/, docs/, etc.) are always allowed.
      if (!/^phase\d/.test(relative)) return

      // Check if the path matches ANY agent's allowed write globs.
      // Since OpenCode's tool.execute.before doesn't expose the active
      // subagent identity, we enforce the weaker invariant: all phase-dir
      // writes must land in SOME agent's allowed scope.
      const inScope = Object.values(manifest.agents).some((entry) =>
        entry.allowed_write_globs.some((glob) => matchGlob(relative, glob)),
      )

      if (!inScope) {
        const msg =
          `[ARS write-guard] write to "${relative}" is outside all ` +
          `agents' allowed_write_globs in ars_phase_scope_manifest.json`

        if (isStrict) {
          // In strict mode, throw to BLOCK the write
          await client.app.log({
            body: { service: "ars-write-guard", level: "error", message: `BLOCKED: ${msg}` },
          }).catch(() => {})
          throw new Error(msg)
        }

        // Advisory mode: log warning but allow the write
        await client.app.log({
          body: { service: "ars-write-guard", level: "warn", message: `WARNING: ${msg}` },
        }).catch(() => {})
      }
    },

    // --- Shell env: inject ARS environment variables ---
    "shell.env": async (_input, output) => {
      // Ensure ARS Python scripts can find the manifest and cache
      const env = output.env as Record<string, string>
      if (!env.ARS_MANIFEST_PATH && manifest) {
        const manifestPath = resolve(workDir, "scripts", "ars_phase_scope_manifest.json")
        if (existsSync(manifestPath)) {
          env.ARS_MANIFEST_PATH = manifestPath
        }
      }
      // Propagate strict guard mode to child processes
      if (isStrict && !env.ARS_WRITE_GUARD) {
        env.ARS_WRITE_GUARD = "strict"
      }
    },

    // --- Compaction: preserve ARS pipeline state across context resets ---
    "experimental.session.compacting": async (_input, output) => {
      const context = output.context as string[]
      context.push(`## ARS Pipeline State (preserved across compaction)

This session uses the Academic Research Skills (ARS) v3.13.0 suite.

Key context to preserve:
- Active skill and mode (check the most recent /ars-* command invocation)
- Current pipeline phase (if running /ars-full, note which stage: research/write/review/revise/finalize)
- Material Passport path and any human-read acknowledgments
- Citation keys that failed verification (need re-check or /ars-cache-invalidate)
- Write-scope guard mode: ${isStrict ? "STRICT (blocks out-of-scope writes)" : "advisory (logs only)"}
- Any cross-model verification results or integrity gate outcomes

Available commands: /ars-plan, /ars-full, /ars-lit-review, /ars-reviewer,
/ars-revision, /ars-revision-coach, /ars-abstract, /ars-outline,
/ars-citation-check, /ars-format-convert, /ars-disclosure,
/ars-mark-read, /ars-unmark-read, /ars-cache-invalidate, /ars-3w, /ars-rebuttal-audit

Routing: if the user's intent spans multiple pipeline phases, clarify before routing.
Do NOT auto-route ambiguous cross-phase materials to a single-phase agent.`)
    },
  }
}
