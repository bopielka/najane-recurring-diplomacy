# 01 — What the mod does

**Status: design, partly built.** Mark each item ✅ here as it ships, and add the module that
implements it.

## ✅ The sync toggle (`ui/screen/sync-toggle.js`, `ui/engine/renewals.js`)

Every renewable row in the diplomacy screen's action list (Treaties, Endeavours, Espionage) gets a
small square button with the sync icon, just left of the Influence cost. **Lit gold frame = on**
(keep renewing this agreement with this leader), **grey frame = off**. Clicking it flips the state
without starting the action through the row; turning it ON then proposes the agreement at once
(the game's own `clickQuickStartActionItem`, the same check and request as a click on the row), if
the game allows it now. Turning it OFF cancels nothing. When ON, its glow pulses gently and the icon turns slowly. The
toggle is never greyed with the row: on a row the game disables (agreement already running) it
is still clickable, so it stays at full brightness, on or off.

The choice is stored **in the save**, per leader (`Catalog` `NajaneRecurringDiplomacy`, see
`ui/engine/renewals.js`), so it is deterministic: loading an older save brings back exactly the
toggles that save had. ⚠️ It was briefly kept in `localStorage` keyed by the game seed; that leaked
choices into older saves of the same game, because the seed survives a reload.

**How many leaders at once** (`instanceLimit` in `ui/engine/renewals.js`). Treaties
(`SingleInstanceProject="false"`) can be kept with every leader. Every other renewable action
(endeavours, espionage) runs one instance at a time across all leaders. Leader or civilization
traits can add extra instances: Benjamin Franklin's +1 endeavour, read from the modifiers'
`DIPLOMACY_BASIC_MODIFIER_VALUE_EXTRA_SINGLE_INSTANCE*` arguments rather than hard-coded. When the limit
is full (kept running with other leaders), the toggle is shown **blocked**: dark frame and a faint
icon. A plain click does nothing, and the tooltip names those leaders. **Shift+click** moves it to
this leader, dropping the leader it was switched on with longest ago, and proposes it here at once
if the game allows. ❓ Franklin's limit of two is not yet confirmed in game.

**Influence chips** (`ui/screen/influence-chips.js`, user's instruction, 2026-10-30, Better City
UI's two chips copied 1:1). Every row with a price, on a leader's or an independent power's list,
shows it as a chip, greyed while the action cannot be started (a click on a live chip starts it,
like the row). While the price is above the player's Influence - or while already marked - an
**hourglass** chip sits beside it: "start this ONCE as soon as there is enough". Stored in the save
(object `waiting`); the renewal loop starts it at the first turn start the game allows and drops
the mark. It never renews: that is the sync toggle's job. Sanctions and war never get it.
Anything aimed at an independent power shows blue in the summary, like espionage, and its row in
the summary carries the action's icon. ❓ Not yet seen in game.

Rows that get no toggle: sanctions, city-state projects, war and alliance, zero-turn actions
(Improve Trade Relations, Send Gold), actions that ask for a second target, the "renew a recently
completed project" rows, and anything on the local player's own screen or an independent's.

The renewal loop (`ui/engine/renewal-loop.js`) acts on it: see "The behaviour" below. ❓ Not
yet seen renewing in game.

Clicks reach the toggle on a disabled row too: the grey overlay is `pointer-events-none`, and the
toggle handles `engine-input` itself before the row sees it. ❓ Not yet confirmed in game.

## The problem

Treaties, endeavours and counter-espionage in Civilization VII last a fixed number of turns
(10–20 at standard speed — see the table in [03](03-diplomacy-api.md)). When one runs out the game
does not offer to renew it; the player has to notice, open the Diplomacy screen, find the leader
and propose it again. Over a long game with several leaders that is dozens of clicks for decisions
the player already made once.

## The behaviour

1. **The player chooses what to keep running** — per leader, per agreement. Nothing is renewed by
   default: a fresh install changes nothing until the player opts in.
2. ✅ (`ui/engine/renewal-loop.js`, unverified in game) **At the start of the player's turn** (`LocalPlayerTurnBegin`), for every chosen
   (leader, agreement) pair that is not currently active and was not already proposed this turn,
   the mod asks the engine whether it may propose it (`canStart`) and, if so, proposes it
   (`sendRequest`). Details and traps: [03](03-diplomacy-api.md).
3. **Influence reserve.** A renewal is skipped if it would leave the player below a reserve they
   set. Renewals are ordered by the player's priority, so a short budget goes to what matters most.
4. ✅ (`ui/screen/renewal-toast.js`, a box at the top of the screen like Better Commerce's treasure-convoy toast) **Reporting.** After a turn in which anything was proposed, one short summary tells the
   player what was proposed and to whom: a title and the actions, no verb. Left-aligned: a larger
   bold title, then one row per leader: the portrait and an opaque card (name in bold, one bullet per action). Bullets are coloured by the answer (`DiplomacyEventResponse`): green agreed, blue espionage (nobody answers it), red refused, plain while waiting. ❓ When the AI answers is not yet seen in game. Refusals the player cannot fix (leader at war, agreement
   locked in this age) are not repeated every turn.
5. **The other leader can still say no.** The mod never claims an agreement is renewed — only
   proposed. A refused proposal is retried on a later turn, not every frame.

## What the mod never does

- Change rules, costs, durations or AI behaviour. `AffectsSavedGames = 0` - honest about the
  rules, but the toggles ARE written into the save as player properties. ❓ Not yet tested: a save
  loaded without the mod should simply carry them unread.
- Propose anything hostile (sanctions, sabotage, war) or anything the player did not enable.
- Spend Influence below the reserve.
- Act during another player's turn, or on behalf of any player but the local one.

## Where the player's choices live

❓ To be decided:

- **Global switches** (on/off, Influence reserve, which agreement types are renewable at all) fit
  the shared Najane options section (Options → Mods), through
  `ui/options/najane-mod-options-registry.js`, copied verbatim from the sibling mods. This mod's
  `sort` slot is **50** (10 specialists · 20 city · 30 commerce · 40 journal).
- **Per-leader choices**: ✅ decided — the sync toggle above, on the leader's diplomacy screen.

## Open design questions

- Should an agreement the **AI** started (and the player accepted) also be renewable? Probably
  yes — the player only cares that it keeps running, not who started it.
- What happens at an **age transition**, when agreements end and the leader list may change?
  Choices keyed by leader id must be validated after `GameStarted`.
- Multiplayer: renewal runs only for the local player and only on their turn; no extra
  synchronisation should be needed, but it must be checked once in a hot-seat game.
