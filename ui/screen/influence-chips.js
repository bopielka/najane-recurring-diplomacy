/**
 * The Influence price of a diplomacy action row, redrawn as Better City UI's two chips (user's
 * instruction, 2026-10-30, "copy that style 1:1"): the price chip - greyed while the action cannot
 * be started - and beside it, only while the Influence is short, the hourglass chip that marks the
 * action to START ONCE as soon as there is enough. The renewal loop starts it and drops the mark.
 * Styles: better-city-ui/ui/screen/production-item.js (`najane-city-buy`, `najane-city-wait`),
 * copied with the prefix changed.
 *
 * ⚠️ Called from the sync toggle's prototype wrap (screen/sync-toggle.js), so the row is the game's
 * `fxs-chooser-item`: each chip stops `engine-input` at START and FINISH, or one press on it also
 * starts the row. The game's own price is hidden, not removed.
 *
 * ⚠️ War and alliance never get the hourglass; sanctions do (user's instruction, 2026-10-30).
 */
import { instanceLimit, isRunning, isWaitable, isWaitingOn, RowMarksChangedEventName, setWaiting } from '../engine/renewals.js';
import { warn } from '../support/diagnostics.js';

/** The game's own class on the row's Influence cost (panel-diplomacy-actions.js). */
export const COST_CLASS = 'panel-diplomacy-actions__influence-container';
/** The chips' row; the sync toggle joins it as the first chip. */
export const CHIPS_CLASS = 'najane-recurring-chips';

const STYLE_ID = 'najane-recurring-chips-style';
const HIDDEN_CLASS = 'najane-recurring-hidden';
const ACTIVATING_INPUTS = new Set(['mousebutton-left', 'accept', 'touch-tap', 'keyboard-enter', 'touch-touch']);
// The game's own plain hourglass, as Better City UI uses it.
const HOURGLASS_URL = 'fs://game/HourGlass.png';
const INFLUENCE_ICON_URL = 'blp:yield_influence';

