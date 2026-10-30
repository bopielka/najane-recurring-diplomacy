#!/usr/bin/env bash
#
# Deploys "Recurring Diplomacy by Najane" into Civilization VII's mod folder.
#
# The game folder is build output: it is wiped and rebuilt on every run, and only the .modinfo,
# ui/, text/ and icons/ are copied - README, documentation/, assets/, tools/, this script, .git and
# game-files-snapshots/ stay out by construction, not by an exclude list that can drift.
#
# Usage:  ./deploy.sh          deploy
#         ./deploy.sh --dry    show what would happen, change nothing
#         CIV7_MODS_DIR="/path/to/Mods" ./deploy.sh
#
set -euo pipefail

MOD_ID="najane-recurring-diplomacy"
CONTENT_DIRS=(ui text config icons)

case "$(uname -s)" in
    Darwin) DEFAULT_MODS_DIR="$HOME/Library/Application Support/Civilization VII/Mods" ;;
    *)      DEFAULT_MODS_DIR="${LOCALAPPDATA:-$HOME/AppData/Local}/Firaxis Games/Sid Meier's Civilization VII/Mods" ;;
esac

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_ROOT="${CIV7_MODS_DIR:-$DEFAULT_MODS_DIR}"
DEST_DIR="$DEST_ROOT/$MOD_ID"

DRY_RUN=0
[[ "${1:-}" == "--dry" ]] && DRY_RUN=1

say() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Double-clicked in Explorer the window closes the instant the script ends; hold it open then.
if [[ $- == *i* ]]; then
    trap 'printf "\nPress Enter to close... "; read -r' EXIT
fi

# --- safety: never let a bad path turn this into a destructive command --------
[[ -f "$SRC_DIR/$MOD_ID.modinfo" ]] || die "$MOD_ID.modinfo not found in $SRC_DIR."
[[ "$(basename "$DEST_DIR")" == "$MOD_ID" ]] || die "refusing to touch '$DEST_DIR'."
[[ -d "$DEST_ROOT" ]] || die "Civ VII mods folder not found: $DEST_ROOT (set CIV7_MODS_DIR)"

say "source: $SRC_DIR"
say "target: $DEST_DIR"
say ""

if [[ $DRY_RUN -eq 1 ]]; then
    say "[dry run] would remove the target folder and copy:"
    ( cd "$SRC_DIR" && find "$MOD_ID.modinfo" "${CONTENT_DIRS[@]}" -type f 2>/dev/null | sort | sed 's/^/  /' ) || true
    say "[dry run] nothing was changed."
    exit 0
fi

# --- check: every script must parse -------------------------------------------
# ⚠️ `node --check file.js` parses as CommonJS and exits 0 on an ES module with a syntax error;
# stdin with --input-type=module is the check that works. `type -P` skips Git Bash's
# `alias node='winpty node.exe'`, which fails with redirected stdin.
NODE_BIN="$(type -P node || true)"
if [[ -n "$NODE_BIN" ]]; then
    broken=0
    while IFS= read -r file; do
        "$NODE_BIN" --input-type=module --check < "$SRC_DIR/$file" >/dev/null 2>&1 || {
            printf 'SYNTAX ERROR: %s\n' "$file" >&2
            "$NODE_BIN" --input-type=module --check < "$SRC_DIR/$file" 2>&1 | sed -n '1,4p' >&2
            broken=$((broken + 1))
        }
    done < <(cd "$SRC_DIR" && find ui -name '*.js' -type f | sort)
    [[ $broken -eq 0 ]] || die "$broken file(s) do not parse - the mod would not load."
else
    say "note: node not found, skipping the syntax check"
fi

# --- check: a backtick inside a style block ends the string early -------------
# CSS lives in template literals; a backtick inside one (e.g. in a CSS comment) closes it and the
# module fails to load, taking the whole mod with it.
stray=0
while IFS= read -r hit; do
    printf 'BACKTICK INSIDE A STYLE BLOCK: %s\n' "$hit" >&2
    stray=$((stray + 1))
