#!/usr/bin/env bash
#
# install.sh — symlink ARS skills, commands, and plugins into the user's
# OpenCode config so OpenCode auto-discovers them from ANY project.
#
# OpenCode discovers from two locations:
#   1. Project-local: .opencode/{skills,commands,plugins}/ (works when
#      you run OpenCode inside THIS repo — already configured via symlinks
#      in .opencode/ checked into git)
#   2. Global: $XDG_CONFIG_HOME/opencode/{skills,commands,plugins}/
#      (works from ANY directory — this is what install.sh sets up)
#
# Usage:
#   ./install.sh           # symlink into ~/.config/opencode/
#   ./install.sh --force   # overwrite existing symlinks/files
#   ./install.sh --dry-run # print what would happen, do nothing
#   ./install.sh --uninstall  # remove the symlinks
#
# Idempotent. Safe to run repeatedly.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
OC_HOME="$CONFIG_HOME/opencode"

FORCE=0
DRY_RUN=0
UNINSTALL=0

for arg in "$@"; do
    case "$arg" in
        --force) FORCE=1 ;;
        --dry-run) DRY_RUN=1 ;;
        --uninstall) UNINSTALL=1 ;;
        -h|--help)
            sed -n '2,16p' "$0"
            exit 0
            ;;
        *)
            echo "Unknown argument: $arg" >&2
            exit 1
            ;;
    esac
done

run() {
    if [[ $DRY_RUN -eq 1 ]]; then
        echo "  [dry-run] $*"
    else
        "$@"
    fi
}

link_one() {
    local src="$1"
    local dest="$2"
    local name
    name="$(basename "$src")"

    if [[ -L "$dest" ]]; then
        local current
        current="$(readlink "$dest")"
        if [[ "$current" == "$src" ]]; then
            echo "  ok    $name (already linked)"
            return
        fi
        if [[ $FORCE -eq 1 ]]; then
            echo "  retag $name (was: $current)"
            run rm "$dest"
        else
            echo "  skip  $name (different symlink: $current; use --force)" >&2
            return
        fi
    elif [[ -e "$dest" ]]; then
        if [[ $FORCE -eq 1 ]]; then
            echo "  back  $name -> $name.bak"
            run mv "$dest" "$dest.bak"
        else
            echo "  skip  $name (file/dir exists; use --force to back up)" >&2
            return
        fi
    fi

    echo "  link  $name"
    run ln -s "$src" "$dest"
}

unlink_one() {
    local dest="$1"
    local name
    name="$(basename "$dest")"
    if [[ -L "$dest" ]]; then
        local current
        current="$(readlink "$dest")"
        if [[ "$current" == "$REPO_ROOT/"* ]]; then
            echo "  unlink $name"
            run rm "$dest"
            return
        fi
        echo "  skip  $name (symlink does not point into this repo: $current)" >&2
        return
    fi
    if [[ -e "$dest" ]]; then
        echo "  skip  $name (not a symlink)" >&2
        return
    fi
    echo "  ok    $name (already absent)"
}

ensure_dir() {
    local d="$1"
    if [[ ! -d "$d" ]]; then
        echo "  mkdir $d"
        run mkdir -p "$d"
    fi
}

main_install() {
    echo "Installing into: $OC_HOME"
    ensure_dir "$OC_HOME/skills"
    ensure_dir "$OC_HOME/commands"
    ensure_dir "$OC_HOME/plugins"

    echo "Skills:"
    for d in "$REPO_ROOT/skills"/*/; do
        [[ -d "$d" ]] || continue
        local name
        name="$(basename "$d")"
        link_one "${d%/}" "$OC_HOME/skills/$name"
    done

    echo "Commands:"
    for f in "$REPO_ROOT/commands"/*.md; do
        [[ -f "$f" ]] || continue
        link_one "$f" "$OC_HOME/commands/$(basename "$f")"
    done

    echo "Plugins:"
    for f in "$REPO_ROOT/plugins"/*.ts; do
        [[ -f "$f" ]] || continue
        link_one "$f" "$OC_HOME/plugins/$(basename "$f")"
    done

    echo
    echo "Next steps:"
    echo "  1. bun install                # in this repo, so the plugin runs"
    echo "  2. uv sync --extra dev        # in this repo, so the Python scripts run"
    echo "  3. open OpenCode and try: /ars-plan"
    echo
    echo "Note: When working INSIDE this repo, OpenCode auto-discovers from"
    echo ".opencode/ without needing this install. The global install makes"
    echo "ARS available from any working directory."
}

main_uninstall() {
    echo "Uninstalling from: $OC_HOME"

    echo "Skills:"
    for d in "$REPO_ROOT/skills"/*/; do
        [[ -d "$d" ]] || continue
        local name
        name="$(basename "$d")"
        unlink_one "$OC_HOME/skills/$name"
    done

    echo "Commands:"
    for f in "$REPO_ROOT/commands"/*.md; do
        [[ -f "$f" ]] || continue
        unlink_one "$OC_HOME/commands/$(basename "$f")"
    done

    echo "Plugins:"
    for f in "$REPO_ROOT/plugins"/*.ts; do
        [[ -f "$f" ]] || continue
        unlink_one "$OC_HOME/plugins/$(basename "$f")"
    done
}

if [[ $UNINSTALL -eq 1 ]]; then
    main_uninstall
else
    main_install
fi
