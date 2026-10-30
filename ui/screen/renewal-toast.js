/**
 * A brief box at the top of the screen when the renewal loop proposed agreements again, modelled
 * on Better Commerce Screen UI's treasure-convoy toast (screen/treasure-toast.js there).
 *
 * ⚠️ Driven by a window event, not by an import: `engine/renewal-loop.js` knows what was proposed,
 * and engine may not import screen - so it announces and this listens.
 *
 * ⚠️ COALESCED: every renewal of a turn is proposed in the same instant at the turn start, so one
 * toast per proposal would replace each other faster than any could be read.
 *
 * ⚠️ Plain DOM on `document.body`, not a game notification: it reports something that already
 * happened, and in the notification train it would be one more item to dismiss every turn.
 *
 * Each bullet is coloured by the leader's answer (user's instruction, 2026-10-30): green agreed,
 * red refused, plain while the answer has not come; espionage, which nobody answers, blue. An answer
 * that arrives while the toast is up recolours its bullet in place.
 */
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { RenewalAnsweredEventName, RenewalProposedEventName } from '../engine/renewal-loop.js';
import { warn } from '../support/diagnostics.js';

const TOAST_ID = 'najane-recurring-renewal-toast';
const VISIBLE_MS = 6000;
/** After the cursor leaves the toast, until it starts to fade. */
const AFTER_HOVER_MS = 2000;
const FADE_MS = 400;
/** Long enough to gather one turn's proposals, short enough to feel immediate. */
const GATHER_MS = 700;

const ANSWER_COLORS = {
    pending: '#d8d8d8',
    accepted: '#8fd47f',
    started: '#7fb6e8',
    rejected: '#e3705f',
};

const pending = [];
/** `${name}:${leaderId}` → the latest answer, for proposals of the toast being gathered or shown. */
const answers = new Map();
/** `${name}:${leaderId}` → the bullet element of the toast on screen. */
const bullets = new Map();
// ⚠️ `undefined`, not `null`: compared with `!== undefined` to mean "a timer is running".
let gatherTimer;
let hideTimer;
let removeTimer;

function actionName(name) {
    // ⚠️ The game's own special case (createStartActionListItem): befriending has a start-row name.
    if (name === 'DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN') {
        return Locale.compose('LOC_DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN_START_ACTION_NAME');
    }
    const key = GameInfo.DiplomacyActions.lookup(DiplomacyActionTypes[name])?.Name;
    return key ? Locale.compose(key) : name;
}

/** A leader's name; an independent power has no leader, so it is named by its people, as its panel does. */
function leaderName(leaderId) {
    const player = Players.get(leaderId);
    const key = player && !player.isMajor ? player.civilizationFullName : player?.leaderName;
    return key ? Locale.compose(key) : String(leaderId);
}

/** No verb anywhere (user's instruction, 2026-10-30: the player knows what it means). */
function entryKey(name, leaderId) {
    return `${name}:${leaderId}`;
}

/** `[[leaderId, leaderName, [{ key, label }]]]`, in proposal order. */
function compose() {
    try {
        const byLeader = new Map();
        for (const entry of pending) {
            const actions = byLeader.get(entry.leaderId) ?? [];
            actions.push({ key: entryKey(entry.name, entry.leaderId), name: entry.name, label: actionName(entry.name) });
            byLeader.set(entry.leaderId, actions);
        }
        return [...byLeader].map(([leaderId, names]) => [leaderId, leaderName(leaderId), names]);
    } catch (error) {
        warn(`could not compose the renewal toast: ${error}`);
        return [];
    }
}

