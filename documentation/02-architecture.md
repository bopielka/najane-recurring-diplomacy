# 02 — Architecture

The same layering as Better Commerce Screen UI, cut down to what this mod needs. **The dependency
direction is load-bearing**: the renewal engine runs at turn start with no screen open, so it
must never import anything that drags in a screen.

```
support  ←  engine  ←  screen
                ↑
             options   (game AND shell scope)
```

| Folder | Holds | May import |
|---|---|---|
| `ui/support/` | logging (`diagnostics.js`), the deploy-generated `build-stamp.js` | nothing from this mod |
| `ui/engine/` | everything that talks to the game: reading agreements, `canStart` / `sendRequest`, turn-start loop, per-save storage, the shared `engine.on` dispatcher | `support` |
| `ui/options/` | stored settings and their Options rows; the shared Najane options registry | `support`, and **only** stored-setting modules from `engine` |
| `ui/screen/` | the per-leader toggles and the turn summary | anything below |

## Entry points

Each listed in the `.modinfo`; everything else arrives by `import`, which also fixes load order.

| File | Scope | Status |
|---|---|---|
| `ui/recurring-diplomacy.js` | game | ✅ logs `loaded, build <stamp>`, imports the toggle |
| `ui/options/najane-recurring-options.js` | game **and** shell | not written |

## Modules so far

| File | Layer | What |
|---|---|---|
| `ui/support/diagnostics.js` | support | `log` / `warn` |
| `ui/engine/renewals.js` | engine | which rows are renewable; the (leader, action) choices, stored IN THE SAVE through the game's `Catalog`; `markedRenewals()` for the loop |
| `ui/screen/sync-toggle.js` | screen | prototype wrap of `DiplomacyActionPanel.createStartActionListItem`, the toggle and its style |

`icons/sync.png` is generated from `assets/sync.svg` by `tools/make-icons.py` (Pillow) and served
through `<ImportFiles>`; `assets/` and `tools/` are never deployed.

⚠️ **`ui/options/` loads in SHELL scope too.** The options screen exists in the main menu, where
there is no game, no `Players`, no engine events. An options module may do nothing at import time
beyond declaring itself, and must be registered in a `scope="shell"` action group as well as the
game one, or its rows disappear from the main menu.

## Rules carried over from the sibling mods

- **One `engine.on` per event name**, through a dispatcher in `ui/engine/events.js` (copy the
  pattern from Better Commerce Screen UI). Engine events fire for **every player**; filter to the
  local player before doing anything.
- **Wall-clock, not frame counts**, for any timeout.
- **Memoise** `GameInfo.*` lookups and `DiplomacyActionTypes` reads; clear the memo on
  `GameStarted` (another game, or the next age, may have different data).
