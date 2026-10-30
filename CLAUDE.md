# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A UI-only mod for Sid Meier's Civilization VII that keeps chosen diplomatic agreements (Open
Borders, Research Collaboration, Counterspy, …) running by re-proposing them when they expire.
Plain ES modules, **no build step, no bundler, no TypeScript, no tests** — the game loads the
`.js` files directly.

## Read this first

[`documentation/README.md`](documentation/README.md) is the index. Before writing anything in
`ui/engine/`, read [`documentation/03-diplomacy-api.md`](documentation/03-diplomacy-api.md) **and**
the file it is drawn from: `../better-commerce-screen-ui/ui/engine/diplomacy.js`, the working
implementation of proposing a diplomatic action from script.

**Status: 1.0** (2026-10-30). The sync toggle in the diplomacy action list records choices
(`ui/screen/sync-toggle.js`, `ui/engine/renewals.js`); `ui/engine/renewal-loop.js` proposes them
again at `LocalPlayerTurnBegin`. `ui/screen/renewal-toast.js` reports them. Not yet: the Influence reserve, options. The icon PNG is generated: `python tools/make-icons.py` from `assets/sync.svg`.

## Commands

The game never reads this repository — it reads a copy in its own mod folder.

```bash
./deploy.sh
```

```bash
./deploy.sh --dry
```

After deploying, **return to the main menu or restart** — scripts are loaded once.

Logs: `%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VII\Logs\` — `UI.log` (this mod's
output, prefixed `najane-recurring-diplomacy:`), `Modding.log`, `Database.log`.

⚠️ `node --check` is worthless on these files (CommonJS parse, exits 0 on a broken ES module).
`deploy.sh` runs `node --input-type=module --check < file` on every script.

⚠️ `console.log` never reaches `UI.log`. Use `log()` / `warn()` from `ui/support/diagnostics.js`.
`log()` is gated on `DIAGNOSTICS`, which ships `false`; a temporary probe must use `warn()`.

## Architecture

```
support  ←  engine  ←  screen        options: game AND shell scope
```

Never import upwards — the renewal loop runs at turn start with no screen open. See
[`documentation/02-architecture.md`](documentation/02-architecture.md).

## Rules that are easy to break

1. **Never propose anything the player did not enable**, never war, never below the Influence
   reserve. The mod acts in the player's name; a surprise proposal is a bug. Sanctions ARE allowed
   once the player switches them on (user's instruction, 2026-10-30).
2. **Track `proposedThisTurn`.** `sendRequest` queues, and `canStart` keeps saying "yes" for a
   frame or two after it. See 03.
3. **Never match on `FailureReasons` text** — it is composed and translated. The one exception
   (`isInfluenceReason`, `ui/screen/influence-chips.js`) compares against the game's own key
   composed with the same numbers, and fails safe. ⚠️ The game lists only the FIRST obstacle.
4. **`canStart` is expensive.** Only ask about enabled, inactive, not-yet-proposed pairs.
5. **Engine events fire for every player.** Filter to the local player; one `engine.on` per event
   name through a dispatcher.
6. **Wrap every call into the game in `try`/`catch` and `warn`.**
7. **The changelog is `STEAM_CHANGELOG.bbcode`**, written for the player, newest section first,
   old sections never deleted. `steam-description.bbcode` has the 6000-character limit.
8. **Game state lives IN THE SAVE** (user's instruction, 2026-10-29): which agreements are kept
   running is stored through the game's `Catalog` (player properties), never in `localStorage` —
   the seed survives a reload, so seed-keyed `localStorage` leaks choices into older saves. A
   player-catalog write is queued; read through `renewals.js`, which covers the gap.
9. **`game-files-snapshots/`**: a change that imports from or overrides a game file adds that file
   there in the same change; keep at most two game versions.
10. **Set `DIAGNOSTICS = false` before publishing.**

## Conventions

⚠️ **EVERYTHING WRITTEN TO A FILE IS IN ENGLISH**, whatever language the conversation is in. The
only non-English text that belongs in a file is the translations in `text/<locale>/`.

4-space indent, semicolons, single quotes, trailing commas. `camelCase` functions,
`SCREAMING_SNAKE` module constants, `LOC_NAJANE_RECURRING_*` localisation keys, `najane-*` CSS
classes. Imports of game files are absolute (`/core/…`, `/base-standard/…`), of this mod's files
relative. Every module opens with a block comment saying what it is for and why it lives in its
layer. Keep the FACT in a `⚠️` comment, not the story.

New localisation keys go into every `text/<locale>/InGameText.xml` (currently `en_us`, `de_DE`, `es_ES`, `fr_FR`, `it_IT`, `ja_JP`, `ko_KR`, `pl_PL`, `pt_BR`, `ru_RU` (Ukrainian - see the file), `zh_Hans_CN`, `zh_Hant_HK`).
Non-English files use `<LocalizedText>` with `Language=`, never `<EnglishText>`.

Options go into the shared Najane section via `ui/options/najane-mod-options-registry.js`, copied
**verbatim** from the sibling mods; this mod's `sort` is **50**.

## ⚠️⚠️ STANDING RULE: DO NOT GUESS AT A BUG — LOG IT AND READ THE LOG

When something does not work and the cause is not visible in the code, the next step is a
`warn()` at the decision point, a deploy, and a read of `UI.log` — not another hypothesis. Log
the values the branch turns on, filter to the failing case, check the `loaded, build <stamp>` line
first, and remove the probes once the answer is in a `⚠️` comment.
