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
 * ⚠️ Sanctions and war never get the hourglass (rule 1: nothing hostile is proposed by the mod).
 */
import { isWaitable, isWaitingOn, setWaiting } from '../engine/renewals.js';
import { warn } from '../support/diagnostics.js';

/** The game's own class on the row's Influence cost (panel-diplomacy-actions.js). */
export const COST_CLASS = 'panel-diplomacy-actions__influence-container';

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
    margin-left: 0.4444444444rem;
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
    border-color: #6b5f4a;
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
    if (!costContainer || !(cost > 0)) {
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
    const waiting = isWaitingOn(leaderId, name);
    // ⚠️ ONLY WHILE THE INFLUENCE IS SHORT, as in Better City UI - or while already marked, so a
    // mark stays visible (and removable) once the treasury has caught up. Never on an action we
    // already have running (user's instruction, 2026-10-30): `PROJECT_ACTIVE`.
    const running = projectData.projectStatus === DiplomacyProjectStatus.PROJECT_ACTIVE;
    // ⚠️ TEMPORARY PROBE: every priced row and the values the hourglass turns on. Remove once the
    // running / short-of-Influence cases are confirmed in game.
    warn(`chips: ${name} for player ${leaderId}: status ${projectData.projectStatus} (active ${DiplomacyProjectStatus.PROJECT_ACTIVE}, `
        + `blocked ${DiplomacyProjectStatus.PROJECT_BLOCKED}), cost ${cost}, balance ${influenceBalance()}, `
        + `waitable ${isWaitable(projectData)}, waiting ${waiting}, reasons ${(projectData.resultData?.FailureReasons ?? []).join(' | ')}`);
    if (!running && isWaitable(projectData) && (cost > influenceBalance() || waiting)) {
        const wait = document.createElement('div');
        wait.className = 'najane-recurring-wait';
        wait.appendChild(iconElement(HOURGLASS_URL));
        renderWait(wait, waiting);
        onPress(wait, () => {
            renderWait(wait, setWaiting(leaderId, name, !wait.classList.contains('najane-recurring-wait-on')));
            playClick();
        });
        chips.appendChild(wait);
    }

    costContainer.parentElement.insertBefore(chips, costContainer.nextSibling);
}
