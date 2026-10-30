# Game file snapshots

1:1 copies of the original game files this mod imports from or overrides, one sub-folder per game
version, mirroring the path under the game's `Base/modules/`. Never deployed — `deploy.sh` copies
only the `.modinfo`, `ui/`, `text/`, `config/` and `icons/`.

A change that makes the mod import from, or override, a game file must add that file here in the
same change, so this folder stays a complete inventory of what the mod touches. Keep at most two
versions: the newest and one back.

## `1.5.0/` — game build `25516395`, captured 2026-10-27

| File | Why |
|---|---|
| `base-standard/ui/diplomacy-actions/panel-diplomacy-actions.js` | **⚠️ PATCHED (prototype wrap).** `DiplomacyActionPanel.prototype.createStartActionListItem` builds every row of the treaty / endeavour / espionage list; `ui/screen/sync-toggle.js` wraps it and appends the toggle, and calls the panel's `clickQuickStartActionItem(projectData)` when the toggle is switched on - check that method too. Check its name, its `(projectData, recentlyCompletedData)` signature and the `projectData` fields read in `ui/engine/renewals.js` (`actionGroup`, `actionType`, `actionTypeName`, `target1Type`, `targetList2`) first after an update. |
| `base-standard/ui/diplomacy/diplomacy-manager.js` | Read-only: `DiplomacyManager.selectedPlayerID`, the leader whose screen is open. |
| `core/ui/utilities/utility-serialize.js` | Read-only: `Catalog`, the in-save store for the toggles (`ui/engine/renewals.js`). Writes go to `player.Tutorial.setProperty`, keyed by `Database.makeHash` of the catalog/object/key names; if that scheme changes, existing saves' choices stop being found. |
| `core/ui/utilities/utilities-image.js` | Imported: `Icon.getLeaderPortraitIcon(leaderType)`, the leader portrait on each card of the renewal toast (`ui/screen/renewal-toast.js`). |
| `core/ui/components/fxs-chooser-item.js` | Not imported - mirrored. A disabled row is greyed by the overlay it draws (`fxs-chooser-item-disabled`, absolute, no z-index, `pointer-events-none`); the toggle (on or off) escapes it with `z-index: 1`. If the overlay gains a z-index or starts catching pointer events, the toggle greys or stops clicking on running agreements. |
| `core/ui/components/fxs-activatable.js` | Not imported - mirrored. The row starts its action from bubbling `engine-input` with these input names and statuses; the toggle stops exactly those. If they change, a click on the toggle starts the treaty too. |

After a game update: diff these against the new game files, and re-check the durations and
operation types listed in `documentation/03-diplomacy-api.md` against
`Base/modules/base-standard/data/diplomacy-actions.xml`.
