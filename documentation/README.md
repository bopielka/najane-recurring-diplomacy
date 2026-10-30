# Developer documentation — Recurring Diplomacy by Najane

Written for an AI agent (or a human) starting a **new session** on this mod with no prior context.
Read this file, then the document covering the area you are about to touch.

The repository's own `README.md` is the player- and author-facing document. This folder is the
implementer-facing one.

| # | Document | What it answers |
|---|---|---|
| 01 | [What the mod does](01-what-the-mod-does.md) | The intended behaviour, what it never does, open design questions |
| 02 | [Architecture](02-architecture.md) | Layers, entry points, scopes |
| 03 | [The diplomacy API](03-diplomacy-api.md) | How to propose a diplomatic action from script, the traps, the candidate actions, what is still unknown |
| 04 | [Development workflow](04-development-workflow.md) | Deploying, logs, publishing |

## The one-paragraph summary

A **UI-only** mod for Sid Meier's Civilization VII that keeps chosen diplomatic agreements —
Open Borders, Research Collaboration, Counterspy and other timed treaties and endeavours —
running, by proposing them again through the game's own player operations once they expire. It
changes no rules and declares `AffectsSavedGames = 0`; the player's choices are kept in the
save itself (player properties), so loading an older save restores that save's choices. The proposing mechanism is the one
already shipped in **Better Commerce Screen UI** (`ui/engine/diplomacy.js`), which proposes
"Improve Trade Relations" on the player's behalf.

## Status

The mod loads, and the diplomacy screen shows an on/off sync toggle beside each renewable action
that records the player's choice per game and leader. The renewal loop (actually proposing) and
the options are designed in [01](01-what-the-mod-does.md) and not written. The first implementation step is
answering the open questions at the end of [03](03-diplomacy-api.md) in game, with log probes.
