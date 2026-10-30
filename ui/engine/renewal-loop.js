/**
 * The renewal loop: at the start of the local player's turn, propose again every marked
 * (action, leader) pair the game currently allows. Engine layer: runs with no screen open.
 *
 * Nothing here decides whether an agreement is still running: `canStart` says no while it is
 * (the same answer that greys the row in the diplomacy screen), and yes once it has ended. The
 * pattern - `getProjectDataForUI`, `canStart`, `sendRequest` with `{ Amount, Player1, Player2, ID,
 * Type }` - is the one documentation/03-diplomacy-api.md lifts from Better Commerce Screen UI.
 *
 * ⚠️ `sendRequest` QUEUES: `canStart` keeps answering yes for a frame or two. `proposedThisTurn`
 * stops a second proposal in that window; cleared on `LocalPlayerTurnBegin` and `GameStarted`.
 *
 * ⚠️ TEMPORARY PROBE: every proposal and every refusal is written with `warn()`, so the first
 * in-game runs show in UI.log what the engine answered. Move refusals to `log()` once verified.
 *
 * Each proposal is announced on `window` (`RenewalProposedEventName`); screen/renewal-toast.js
 * shows it to the player. Answers (`DiplomacyEventResponse`) are announced as `RenewalAnsweredEventName`. ⚠️ Not yet: the Influence reserve (documentation/01).
 * Only this module subscribes to these two events, so it calls `engine.on` directly; move to a
 * dispatcher (as in Better Commerce's engine/events.js) when a second module needs them.
 */
import { markedRenewals } from './renewals.js';
import { warn } from '../support/diagnostics.js';

/**
 * Announced on `window` for screen/renewal-toast.js; detail `{ name, leaderId, answer }`, answer
 * 'pending', 'started' (espionage), 'accepted' or 'rejected'. Answered: the leader's reply to an earlier proposal.
 */
export const RenewalProposedEventName = 'najane-recurring-renewal-proposed';
export const RenewalAnsweredEventName = 'najane-recurring-renewal-answered';

/** `${actionName}:${leaderId}` proposed since the turn began. */
const proposedThisTurn = new Set();

/** `${actionType}:${leaderId}` → action name, for proposals whose answer has not come yet. */
const awaitingAnswer = new Map();

function answerKey(actionType, leaderId) {
    return `${actionType}:${leaderId}`;
}

function projectFor(leaderId, actionType) {
    const projects = Game.Diplomacy.getProjectDataForUI(
        GameContext.localPlayerID,
        leaderId,
        DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET,
        DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP,
        -1,
        DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET,
    ) ?? [];
    return projects.find((entry) => entry.actionType === actionType) ?? null;
}

function renew(name, leaderId) {
    const key = `${name}:${leaderId}`;
    if (proposedThisTurn.has(key)) {
        return;
    }
    const leader = Players.get(leaderId);
    if (!leader?.isAlive || !leader.isMajor) {
        return;
    }
    const actionType = DiplomacyActionTypes[name];
    if (actionType === undefined) {
        warn(`renewal: unknown action ${name}`);
        return;
    }
    const project = projectFor(leaderId, actionType);
    if (!project) {
        warn(`renewal: ${name} with player ${leaderId} - not offered by the game now`);
        return;
    }
    const args = {
        Amount: 1,
        Player1: GameContext.localPlayerID,
        Player2: leaderId,
        ID: leaderId,
        Type: project.actionType,
    };
    const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, project.operationType, args, false);
    if (result?.Success !== true) {
        // ⚠️ Composed, translated text: logged, never matched.
        warn(`renewal: ${name} with player ${leaderId} - not now: ${(result?.FailureReasons ?? []).join(' | ')}`);
        return;
    }
    Game.PlayerOperations.sendRequest(GameContext.localPlayerID, project.operationType, args);
    proposedThisTurn.add(key);
    warn(`renewal: proposed ${name} to player ${leaderId}`);
    // ⚠️ Espionage is not a proposal: nobody answers it, it simply starts.
    const answered = project.actionGroup === DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ESPIONAGE;
    if (!answered) {
        awaitingAnswer.set(answerKey(project.actionType, leaderId), name);
    }
    window.dispatchEvent(new CustomEvent(RenewalProposedEventName, {
        detail: { name, leaderId, answer: answered ? 'started' : 'pending' },
    }));
}

/**
 * The leader's answer, as the game's own diplomacy hub reads it (panel-diplomacy-hub.js,
 * `onDiplomacyEventResponse`): `DIPLOMACY_RESPONSE_REJECT` is a refusal, anything else agreement.
 */
function onResponse(data) {
    const action = Game.Diplomacy.getDiplomaticEventData(data.actionID);
    if (action?.initialPlayer !== GameContext.localPlayerID) {
        return;
    }
    const key = answerKey(action.actionType, action.targetPlayer);
    const name = awaitingAnswer.get(key);
    // ⚠️ TEMPORARY PROBE: when the answer arrives, relative to the proposal at turn start.
    warn(`renewal: response ${data.response} to action ${action.actionType} from player ${action.targetPlayer} (${name ?? 'not ours'})`);
    if (name === undefined) {
        return;
    }
    awaitingAnswer.delete(key);
    const accepted = data.response !== DiplomaticResponseTypes.DIPLOMACY_RESPONSE_REJECT;
    window.dispatchEvent(new CustomEvent(RenewalAnsweredEventName, {
        detail: { name, leaderId: action.targetPlayer, answer: accepted ? 'accepted' : 'rejected' },
    }));
}

export function runRenewals() {
    for (const [name, leaders] of markedRenewals()) {
        for (const leaderId of leaders) {
            try {
                renew(name, leaderId);
            } catch (error) {
                warn(`renewal of ${name} with player ${leaderId} failed: ${error}`);
            }
        }
    }
}

try {
    engine.on('LocalPlayerTurnBegin', () => {
        proposedThisTurn.clear();
        runRenewals();
    });
    engine.on('GameStarted', () => {
        proposedThisTurn.clear();
        awaitingAnswer.clear();
    });
    engine.on('DiplomacyEventResponse', (data) => {
        try {
            onResponse(data);
        } catch (error) {
            warn(`could not read a diplomatic answer: ${error}`);
        }
    });
} catch (error) {
    warn(`could not listen for the turn start - nothing will be renewed: ${error}`);
}
