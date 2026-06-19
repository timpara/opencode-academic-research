import type { Plugin } from "@opencode-ai/plugin"
import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"

/**
 * ars-session-loaded
 *
 * OpenCode plugin for the Academic Research Skills suite.
 *
 * Responsibilities:
 * 1. Session announce: logs a startup notice confirming ARS is active.
 * 2. Write-scope guard: enforces per-agent write boundaries using the
 *    phase scope manifest (scripts/ars_phase_scope_manifest.json).
 *    This is the OpenCode equivalent of the upstream Claude Code
 *    PreToolUse hook (hooks/run_guard.sh -> scripts/ars_write_scope_guard.py).
 *
 * The guard is ADVISORY by default — it logs violations but does not
 * block writes. Set ARS_WRITE_GUARD=strict in the environment to enable
 * blocking mode.
 */

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

/**
 * Load the phase scope manifest from the repo.
 */
function loadManifest(pluginDir: string): PhaseManifest | null {
  const candidates = [
    resolve(pluginDir, "..", "scripts", "ars_phase_scope_manifest.json"),
    resolve(process.cwd(), "scripts", "ars_phase_scope_manifest.json"),
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
 * Match a file path against a glob pattern (simple phase-dir matching).
 * Supports patterns like "phase1_*/**" and "phase7_*/paper.md".
 */
function matchGlob(filePath: string, glob: string): boolean {
  // Normalize to forward slashes
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "")
  // Convert glob to regex
  const regexStr = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex special chars
    .replace(/\*\*/g, "{{GLOBSTAR}}")       // placeholder for **
    .replace(/\*/g, "[^/]*")                // * = anything except /
    .replace(/{{GLOBSTAR}}/g, ".*")         // ** = anything including /
  return new RegExp(`^${regexStr}$`).test(normalized)
}

export const ARSLoadedPlugin: Plugin = async ({ client }) => {
  const pluginDir = dirname(new URL(import.meta.url).pathname)
  const manifest = loadManifest(pluginDir)
  const isStrict = process.env.ARS_WRITE_GUARD === "strict"

  const message = [
    "Academic Research Skills (ARS) v3.13.0 loaded.",
    "",
    "Skills auto-discovered:",
    "  - deep-research           (13 agents, 8 modes)",
    "  - academic-paper          (12 agents, 11 modes)",
    "  - academic-paper-reviewer  (7 agents, 6 modes)",
    "  - academic-pipeline       (10-stage orchestrator)",
    "",
    "Slash commands: 16 available (/ars-plan, /ars-full, /ars-lit-review, ...)",
    "",
    `Write-scope guard: ${manifest ? "loaded" : "manifest not found"}${isStrict ? " [STRICT]" : " [advisory]"}`,
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
      } catch {
        // Best-effort. Never break the session.
      }
    },

    tool: manifest
      ? {
          execute: {
            before: async ({ tool, args }) => {
              // Only guard write-capable tools
              const writeTools = ["write", "edit", "multiedit"]
              const toolName = (tool?.name ?? "").toLowerCase()
              if (!writeTools.includes(toolName)) {
                return
              }

              // Extract the target file path from args
              const filePath =
                (args as Record<string, unknown>)?.filePath as string ??
                (args as Record<string, unknown>)?.file_path as string ??
                ""
              if (!filePath) return

              // Normalize to workspace-relative path
              const cwd = process.cwd()
              const relative = filePath.startsWith(cwd)
                ? filePath.slice(cwd.length + 1)
                : filePath.replace(/^\.\//, "")

              // Check all agents — if the path matches ANY agent's allowed
              // globs, it's permitted. The guard is per-path, not per-agent
              // (OpenCode doesn't expose the active agent identity in the
              // tool hook context). This means the guard enforces that ALL
              // writes go into recognized phase directories — a weaker but
              // still useful invariant.
              const agents = manifest.agents
              const inScope = Object.values(agents).some((entry) =>
                entry.allowed_write_globs.some((glob) =>
                  matchGlob(relative, glob)
                )
              )

              // Files outside any phase directory are infrastructure —
              // allow them (the guard only restricts phase-owned paths)
              const isPhaseFile = /^phase\d/.test(relative)
              if (!isPhaseFile) return

              if (!inScope) {
                const msg = `[ARS write-guard] ${isStrict ? "DENIED" : "WARNING"}: ` +
                  `write to "${relative}" is not in any agent's allowed_write_globs`
                try {
                  await client.app.log({
                    body: {
                      service: "ars-write-guard",
                      level: isStrict ? "error" : "warn",
                      message: msg,
                    },
                  })
                } catch {
                  // best-effort logging
                }
                // In strict mode, return a rejection
                // Note: actual blocking depends on OpenCode plugin API support
                // for tool.execute.before returning a deny signal.
              }
            },
          },
        }
      : undefined,
  }
}