done < <(
    cd "$SRC_DIR" && find ui -name '*.js' -type f 2>/dev/null | sort | while IFS= read -r file; do
        awk -v f="$file" '
            /^const [A-Za-z_]+ = `$/ { inside = 1; next }
            inside && /^`;$/         { inside = 0; next }
            inside && /`/            { printf "%s:%d  %s\n", f, NR, $0 }
        ' "$file"
    done
)
[[ $stray -eq 0 ]] || die "$stray stray backtick(s) - the mod would fail to load. Use quotes in CSS comments."

# --- check: the Steam description has a hard 6000-character limit -------------
# Steam truncates silently, and the tail it drops is where the credits and source link live.
DESCRIPTION="$SRC_DIR/steam-description.bbcode"
DESCRIPTION_LIMIT=6000
if [[ -f "$DESCRIPTION" ]]; then
    size=$(wc -c < "$DESCRIPTION" | tr -d '[:space:]')
    [[ "$size" -le "$DESCRIPTION_LIMIT" ]] \
        || die "steam-description.bbcode is $size characters; Steam allows $DESCRIPTION_LIMIT. Trim it."
    say "steam description: $size/$DESCRIPTION_LIMIT characters"
fi

# ⚠️ STEAM_CHANGELOG.bbcode has NO limit: only its newest section is ever pasted into the
# Workshop's change note, so the file is the archive and old sections are never deleted.
CHANGES="$SRC_DIR/STEAM_CHANGELOG.bbcode"
if [[ -f "$CHANGES" ]]; then
    say "steam changelog: $(wc -c < "$CHANGES" | tr -d '[:space:]') characters (no limit; newest section only is posted)"
fi

# --- deploy ------------------------------------------------------------------
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"

cp "$SRC_DIR/$MOD_ID.modinfo" "$DEST_DIR/"
for dir in "${CONTENT_DIRS[@]}"; do
    [[ -d "$SRC_DIR/$dir" ]] && cp -r "$SRC_DIR/$dir" "$DEST_DIR/"
done

# --- stamp the build ----------------------------------------------------------
# Scripts load once, at startup or on returning to the main menu, so a deploy into a running game
# changes nothing until then. The mod prints this stamp on load: one line in UI.log answers "is
# the running game actually running this build?". Never edited by hand, not in git.
BUILD_STAMP=$(date '+%Y-%m-%d %H:%M:%S')
cat > "$DEST_DIR/ui/support/build-stamp.js" <<EOF
/** Generated at deploy time. Not the source of truth for anything. */
export const BUILD_STAMP = '$BUILD_STAMP';
EOF
# The source tree needs the file too, or the import fails when running from source.
[[ -f "$SRC_DIR/ui/support/build-stamp.js" ]] || cat > "$SRC_DIR/ui/support/build-stamp.js" <<EOF
/** Generated at deploy time. Not the source of truth for anything. */
export const BUILD_STAMP = 'not deployed';
EOF

# --- verify: every file the .modinfo references must exist in the target ------
missing=0
while IFS= read -r item; do
    [[ -z "$item" ]] && continue
    if [[ ! -f "$DEST_DIR/$item" ]]; then
        printf 'MISSING: %s (referenced by .modinfo)\n' "$item" >&2
        missing=$((missing + 1))
    fi
done < <(grep -o '<\(Item\|File\)[^>]*>[^<]*</\(Item\|File\)>' "$DEST_DIR/$MOD_ID.modinfo" \
         | sed 's/<[^>]*>//g')

say "deployed $(find "$DEST_DIR" -type f | wc -l | tr -d '[:space:]') files"
[[ $missing -eq 0 ]] || die "$missing file(s) referenced by the .modinfo are missing - the mod will not load correctly."
say "all .modinfo references resolved"
say ""
say "Restart the game, or return to the main menu, to reload the mod."
