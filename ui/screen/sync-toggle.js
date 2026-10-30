/**
 * The sync toggle beside each renewable action in the diplomacy screen's action list: lit frame
 * when the player wants that agreement kept running with this leader, grey frame when not.
 *
 * ⚠️ A PROTOTYPE WRAP, not a component override: the list rows are built by
 * `DiplomacyActionPanel.prototype.createStartActionListItem` (the base class of both the
 * other-player and local-player panels) and are not components of their own. The wrap calls the
 * original and appends one element, so every row the game builds - including the rows
 * `refreshActionPanel` rebuilds in place - gets it without this mod tracking any of them.
 * Snapshot: game-files-snapshots/1.5.0/base-standard/ui/diplomacy-actions/.
 *
 * ⚠️ THE ROW IS AN `fxs-chooser-item` that starts the action on `engine-input`, which BUBBLES from
 * the element under the cursor (core/ui/components/fxs-activatable.js). The toggle must stop that
 * input at START and FINISH alike, or one click on it also proposes the treaty.
 *
 * ⚠️ A DISABLED ROW (agreement already running) is greyed by an absolute 70 % overlay the chooser
 * item draws over its whole content (`fxs-chooser-item-disabled`, no z-index). Anything that must
 * stay bright sits above it with `z-index: 1`, as the game does for the cost and the red reason.
 * The toggle does that ALWAYS, on or off (user's instruction, 2026-10-30): it stays clickable on
 * a disabled row, and greyed with the row it read as inactive.
 *
 * Turning the toggle ON also starts the action at once, through the panel's own
 * `clickQuickStartActionItem` (user's instruction, 2026-10-30): the same `canStart` + `sendRequest` a
 * click on the row makes, so a row the game disables (agreement already running) does nothing.
 * Turning it OFF never cancels anything.
 *
 * ⚠️ BLOCKED (user's instruction, 2026-10-30): when a one-at-a-time action (endeavour, espionage)
 * is already kept running with as many other leaders as the limit allows, the toggle is shown
 * blocked and a plain click does nothing; its tooltip names those leaders. SHIFT+click moves it
 * here, dropping the leader it was switched on with longest ago (read from `mouseup`; see below).
 *
 * The same wrap also gives the row its Influence and hourglass chips (screen/influence-chips.js).
 *
 * ⚠️ The ON animations touch only `opacity` (the `::after` glow) and `transform` (the icon's slow
 * turn): compositor properties, so the rows are not re-laid-out every frame while the screen is open.
 */
import { DiplomacyActionPanel } from '/base-standard/ui/diplomacy-actions/panel-diplomacy-actions.js';
import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import { isRenewable, isRenewalOn, RowMarksChangedEventName, setRenewal, wouldReplace } from '../engine/renewals.js';
import { CHIPS_CLASS, COST_CLASS, decorateChips, obstacleOf } from './influence-chips.js';
import { warn } from '../support/diagnostics.js';

const ICON_URL = 'fs://game/najane-recurring-diplomacy/icons/sync.png';
const STYLE_ID = 'najane-recurring-style';
const TOGGLE_CLASS = 'najane-recurring-toggle';
const ON_CLASS = 'najane-recurring-toggle--on';
const BLOCKED_CLASS = 'najane-recurring-toggle--blocked';
// Blocked because the game's conditions are not met; Shift+click cannot override it.
const UNAVAILABLE_CLASS = 'najane-recurring-toggle--unavailable';

const ACTIVATING_INPUTS = new Set(['mousebutton-left', 'accept', 'touch-tap', 'keyboard-enter', 'touch-touch']);

