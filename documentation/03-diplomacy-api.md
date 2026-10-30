# 03 — The diplomacy API: proposing an action from script

How a UI mod proposes a diplomatic action on the player's behalf. The pattern is lifted from a
**working, shipped** implementation: `ui/engine/diplomacy.js` in the sibling mod
**Better Commerce Screen UI** (`../better-commerce-screen-ui/`), which proposes
"Improve Trade Relations" with one click. Read that file before writing `ui/engine/` here — every
⚠️ below was measured there first.

Legend: ✅ verified in game (by the sibling mod) · ❓ not yet verified for this mod's actions.

## The four calls

```js
// 1. The action's numeric type, from its data name.  ✅
const type = DiplomacyActionTypes['DIPLOMACY_ACTION_OPEN_BORDERS'];

// 2. What the game would offer the local player towards one leader.  ✅
const projects = Game.Diplomacy.getProjectDataForUI(
    GameContext.localPlayerID,
    leaderId,
    DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET,
    DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP,
    -1,
    DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET,
) ?? [];
const project = projects.find((entry) => entry.actionType === type);
const cost = project.targetList1?.find((entry) => entry.targetID === leaderId)?.costYieldD ?? 0;

// 3. "May I propose this now?" - the same args object is reused for step 4.  ✅
const args = {
    Amount: 1,
    Player1: GameContext.localPlayerID,
    Player2: leaderId,
    ID: leaderId,
    Type: project.actionType,
};
const result = Game.PlayerOperations.canStart(
    GameContext.localPlayerID, project.operationType, args, false);
// result.Success, result.FailureReasons

// 4. Propose it.  ✅
Game.PlayerOperations.sendRequest(GameContext.localPlayerID, project.operationType, args);
```

`project.operationType` comes from the data (`PlayerOperationType` in
`diplomacy-actions.xml`) — never hardcode it. Several treaties share
`COOPERATIVE_YIELDS_DIPLOMATIC_ACTION`; they are told apart by `Type` in the args.

❓ The args shape above is the game's own "quick start" shape and was verified for a
`Target1Type="DIPLOMACY_TARGET_PLAYER"` / `Target2Type="DIPLOMACY_TARGET_NONE"` action. Every
action this mod targets has that same shape, but each still needs one in-game `canStart` probe
before it is trusted — especially `OPEN_BORDERS_DIPLOMATIC_ACTION` and
`COUNTER_SPY_DIPLOMATIC_ACTION`, which are their own operation types.

The Influence balance, for the reserve check:

```js
Players.get(GameContext.localPlayerID)?.DiplomacyTreasury?.diplomacyBalance ?? 0
```

## Traps already paid for in the sibling mod

- ⚠️ **`sendRequest` QUEUES.** For a frame or two afterwards `canStart` still answers "yes" —
  it describes a state the request has not reached yet. Keep a `proposedThisTurn` set, add to it
  right after `sendRequest`, clear it on `LocalPlayerTurnBegin` and `GameStarted`. Without it the
  renewal loop would propose the same thing twice in one turn.
- ⚠️ **`FailureReasons` are COMPOSED, TRANSLATED SENTENCES**, not localisation keys — measured as
  a full Polish sentence in `UI.log`. Never match on them. Decide "why refused" from data you can
  read yourself (price vs balance, "already proposed this turn").
- ⚠️ **`canStart` answers "may I ask", never "will they say yes".** Most treaties are opposable
  or need acceptance; the other leader can refuse, and Influence is committed while the request is
  in flight. `RejectionRefundsInfluence="true"` on Open Borders and Research Collaboration
  suggests a refusal refunds it there — ❓ not measured.
- ⚠️ **Hostility is not what refuses a proposal.** At relationship level −8 `canStart` still
  allowed "Improve Trade Relations" and complained only about the price. If this mod wants to
  skip hostile leaders, that is a judgement call of its own, not an engine answer.
- ⚠️ **`canStart` is one of the most expensive calls a UI mod can make.** Never loop it over
  every leader × every action without a bound. Ask only about pairs that are (a) enabled by the
  player, (b) not currently active, (c) not already proposed this turn.
- ⚠️ **The engine throws where a browser would return `undefined`.** Every call above goes in a
  `try`/`catch` that `warn`s.

## Open questions this mod has to answer in game

These decide the design of the renewal loop and are **not** answered by the sibling mod, which
only ever proposes a zero-duration action:

1. ❓ **How to tell that an agreement with leader X is currently ACTIVE**, and when it ends.
   Candidates to probe: the `project` returned by `getProjectDataForUI` (does it carry
   active/turns-left fields?), `Game.Diplomacy.getPlayerEvents(...)`, and whatever the game's
   own diplomacy ribbon / leader screen reads. Find it in the game's `ui/diplomacy*` sources and
   capture those files into `game-files-snapshots/` in the same change.