function element(cssText, text) {
    const node = document.createElement('div');
    node.style.cssText = cssText;
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

/** ⚠️ An independent power has no leader portrait: its row shows the first action's own icon. */
function portraitUrl(leaderId, actions) {
    try {
        const player = Players.get(leaderId);
        if (player && !player.isMajor) {
            return GameInfo.DiplomacyActions.lookup(DiplomacyActionTypes[actions[0]?.name])?.UIIconPath
                ?? 'blp:leader_portrait_unknown';
        }
        return Icon.getLeaderPortraitIcon(player.leaderType);
    } catch (error) {
        warn(`could not find the portrait of player ${leaderId}: ${error}`);
        return 'blp:leader_portrait_unknown';
    }
}

/**
 * One row per leader (user's instruction, 2026-10-30): the portrait, then an opaque card with the
 * name in bold and a bullet per action, all left-aligned.
 */
function leaderRow(leaderId, leader, actions) {
    const row = element('display:flex;flex-direction:row;align-items:center;margin-top:0.35rem');
    const portrait = element([
        'flex-shrink:0',
        'width:2.8rem',
        'height:2.8rem',
        'margin-right:0.4rem',
        'background-size:contain',
        'background-repeat:no-repeat',
        'background-position:center',
    ].join(';'));
    portrait.style.backgroundImage = `url("${portraitUrl(leaderId, actions)}")`;
    row.appendChild(portrait);

    const card = element([
        'flex-grow:1',
        'padding:0.3rem 0.6rem',
        'background:rgb(30, 29, 27)',
        'border:1px solid rgba(229, 210, 172, 0.35)',
        'border-radius:0.2rem',
    ].join(';'));
    card.appendChild(element('font-weight:bold;color:#e5d2ac', leader));
    for (const action of actions) {
        const bullet = element('', `• ${action.label}`);
        bullet.style.color = ANSWER_COLORS[answers.get(action.key) ?? 'pending'];
        bullets.set(action.key, bullet);
        card.appendChild(bullet);
    }
    row.appendChild(card);
    return row;
}

function render(groups) {
    if (!document.body || groups.length === 0) {
        return;
    }
    document.getElementById(TOAST_ID)?.remove();
    bullets.clear();
    cancelHide();

    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.classList.add('font-body', 'text-sm', 'text-accent-1');
    toast.style.cssText = [
        'position:fixed',
        /*
         * ⚠️ BELOW the other Najane top strips, which all fire at the turn start: Repair Shop+ at
         * 5.5rem, Better City UI at 9rem, Better Commerce's treasure toast at 12.5rem. At a shared
         * offset the later one simply covers the earlier.
         */
        'top:16rem',
        'left:50%',
        'transform:translateX(-50%)',
        'z-index:9999',
        /*
         * ⚠️ `auto`, not `none`: the toast stays while the cursor is over it (user's instruction,
         * 2026-10-30), which needs the mouse events - and so swallows clicks on the map beneath it.
         */
        'pointer-events:auto',
        'min-width:14rem',
        'text-align:left',
        'padding:0.5rem 0.7rem 0.6rem',
        'background:rgba(5, 8, 18, 0.82)',
        'border:1px solid rgba(229, 210, 172, 0.75)',
        'box-shadow:0 0 1rem rgba(0, 0, 0, 0.65)',
        `transition:opacity ${FADE_MS}ms ease`,
        'opacity:0',
    ].join(';');
    // Title: larger and bold, then a small gap before the first card.
    toast.appendChild(element(
        'font-size:1.15rem;font-weight:bold;color:#e5d2ac;margin-bottom:0.2rem',
        Locale.compose('LOC_NAJANE_RECURRING_TOAST_TITLE'),
    ));
    for (const [leaderId, leader, actions] of groups) {
        toast.appendChild(leaderRow(leaderId, leader, actions));
    }
    document.body.appendChild(toast);

    // ⚠️ Two frames before the fade in, or the transition has nothing to animate from.
    requestAnimationFrame(() => requestAnimationFrame(() => {
        toast.style.opacity = '1';
    }));

    toast.addEventListener('mouseenter', () => {
        cancelHide();
        toast.style.opacity = '1';
    });
    toast.addEventListener('mouseleave', () => scheduleHide(toast, AFTER_HOVER_MS));
    scheduleHide(toast, VISIBLE_MS);
}

/** Stops a pending hide, the fade included: a toast mid-fade is brought back by the caller. */
function cancelHide() {
    clearTimeout(hideTimer);
    clearTimeout(removeTimer);
    hideTimer = undefined;
    removeTimer = undefined;
}

function scheduleHide(toast, delay) {
    cancelHide();
    hideTimer = setTimeout(() => {
        toast.style.opacity = '0';
        removeTimer = setTimeout(() => toast.remove(), FADE_MS);
    }, delay);
}

function announce(detail) {
    try {
        if (!detail?.name) {
            return;
        }
        pending.push({ name: detail.name, leaderId: detail.leaderId });
        if (pending.length === 1) {
            // A new toast: answers to the previous one no longer have a bullet to colour.
            answers.clear();
        }
        answers.set(entryKey(detail.name, detail.leaderId), detail.answer ?? 'pending');
        if (gatherTimer !== undefined) {
            return;
        }
        gatherTimer = setTimeout(() => {
            gatherTimer = undefined;
            const groups = compose();
            pending.length = 0;
            render(groups);
        }, GATHER_MS);
    } catch (error) {
        warn(`could not announce a renewal: ${error}`);
    }
}

/** The leader answered: recolour the bullet if it is on screen, else remember for the render. */
function answer(detail) {
    try {
        if (!detail?.name) {
            return;
        }
        const key = entryKey(detail.name, detail.leaderId);
        answers.set(key, detail.answer);
        const bullet = bullets.get(key);
        if (bullet) {
            bullet.style.color = ANSWER_COLORS[detail.answer] ?? ANSWER_COLORS.pending;
        }
    } catch (error) {
        warn(`could not show a renewal answer: ${error}`);
    }
}

let started = false;

/** Installs the listener, from the entry point: renewals happen with no screen open. */
export function startRenewalToast() {
    if (started) {
        return;
    }
    started = true;
    window.addEventListener(RenewalProposedEventName, (event) => announce(event?.detail));
    window.addEventListener(RenewalAnsweredEventName, (event) => answer(event?.detail));
}