// ⚠️ A template literal: no backtick anywhere inside it, comments included.
const STYLE = `
/*
 * The hourglass chip's box (screen/influence-chips.js, from Better City UI), user's instruction,
 * 2026-10-30: same size, same border, same gap, so the row reads sync - price - hourglass.
 */
.najane-recurring-toggle {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    align-self: center;
    width: 1.7777777778rem;
    height: 1.7777777778rem;
    padding: 0;
    margin-left: 0.2222222222rem;
    border-radius: 0.5555555556rem 0.1111111111rem;
    border-style: solid;
    border-width: 0.1111111111rem;
    border-color: #8c7e62; /* as the hourglass: always clickable, never drawn like the greyed price */
    background-color: rgba(0, 0, 0, 0.28);
    pointer-events: auto;
}
.najane-recurring-toggle:hover {
    border-color: #f9ecd2;
    background-color: rgba(246, 206, 85, 0.22);
}
.najane-recurring-toggle--blocked,
.najane-recurring-toggle--blocked:hover {
    border-color: #52483a;
    background-color: rgba(0, 0, 0, 0.45);
}
.najane-recurring-toggle--blocked .najane-recurring-toggle__icon {
    opacity: 0.3;
}
.najane-recurring-toggle--on,
.najane-recurring-toggle--on:hover {
    border-color: #f6ce55;
    background-color: rgba(246, 206, 85, 0.28);
}
.najane-recurring-toggle--on::after {
    content: '';
    position: absolute;
    top: -0.1111111111rem;
    right: -0.1111111111rem;
    bottom: -0.1111111111rem;
    left: -0.1111111111rem;
    border-radius: 0.5555555556rem 0.1111111111rem;
    box-shadow: 0 0 0.5555555556rem rgba(246, 206, 85, 0.9);
    pointer-events: none;
    animation: najane-recurring-pulse 1.6s ease-in-out infinite alternate;
}
@keyframes najane-recurring-pulse {
    from { opacity: 0.35; }
    to { opacity: 1; }
}
.najane-recurring-toggle__icon {
    width: 1.1111111111rem;
    height: 1.1111111111rem;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: fxs-color-tint(#f6ce55);
    pointer-events: none;
}
.najane-recurring-toggle:hover .najane-recurring-toggle__icon {
    filter: fxs-color-tint(#fff6e5);
}
.najane-recurring-toggle--on .najane-recurring-toggle__icon {
    filter: fxs-color-tint(#f6ce55);
    animation: najane-recurring-spin 6s linear infinite;
}
@keyframes najane-recurring-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
}
`;

function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
        return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
}

function leaderNames(leaderIds) {
    return leaderIds
        .map((id) => {
            const leaderName = Players.get(id)?.leaderName;
            return leaderName ? Locale.compose(leaderName) : String(id);
        })
        .join(', ');
}

/**
 * `unavailable`: the row is held back by something other than Influence or a running agreement
 * (user's instructions, 2026-10-30) - locked while OFF. ⚠️ A toggle already ON is NOT switched off
 * here: if `isRunning` ever missed a running treaty (not yet seen confirmed in game), that would
 * silently cancel the very renewal the mod exists for. It stays clickable, so it can be turned off.
 */
function render(toggle, leaderId, projectData, on, unavailable) {
    // A one-at-a-time action already kept with other leaders up to the limit.
    const replaced = on ? [] : wouldReplace(leaderId, projectData);
    const locked = !on && unavailable;
    toggle.classList.toggle(ON_CLASS, on);
    toggle.classList.toggle(BLOCKED_CLASS, replaced.length > 0 || locked);
    toggle.classList.toggle(UNAVAILABLE_CLASS, locked);
    let tooltip;
    if (locked) {
        tooltip = Locale.compose('LOC_NAJANE_RECURRING_TOGGLE_UNAVAILABLE');
    } else if (replaced.length > 0) {
        tooltip = Locale.compose('LOC_NAJANE_RECURRING_TOGGLE_BLOCKED', leaderNames(replaced));
    } else {
        tooltip = Locale.compose(on ? 'LOC_NAJANE_RECURRING_TOGGLE_ON' : 'LOC_NAJANE_RECURRING_TOGGLE_OFF');
    }
    toggle.setAttribute('data-tooltip-content', tooltip);
}

/**
 * ⚠️ Only `Input.isShiftDown()` knows (measured in Better Commerce, screen/shift-click.js): DOM
 * keydown/keyup never report Shift, and native mouse events carry `shiftKey: false` with it held.
 */
function isShiftDown() {
    try {
        return Input.isShiftDown() === true;
    } catch (error) {
        warn(`could not read the Shift key: ${error}`);
        return false;
    }
}

function startNow(panel, projectData) {
    try {
        panel.clickQuickStartActionItem(projectData);
    } catch (error) {
        warn(`could not start ${projectData?.actionTypeName}: ${error}`);
    }
}