2. ❓ **Whether an active agreement already makes `canStart` refuse** (so "try every turn, let the
   engine say no" would be enough) — or whether a duplicate is accepted and wastes Influence.
   The sibling mod saw `LOC_DIPLOMACY_ACTION_FAILURE_DUPLICATE_PROJECT` for a same-turn repeat.
3. ❓ **Which engine event marks expiry**, if any (`DiplomacyEventEnded`? `DiplomacyEventCompleted`?).
   Polling at `LocalPlayerTurnBegin` is the fallback and is cheap if (1) is cheap.
4. ❓ **What an AI-initiated proposal looks like** — an AI may propose the same treaty first; the
   mod must not counter-propose on top of a pending incoming request.

Per the standing rule in `CLAUDE.md`: answer each with a `warn()` probe and a read of `UI.log`,
not with reasoning from the XML.

## Candidate actions (from `Base/modules/base-standard/data/diplomacy-actions.xml`, game 1.5.0)

Only actions with a finite, positive `BaseDuration` that target one other player make sense to
renew. Durations are base values; game speed scales them.

| Action | Group | Operation | Base turns |
|---|---|---|---|
| `DIPLOMACY_ACTION_OPEN_BORDERS` | TREATY | `OPEN_BORDERS_DIPLOMATIC_ACTION` | 15 |
| `DIPLOMACY_ACTION_RESEARCH_COLLABORATION` | ENDEAVOR | `COOPERATIVE_YIELDS_DIPLOMATIC_ACTION` | 15 |
| `DIPLOMACY_ACTION_CULTURAL_EXCHANGE` | ENDEAVOR | `COOPERATIVE_YIELDS_DIPLOMATIC_ACTION` | 15 |
| `DIPLOMACY_ACTION_SHARE_INNOVATIONS` | ENDEAVOR | `COOPERATIVE_YIELDS_DIPLOMATIC_ACTION` | 15 |
| `DIPLOMACY_ACTION_TRADE_MAP` | ENDEAVOR | `COOPERATIVE_YIELDS_DIPLOMATIC_ACTION` | 15 |
| `DIPLOMACY_ACTION_LOCAL_FESTIVALS` | ENDEAVOR | `COOPERATIVE_YIELDS_DIPLOMATIC_ACTION` | 15 |
| `DIPLOMACY_ACTION_FARMERS_MARKET` | ENDEAVOR | `COOPERATIVE_YIELDS_DIPLOMATIC_ACTION` | 15 |
| `DIPLOMACY_ACTION_MINOR_TRADE` | ENDEAVOR | `COOPERATIVE_YIELDS_DIPLOMATIC_ACTION` | 15 |
| `DIPLOMACY_ACTION_MILITARY_AID` | ENDEAVOR | `COOPERATIVE_YIELDS_DIPLOMATIC_ACTION` | 15 |
| `DIPLOMACY_ACTION_SEND_DELEGATION` | ENDEAVOR | `COOPERATIVE_YIELDS_DIPLOMATIC_ACTION` | 10 |
| `DIPLOMACY_ACTION_COUNTER_SPY` | ESPIONAGE | `COUNTER_SPY_DIPLOMATIC_ACTION` | 20 |
| `DIPLOMACY_ACTION_ESPIONAGE_MILITARY_INFILTRATION` | ESPIONAGE | `MILITARY_INFILTRATION_DIPLOMATIC_ACTION` | 20 |

The whole **espionage group** is markable too, the one-shot ones included (`STEAL_TECH`
21 turns, `STEAL_CIVIC` 21, `MILITARY_SABOTAGE` 25): the player asked for espionage to be
repeatable, and a toggle that is off by default proposes nothing on its own.

Deliberately **out of scope**: city-state projects; war and alliance; anything with
`BaseDuration` 0 or −1. Sanctions (`DENOUNCE`, `SABOTAGE_*`) were out of scope until 1.2 and are
now renewable like the rest (user's instruction, 2026-10-30).

⚠️ Not a hardcoded whitelist: `ui/engine/renewals.js` (`isRenewable`) decides by **group**
(TREATY, ENDEAVOR, ESPIONAGE), target shape and `Game.Diplomacy.getBaseDiplomaticActionDuration`,
so a patch that changes a duration needs no mod update. Age availability
(`RequiresUnlock="true"`) is the engine's to answer through `canStart`.

## The game's action list (where the toggle lives)

`panel-diplomacy-actions.js` → `populateActionsPanel()` asks
`DiplomacyManager.queryAvailableProjectData(selectedPlayerID)` and builds one row per entry of
`availableTreaties`, `availableProjects`, `availableEndeavors`, `availableSanctions` and
`availableEspionage` with `createStartActionListItem(projectData)`. Its own quick-start click
(`clickQuickStartActionItem`) uses `{ Amount: 1, Player1, Player2, ID, Type }` — the same args
shape as above, which is a second confirmation of it. The game also exposes
`Game.Diplomacy.getPlayerEvents(playerId)` (ongoing actions, with `actionType`, `initialPlayer`,
`targetPlayer`, `uniqueID`) — the first candidate for open question 1.
