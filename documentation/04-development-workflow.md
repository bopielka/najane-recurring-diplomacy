# 04 — Development workflow

## Deploy

```bash
./deploy.sh
```

`deploy.sh` is the script on both platforms (it branches on `uname`); `deploy-on-mac.sh` is a shim.
It wipes and rebuilds `Mods/najane-recurring-diplomacy/`, copies only the `.modinfo`, `ui/`,
`text/` and `config/`, parses every script as an ES module, enforces the 6000-character limit on
`steam-description.bbcode`, writes `ui/support/build-stamp.js`, and checks that every file the
`.modinfo` names exists in the target.

`./deploy.sh --dry` lists what would be copied. `CIV7_MODS_DIR=/path ./deploy.sh` overrides the
target.

After deploying, **return to the main menu or restart** — scripts are loaded once. A new mod is
not enabled by default: tick it once in *Additional Content → Mods*.

## Check that it loaded

`%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VII\Logs\`

- `Modding.log` — is the mod in the "enabled mods" list?
- `UI.log` — look for `najane-recurring-diplomacy: loaded, build <stamp>` and compare the stamp
  with the one `deploy.sh` just wrote.
- `Database.log` — did the text XML validate?

## Traps

- ⚠️ `node --check file.js` exits 0 on a broken ES module. Use
  `node --input-type=module --check < file.js`, or just deploy — the script does it.
- ⚠️ `console.log` never reaches `UI.log`. Use `log()` / `warn()` from `ui/support/diagnostics.js`.
- ⚠️ No backtick inside a CSS template literal, not even in a comment.

## Publishing

1. `DIAGNOSTICS = false` in `ui/support/diagnostics.js`.
2. Bump `<Version>` in the `.modinfo` (the `version` attribute on `<Mod>` stays an integer).
3. Add a section at the top of `STEAM_CHANGELOG.bbcode` — written for the player, one bullet per
   change. Only the newest section is pasted into the Workshop change note; old sections stay.
4. Update `steam-description.bbcode` if features changed; `deploy.sh` enforces the limit.
5. Deploy, check `UI.log`, then upload from the game's mod folder.