function createToggle(panel, item, leaderId, projectData) {
    const toggle = document.createElement('div');
    toggle.classList.add(TOGGLE_CLASS);
    const icon = document.createElement('div');
    icon.classList.add('najane-recurring-toggle__icon');
    icon.style.backgroundImage = `url("${ICON_URL}")`;
    toggle.appendChild(icon);
    // ⚠️ Read once per row: the panel rebuilds its rows when the game state behind them changes.
    const unavailable = obstacleOf(panel, projectData, leaderId) === 'other';
    render(toggle, leaderId, projectData, isRenewalOn(leaderId, projectData.actionTypeName), unavailable);
    item.addEventListener(RowMarksChangedEventName, () => {
        render(toggle, leaderId, projectData, isRenewalOn(leaderId, projectData.actionTypeName), unavailable);
    });

    const flip = () => {
        const on = setRenewal(leaderId, projectData, !toggle.classList.contains(ON_CLASS));
        render(toggle, leaderId, projectData, on, unavailable);
        item.dispatchEvent(new CustomEvent(RowMarksChangedEventName));
        if (on) {
            startNow(panel, projectData);
        }
        try {
            // The row's own audio group, so the click sounds like the list it sits in.
            Audio.playSound('data-audio-activate', 'audio-diplo-project-reaction');
        } catch (error) {
            // A missing sound is not worth a warning.
        }
    };

    toggle.addEventListener('engine-input', (inputEvent) => {
        const { name, status } = inputEvent.detail ?? {};
        if (!ACTIVATING_INPUTS.has(name)) {
            return;
        }
        // Both phases: the row plays its press sound on START and starts the action on FINISH.
        inputEvent.stopPropagation();
        inputEvent.preventDefault();
        if (status !== InputActionStatuses.FINISH || toggle.classList.contains(BLOCKED_CLASS)) {
            return;
        }
        flip();
    });
    // ⚠️ SHIFT+CLICK NEVER ARRIVES AS `engine-input`: the engine withholds its mouse actions while a
    // modifier is held (Better Commerce, screen/shift-click.js). So it is read from the native
    // `mouseup` - which a plain click also fires, hence the Shift test - and the row, which listens
    // to `engine-input` only, never sees it.
    toggle.addEventListener('mouseup', (event) => {
        if (event.button !== 0 || !isShiftDown() || toggle.classList.contains(UNAVAILABLE_CLASS)) {
            return;
        }
        event.stopPropagation();
        flip();
    });
    return toggle;
}

/** The player whose action list this is, other than the local one; null for none. */
function selectedPlayer() {
    const playerId = DiplomacyManager.selectedPlayerID;
    if (playerId === undefined || playerId === PlayerIds.NO_PLAYER || playerId === GameContext.localPlayerID) {
        return null;
    }
    return Players.get(playerId) ?? null;
}

/**
 * ⚠️ `recentlyCompletedData` rows are the local player's "renew a finished project" list, whose
 * target is not the selected leader; they get no toggle until the renewal loop can honour them.
 */
function decorate(panel, item, projectData, recentlyCompletedData) {
    if (recentlyCompletedData || !item) {
        return;
    }
    const player = selectedPlayer();
    if (!player) {
        return;
    }
    const leaderId = DiplomacyManager.selectedPlayerID;
    // Majors and independent powers alike get the chips; only a major's renewable rows the toggle.
    decorateChips(panel, item, projectData, leaderId);
    if (!player.isMajor || !isRenewable(projectData)) {
        return;
    }
    ensureStyle();
    const toggle = createToggle(panel, item, leaderId, projectData);
    // First in the chips' row, so the three sit at one even gap; else left of the game's own cost.
    const chips = item.querySelector(`.${CHIPS_CLASS}`);
    const cost = item.querySelector(`.${COST_CLASS}`);
    if (chips) {
        chips.insertBefore(toggle, chips.firstChild);
    } else if (cost?.parentElement) {
        cost.parentElement.insertBefore(toggle, cost);
    } else {
        item.appendChild(toggle);
    }
}

/**
 * ⚠️ THE ROW IS NEVER DRAWN DISABLED (user's instruction, 2026-10-30, as Better City UI's "Convert
 * to city" button): the greyed price chip says what cannot be done. Safe to press: a row without a
 * second target starts through `clickQuickStartActionItem`, which asks `canStart` first and does
 * nothing on a no. Rows with a target picker keep the game's state - their picker would open.
 */
function enableRow(item, projectData, recentlyCompletedData) {
    if (!item || recentlyCompletedData) {
        return;
    }
    // ⚠️ The game's red failure line under the name is hidden, not removed (user's instruction,
    // 2026-10-30): it is the price chip's tooltip now. Same classes as panel-diplomacy-actions.js.
    for (const reason of item.querySelectorAll('.text-negative.text-2xs')) {
        reason.style.display = 'none';
    }
    if ((projectData?.targetList2?.length ?? 0) > 0) {
        return;
    }
    if (item.getAttribute('disabled') === 'true') {
        item.setAttribute('disabled', 'false');
    }
}

function install() {
    const proto = DiplomacyActionPanel?.prototype;
    const original = proto?.createStartActionListItem;
    if (typeof original !== 'function') {
        warn('createStartActionListItem not found - the sync toggle is not shown (game update?)');
        return;
    }
    if (original.najaneRecurringWrapped) {
        return;
    }
    const wrapped = function (projectData, recentlyCompletedData) {
        const item = original.call(this, projectData, recentlyCompletedData);
        try {
            enableRow(item, projectData, recentlyCompletedData);
            decorate(this, item, projectData, recentlyCompletedData);
        } catch (error) {
            warn(`could not add the sync toggle to ${projectData?.actionTypeName}: ${error}`);
        }
        return item;
    };
    wrapped.najaneRecurringWrapped = true;
    proto.createStartActionListItem = wrapped;
}

install();
