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
 * ⚠️ The ON animations touch only `opacity` (the `::after` glow) and `transform` (the icon's slow
 * turn): compositor properties, so the rows are not re-laid-out every frame while the screen is open.
 */
import { DiplomacyActionPanel } from '/base-standard/ui/diplomacy-actions/panel-diplomacy-actions.js';
import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import { isRenewable, isRenewalOn, setRenewal, wouldReplace } from '../engine/renewals.js';
import { warn } from '../support/diagnostics.js';

const ICON_URL = 'fs://game/najane-recurring-diplomacy/icons/sync.png';
const STYLE_ID = 'najane-recurring-style';
const TOGGLE_CLASS = 'najane-recurring-toggle';
const ON_CLASS = 'najane-recurring-toggle--on';
const BLOCKED_CLASS = 'najane-recurring-toggle--blocked';
// The game's own class on the row's Influence cost (panel-diplomacy-actions.js).
const COST_CLASS = 'panel-diplomacy-actions__influence-container';

const ACTIVATING_INPUTS = new Set(['mousebutton-left', 'accept', 'touch-tap', 'keyboard-enter', 'touch-touch']);

// ⚠️ A template literal: no backtick anywhere inside it, comments included.
const STYLE = `
.najane-recurring-toggle {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    align-self: center;
    width: 2.2222rem;
    height: 2.2222rem;
    margin-right: 0.6667rem;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    cursor: pointer;
    border-width: 0.1111rem;
    border-style: solid;
    border-color: #5e5e5e;
    border-radius: 0.2222rem;
    background-color: rgba(10, 12, 18, 0.6);
}
.najane-recurring-toggle:hover {
    border-color: #8c8c8c;
}
.najane-recurring-toggle--blocked,
.najane-recurring-toggle--blocked:hover {
    border-color: #3a3a3a;
    background-color: rgba(10, 12, 18, 0.85);
    cursor: default;
}
.najane-recurring-toggle--blocked .najane-recurring-toggle__icon {
    opacity: 0.2;
}
.najane-recurring-toggle--on {
    border-color: #e5d2ac;
    background-color: rgba(229, 210, 172, 0.18);
}
.najane-recurring-toggle--on::after {
    content: '';
    position: absolute;
    top: -0.1111rem;
    right: -0.1111rem;
    bottom: -0.1111rem;
    left: -0.1111rem;
    border-radius: 0.2222rem;
    box-shadow: 0 0 0.5556rem rgba(229, 210, 172, 0.9);
    pointer-events: none;
    animation: najane-recurring-pulse 1.6s ease-in-out infinite alternate;
}
@keyframes najane-recurring-pulse {
    from { opacity: 0.35; }
    to { opacity: 1; }
}
.najane-recurring-toggle--on:hover {
    border-color: #fff4dc;
}
.najane-recurring-toggle__icon {
    width: 1.5556rem;
    height: 1.5556rem;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0.45;
    pointer-events: none;
}
.najane-recurring-toggle--on .najane-recurring-toggle__icon {
    opacity: 1;
    animation: najane-recurring-spin 6s linear infinite;
}
@keyframes najane-recurring-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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

function render(toggle, leaderId, projectData, on) {
    // A one-at-a-time action already kept with other leaders up to the limit.
    const replaced = on ? [] : wouldReplace(leaderId, projectData);
    const blocked = replaced.length > 0;
    toggle.classList.toggle(ON_CLASS, on);
    toggle.classList.toggle(BLOCKED_CLASS, blocked);
    const tooltip = blocked
        ? Locale.compose('LOC_NAJANE_RECURRING_TOGGLE_BLOCKED', leaderNames(replaced))
        : Locale.compose(on ? 'LOC_NAJANE_RECURRING_TOGGLE_ON' : 'LOC_NAJANE_RECURRING_TOGGLE_OFF');
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

function createToggle(panel, leaderId, projectData) {
    const toggle = document.createElement('div');
    toggle.classList.add(TOGGLE_CLASS);
    const icon = document.createElement('div');
    icon.classList.add('najane-recurring-toggle__icon');
    icon.style.backgroundImage = `url("${ICON_URL}")`;
    toggle.appendChild(icon);
    render(toggle, leaderId, projectData, isRenewalOn(leaderId, projectData.actionTypeName));

    const flip = () => {
        const on = setRenewal(leaderId, projectData, !toggle.classList.contains(ON_CLASS));
        render(toggle, leaderId, projectData, on);
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
        if (event.button !== 0 || !isShiftDown()) {
            return;
        }
        event.stopPropagation();
        flip();
    });
    return toggle;
}

function selectedLeader() {
    const leaderId = DiplomacyManager.selectedPlayerID;
    if (leaderId === undefined || leaderId === PlayerIds.NO_PLAYER || leaderId === GameContext.localPlayerID) {
        return null;
    }
    return Players.get(leaderId)?.isMajor ? leaderId : null;
}

/**
 * ⚠️ `recentlyCompletedData` rows are the local player's "renew a finished project" list, whose
 * target is not the selected leader; they get no toggle until the renewal loop can honour them.
 */
function decorate(panel, item, projectData, recentlyCompletedData) {
    if (recentlyCompletedData || !item || !isRenewable(projectData)) {
        return;
    }
    const leaderId = selectedLeader();
    if (leaderId === null) {
        return;
    }
    ensureStyle();
    const toggle = createToggle(panel, leaderId, projectData);
    // Left of the Influence cost. A row without one (none today) gets the toggle at its end.
    const cost = item.querySelector(`.${COST_CLASS}`);
    if (cost?.parentElement) {
        cost.parentElement.insertBefore(toggle, cost);
    } else {
        item.appendChild(toggle);
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