// ⚠️ A template literal: no backtick anywhere inside it, comments included.
const STYLE = `
.najane-recurring-hidden {
    display: none;
}
.najane-recurring-chips {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    align-self: center;
    flex: 0 0 auto;
    margin-right: 0.6666666667rem;
}
.najane-recurring-item-cost-icon {
    width: 1.3333333333rem;
    height: 1.3333333333rem;
    margin-left: 0.1666666667rem;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
}
.najane-recurring-buy {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    flex: 0 0 auto;
    min-width: 3.3333333333rem;
    min-height: 1.7777777778rem;
    padding: 0 0.3333333333rem;
    /* One gap for all three chips (user, 2026-10-30); Better City UI has 0.4444rem here. */
    margin-left: 0.2222222222rem;
    border-radius: 0.5555555556rem 0.1111111111rem;
    border-style: solid;
    border-width: 0.1111111111rem;
    border-color: #8c7e62;
    background-color: rgba(0, 0, 0, 0.28);
    font-weight: 700;
    color: #f6ce55;
    pointer-events: auto;
}
.najane-recurring-buy:hover {
    border-color: #f9ecd2;
    background-color: rgba(246, 206, 85, 0.22);
    color: #fff6e5;
}
.najane-recurring-buy.najane-recurring-buy-disabled {
    border-color: #52483a;
    background-color: rgba(0, 0, 0, 0.45);
    color: #857459;
}
.najane-recurring-buy.najane-recurring-buy-disabled .najane-recurring-item-cost-icon {
    opacity: 0.3;
}
.najane-recurring-buy.najane-recurring-buy-disabled:hover {
    border-color: #52483a;
    background-color: rgba(0, 0, 0, 0.45);
    color: #857459;
}
.najane-recurring-wait {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 1.7777777778rem;
    height: 1.7777777778rem;
    padding: 0;
    margin-left: 0.2222222222rem;
    border-radius: 0.5555555556rem 0.1111111111rem;
    border-style: solid;
    border-width: 0.1111111111rem;
    border-color: #8c7e62; /* the live price chip's border: always clickable, so never drawn like the greyed price */
    background-color: rgba(0, 0, 0, 0.28);
    color: #c7b28a;
    pointer-events: auto;
}
.najane-recurring-wait:hover {
    border-color: #f9ecd2;
    background-color: rgba(246, 206, 85, 0.22);
}
.najane-recurring-wait.najane-recurring-wait-on {
    border-color: #f6ce55;
    background-color: rgba(246, 206, 85, 0.28);
}
.najane-recurring-wait .najane-recurring-item-cost-icon {
    width: 1.1111111111rem;
    height: 1.1111111111rem;
    margin: 0;
    filter: fxs-color-tint(#f6ce55);
}
.najane-recurring-wait:hover .najane-recurring-item-cost-icon {
    filter: fxs-color-tint(#fff6e5);
}
.najane-recurring-wait.najane-recurring-wait-on .najane-recurring-item-cost-icon {
    filter: fxs-color-tint(#f6ce55);
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

function influenceBalance() {
    try {
        return Players.get(GameContext.localPlayerID)?.DiplomacyTreasury?.diplomacyBalance ?? 0;
    } catch (error) {
        warn(`could not read the Influence balance: ${error}`);
        return 0;
    }
}

/** ⚠️ The price the row itself shows (`getCostFromTargetList`); -1 when it has none. */
function costOf(panel, projectData) {
    try {
        return panel.getCostFromTargetList(projectData);
    } catch (error) {
        warn(`could not read the cost of ${projectData?.actionTypeName}: ${error}`);
        return -1;
    }
}

function iconElement(url) {
    const icon = document.createElement('div');
    icon.className = 'najane-recurring-item-cost-icon';
    icon.style.backgroundImage = `url("${url}")`;
    return icon;
}

/** A chip answers its own press; the row underneath must never see it. */
function onPress(chip, action) {
    chip.addEventListener('engine-input', (inputEvent) => {
        const { name, status } = inputEvent.detail ?? {};
        if (!ACTIVATING_INPUTS.has(name)) {
            return;
        }
        inputEvent.stopPropagation();
        inputEvent.preventDefault();
        if (status === InputActionStatuses.FINISH) {
            action();
        }
    });
}

function playClick() {
    try {
        Audio.playSound('data-audio-activate', 'audio-diplo-project-reaction');
    } catch (error) {
        // A missing sound is not worth a warning.
    }
}

/**
 * What holds this row back: 'none' (it can start), 'running' (we already run it - with this player,
 * or anywhere for a one-at-a-time action, never for one the game allows many of), 'influence' (the price is the ONLY obstacle), 'other'.
 *
 * ⚠️ THE GAME LISTS ONLY THE FIRST OBSTACLE (seen 2026-10-30: Reconciliation at 10 Influence for a
 * price of 60 gave only its relationship requirement). So the reasons cannot be counted: 'influence'
 * means every reason IS the game's own "not enough Influence" line, composed here from its own key
 * with the same numbers. ⚠️ The one place a reason is compared (rule 3): against the game's key,
 * never a hard-coded string; on any mismatch the row reads 'other', i.e. the safe side.
 */
const NOT_ENOUGH_INFLUENCE_KEY = 'LOC_DIPLOMACY_ACTION_NOT_ENOUGH_YIELD_DIPLOMACY';

function isInfluenceReason(reason, cost, balance) {
    try {
        return [balance, Math.floor(balance)].some((shown) => Locale.compose(NOT_ENOUGH_INFLUENCE_KEY, cost, shown) === reason);
    } catch (error) {
        warn(`could not compose the Influence failure reason: ${error}`);
        return false;
    }
}

export function obstacleOf(panel, projectData, leaderId) {
    if (projectData.projectStatus === DiplomacyProjectStatus.PROJECT_AVAILABLE) {
        return 'none';
    }
    // ⚠️ "Running with anyone" only blocks a ONE-AT-A-TIME action: befriending one independent power
    // does not stop befriending another (SingleInstanceProject="false"; seen in game 2026-10-30).
    const oneAtATime = instanceLimit(projectData) !== Infinity;
    if (isRunning(projectData.actionType, leaderId) || (oneAtATime && isRunning(projectData.actionType, null))) {
        return 'running';
    }
    const cost = costOf(panel, projectData);
    const balance = influenceBalance();
    const reasons = projectData.resultData?.FailureReasons ?? [];
    const onlyInfluence = cost > balance && reasons.length > 0
        && reasons.every((reason) => isInfluenceReason(reason, cost, balance));
    return onlyInfluence ? 'influence' : 'other';
}

function renderWait(wait, on) {
    wait.classList.toggle('najane-recurring-wait-on', on);
    wait.setAttribute('data-tooltip-content',
        Locale.compose(on ? 'LOC_NAJANE_RECURRING_TOGGLE_ONCE_ON' : 'LOC_NAJANE_RECURRING_TOGGLE_ONCE_OFF'));
}

/**
 * Replaces the row's price with the chips. `leaderId` is the player the list is for, a major or an
 * independent power. ⚠️ Read once per row: the panel rebuilds its rows when the treasury changes.
 */
export function decorateChips(panel, item, projectData, leaderId) {
    const costContainer = item.querySelector(`.${COST_CLASS}`);
    const cost = costOf(panel, projectData);
    if (!costContainer) {
        return;
    }
    // ⚠️ A free action (cost 0, e.g. Send Aid) shows no price at all (user's instruction, 2026-10-30).
    if (!(cost > 0)) {
        costContainer.style.display = 'none';
        return;
    }
    ensureStyle();
    costContainer.classList.add(HIDDEN_CLASS);

    const chips = document.createElement('div');
    chips.className = 'najane-recurring-chips font-body text-xs';

    const available = projectData.projectStatus === DiplomacyProjectStatus.PROJECT_AVAILABLE;
    const buy = document.createElement('div');
    buy.className = 'najane-recurring-buy';
    buy.classList.toggle('najane-recurring-buy-disabled', !available);
    const price = document.createElement('div');
    price.textContent = String(cost);
    buy.append(price, iconElement(INFLUENCE_ICON_URL));
    // The game's "why not" line, hidden under the name (sync-toggle.js), lives in this tooltip
    // instead (user's instruction, 2026-10-30).
    const reasons = projectData.resultData?.FailureReasons ?? [];
    if (!available && reasons.length > 0) {
        buy.setAttribute('data-tooltip-content', reasons.join('[N]'));
    }
    onPress(buy, () => {
        if (!available) {
            return;
        }
        try {
            panel.clickQuickStartActionItem(projectData);
        } catch (error) {
            warn(`could not start ${projectData.actionTypeName}: ${error}`);
        }
    });
    chips.appendChild(buy);

    const name = projectData.actionTypeName;
    let waiting = isWaitingOn(leaderId, name);
    /*
     * ⚠️ ONLY WHILE INFLUENCE IS THE ONE OBSTACLE (user's instructions, 2026-10-30): not on what we
     * already run, not on a row also held back by something else (relationship level, units
     * nearby) - waiting would not make it possible. A mark already made stays visible (and
     * removable) once the treasury has caught up.
     */
    const obstacle = obstacleOf(panel, projectData, leaderId);
    // ⚠️ TEMPORARY PROBE: every priced row and what the chips decided. Remove once confirmed in game.
    warn(`chips: ${name} for player ${leaderId}: status ${projectData.projectStatus}, cost ${cost}, `
        + `balance ${influenceBalance()}, obstacle ${obstacle}, waitable ${isWaitable(projectData)}, waiting ${waiting}, `
        + `reasons ${(projectData.resultData?.FailureReasons ?? []).join(' | ')}`);
    // ⚠️ A mark on a row the game no longer allows for another reason is dropped, not shown.
    if (obstacle === 'other' && waiting) {
        waiting = setWaiting(leaderId, name, false);
    }
    if (isWaitable(projectData) && (obstacle === 'influence' || (waiting && obstacle === 'none'))) {
        const wait = document.createElement('div');
        wait.className = 'najane-recurring-wait';
        wait.appendChild(iconElement(HOURGLASS_URL));
        renderWait(wait, waiting);
        onPress(wait, () => {
            renderWait(wait, setWaiting(leaderId, name, !wait.classList.contains('najane-recurring-wait-on')));
            item.dispatchEvent(new CustomEvent(RowMarksChangedEventName));
            playClick();
        });
        item.addEventListener(RowMarksChangedEventName, () => renderWait(wait, isWaitingOn(leaderId, name)));
        chips.appendChild(wait);
    }

    costContainer.parentElement.insertBefore(chips, costContainer.nextSibling);
}
