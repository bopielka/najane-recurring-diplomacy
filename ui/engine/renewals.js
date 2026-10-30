/**
 * Which (leader, agreement) pairs the player wants kept running, and which agreements may be
 * marked at all. Engine layer: the turn-start renewal loop reads this with no screen open.
 *
 * ⚠️ STORED IN THE SAVE, not in localStorage (user's instruction, 2026-10-29): loading an older
 * save must bring back the choices as they were in THAT save. localStorage keyed by the game seed
 * cannot do it - the seed survives a reload, so a toggle set later leaked into the older save.
 * The store is the game's own `Catalog` (core/ui/utilities/utility-serialize.js): dynamic
 * properties of the local player, i.e. part of the save file.
 *
 * Layout: catalog `NajaneRecurringDiplomacy`, object `byAction`, key = action NAME (never the
 * numeric `DiplomacyActionTypes` value), value = the leader ids it is kept running with, joined
 * with ',' in the order they were switched on ('' = none). Catalog version 1, keyed by leader
 * (object `renewals`), is no longer read: it never shipped.
 *
 * A second object, `waiting`, same layout: the actions to START ONCE as soon as the Influence is
 * there (the hourglass chip, user's instruction, 2026-10-30, as in Better City UI). The renewal
 * loop starts each once and drops it; it never renews them.
 *
 * ⚠️ HOW MANY LEADERS ONE ACTION MAY BE KEPT WITH (user's instruction, 2026-10-30): treaties
 * (`SingleInstanceProject="false"`) with every leader at once; every other action - endeavours,
 * espionage - runs ONE instance at a time across all leaders (the column defaults to true), plus
 * the extra instances a trait grants through `DIPLOMACY_BASIC_MODIFIER_VALUE_EXTRA_SINGLE_INSTANCE*`
 * (Benjamin Franklin: +1 endeavour, "two Endeavors of the same type"). Switching one on when the
 * limit is reached drops the leader it was switched on with LONGEST AGO.
 *
 * ⚠️ A PLAYER CATALOG WRITE IS QUEUED: a read in the same frame still returns the old value. The
 * value just written is kept in `pending` until the commit event for that key arrives, and every
 * read goes through it - otherwise a quick second click on the toggle would flip it back wrong.
 */
import { Catalog, CatalogItemCommittedEventName } from '/core/ui/utilities/utility-serialize.js';
import { warn } from '../support/diagnostics.js';

const CATALOG_NAME = 'NajaneRecurringDiplomacy';
const CATALOG_VERSION = 2;
const OBJECT_ID = 'byAction';

/**
 * Groups whose actions may be marked. Sanctions too (user's instruction, 2026-10-30: "if someone
 * wants to keep sanctioning, let them") - the player switches each one on by hand. City-state
 * projects and the unique group (war, alliance) are left to the player; see documentation/03.
 */
const RENEWABLE_GROUPS = [
    'DIPLOMACY_ACTION_GROUP_TREATY',
    'DIPLOMACY_ACTION_GROUP_ENDEAVOR',
    'DIPLOMACY_ACTION_GROUP_ESPIONAGE',
    'DIPLOMACY_ACTION_GROUP_SANCTION',
];

let renewableGroupValues = null;

function renewableGroups() {
    if (renewableGroupValues === null) {
        renewableGroupValues = new Set();
        for (const name of RENEWABLE_GROUPS) {
            const value = DiplomacyActionGroups[name];
            if (value !== undefined) {
                renewableGroupValues.add(value);
            }
        }
    }
    return renewableGroupValues;
}

/**
 * Whether this project, as `DiplomacyManager` hands it to the game's action list, can carry the
 * toggle: a renewable group, aimed at one other player with no second target to pick, and a
 * finite duration - zero-turn actions (Improve Trade Relations, Send Gold) have nothing to renew.
 */
export function isRenewable(projectData) {
    try {
        if (!projectData || !renewableGroups().has(projectData.actionGroup)) {
            return false;
        }
        if (projectData.target1Type !== DiplomacyActionTargetTypes.DIPLOMACY_TARGET_PLAYER) {
            return false;
        }
        if ((projectData.targetList2?.length ?? 0) > 0) {
            return false;
        }
        return Game.Diplomacy.getBaseDiplomaticActionDuration(projectData.actionType) > 0;
    } catch (error) {
        warn(`could not tell whether ${projectData?.actionTypeName} is renewable: ${error}`);
        return false;
    }
}

/**
 * Whether the hourglass may be offered: anything with a single target and no second one to pick,
 * except the unique group (war, alliance). Sanctions are allowed (user's instruction, 2026-10-30).
 */
const NEVER_WAITED_GROUPS = ['DIPLOMACY_ACTION_GROUP_UNIQUE'];

/** Action names whose project asks for a second target ("Target" button), read once. */
let secondTargetActions = null;

/**
 * ⚠️ From the database, not from `targetList2`: an action the player cannot pay for comes with an
 * EMPTY second-target list (Incite Raid, seen in game 2026-10-30), so the list cannot tell.
 */
function asksForSecondTarget(actionTypeName) {
    if (secondTargetActions === null) {
        secondTargetActions = new Set();
        for (const row of GameInfo.DiplomaticProjects_UI_Data) {
            // ⚠️ "None" is spelled DIPLOMACY_TARGET_NONE in the data (diplomacy-actions.xml).
            if (row.Target2Type && row.Target2Type !== 'DIPLOMACY_TARGET_NONE') {
                secondTargetActions.add(row.DiplomacyActionType);
            }
        }
    }
    return secondTargetActions.has(actionTypeName);
}

export function isWaitable(projectData) {
    try {
        if (!projectData || (projectData.targetList2?.length ?? 0) > 0 || asksForSecondTarget(projectData.actionTypeName)) {
            return false;
        }
        return !NEVER_WAITED_GROUPS.some((name) => DiplomacyActionGroups[name] === projectData.actionGroup);
    } catch (error) {
        warn(`could not tell whether ${projectData?.actionTypeName} can wait: ${error}`);
        return false;
    }
}

/**
 * Whether the local player has this action running, with `leaderId` or (null) with anyone.
 * ⚠️ NOT `projectStatus`: a running befriending reads -3 like an unaffordable one, with "already
 * started" as its reason (seen in game 2026-10-30). The game's panel asks `getPlayerEvents` too
 * (`trySupportBefriendIndependent`).
 */
export function isRunning(actionType, leaderId) {
    try {
        const local = GameContext.localPlayerID;
        const events = Game.Diplomacy.getPlayerEvents(leaderId ?? local) ?? [];
        return events.some((event) => event.actionType === actionType
            && (event.initialPlayer === local || event.targetPlayer === local)
            && (leaderId === null || event.initialPlayer === leaderId || event.targetPlayer === leaderId));
    } catch (error) {
        warn(`could not tell whether action ${actionType} is running: ${error}`);
        return false;
    }
}

//#region instance limits
/** Modifier value type -> the action group it widens (null = every group). */
const EXTRA_INSTANCE_MODIFIERS = {
    DIPLOMACY_BASIC_MODIFIER_VALUE_EXTRA_SINGLE_INSTANCE: null,
    DIPLOMACY_BASIC_MODIFIER_VALUE_EXTRA_SINGLE_INSTANCE_ENDEAVOR: 'DIPLOMACY_ACTION_GROUP_ENDEAVOR',
    DIPLOMACY_BASIC_MODIFIER_VALUE_EXTRA_SINGLE_INSTANCE_SANCTION: 'DIPLOMACY_ACTION_GROUP_SANCTION',
};

/** `{ playerId, extras: Map<group value | null, count> }`, built on first use. */
let extraInstances = null;

function readExtraInstances(playerId) {
    const extras = new Map();
    const player = Players.get(playerId);
    const leaderType = GameInfo.Leaders.lookup(player?.leaderType)?.LeaderType;
    const civilizationType = GameInfo.Civilizations.lookup(player?.civilizationType)?.CivilizationType;
    const traits = new Set([
        ...GameInfo.LeaderTraits.filter((row) => row.LeaderType === leaderType).map((row) => row.TraitType),
        ...GameInfo.CivilizationTraits.filter((row) => row.CivilizationType === civilizationType).map((row) => row.TraitType),
    ]);
    const modifiers = new Set(
        GameInfo.TraitModifiers.filter((row) => traits.has(row.TraitType)).map((row) => row.ModifierId),
    );
    const args = GameInfo.ModifierArguments.filter((row) => modifiers.has(row.ModifierId));
    for (const row of args) {
        const slot = /^Modifier(\d+)Type$/.exec(row.Name);
        if (!slot || !(row.Value in EXTRA_INSTANCE_MODIFIERS)) {
            continue;
        }
        const valueName = `Modifier${slot[1]}Value`;
        const valueRow = args.find((other) => other.ModifierId === row.ModifierId && other.Name === valueName);
        const amount = Math.round(Number(valueRow?.Value ?? 1));
        const groupName = EXTRA_INSTANCE_MODIFIERS[row.Value];
        const group = groupName === null ? null : DiplomacyActionGroups[groupName];
        if (Number.isFinite(amount) && group !== undefined) {
            extras.set(group, (extras.get(group) ?? 0) + amount);
        }
    }
    return extras;
}

/**
 * Extra single instances the local player's leader and civilization traits grant, read from the
 * database. ⚠️ Only traits are read: the same effect granted by anything else (none in the base
 * game) is not seen, and the limit is then one too low - a toggle is dropped, nothing is proposed.
 */
function extraInstancesFor(actionGroup) {
    const playerId = GameContext.localPlayerID;
    if (extraInstances?.playerId !== playerId) {
        let extras = new Map();
        try {
            extras = readExtraInstances(playerId);
        } catch (error) {
            warn(`could not read the extra single-instance actions of the local leader: ${error}`);
        }
        extraInstances = { playerId, extras };
    }
    return (extraInstances.extras.get(null) ?? 0) + (extraInstances.extras.get(actionGroup) ?? 0);
}

/** How many leaders this action may be kept running with at once; Infinity for treaties. */
export function instanceLimit(projectData) {
    try {
        const single = GameInfo.DiplomacyActions.lookup(projectData.actionType)?.SingleInstanceProject;
        if (single === false || single === 0 || single === 'false') {
            return Infinity;
        }
        return 1 + Math.max(0, extraInstancesFor(projectData.actionGroup));
    } catch (error) {
        warn(`could not read the instance limit of ${projectData?.actionTypeName}: ${error}`);
        return Infinity;
    }
}
//#endregion

//#region the store
const RENEWALS = OBJECT_ID;
const WAITING = 'waiting';

/** `{ playerId, catalog, objects: { id: object } }` for the local player, built on first use. */
let store = null;

/** `${objectId}|${actionName}` -> leader ids written but not yet committed. */
const pending = new Map();

function storeObject(objectId) {
    const playerId = GameContext.localPlayerID;
    try {
        if (store?.playerId !== playerId) {
            const player = Players.get(playerId);
            if (!player) {
                return null;
            }
            // ⚠️ Never disposed: one per game session, and the module is re-evaluated with the game scope.
            store = { playerId, catalog: new Catalog({ name: CATALOG_NAME, version: CATALOG_VERSION, player }), objects: {} };
            pending.clear();
        }
        if (!store.objects[objectId]) {
            store.objects[objectId] = store.catalog.getObject(objectId);
        }
        return store.objects[objectId];
    } catch (error) {
        warn(`could not open the ${objectId} store in the save: ${error}`);
        return null;
    }
}

window.addEventListener(CatalogItemCommittedEventName, (event) => {
    const detail = event.detail;
    if (detail?.catalogId === CATALOG_NAME) {
        pending.delete(`${detail.objectId}|${detail.key}`);
    }
});

/** Leader ids stored under this action, oldest first. */
function listFor(objectId, actionTypeName) {
    const key = `${objectId}|${actionTypeName}`;
    if (pending.has(key)) {
        return pending.get(key);
    }
    const object = storeObject(objectId);
    if (!object) {
        return [];
    }
    try {
        const raw = object.read(actionTypeName);
        return typeof raw === 'string' && raw.length > 0 ? raw.split(',').map(Number).filter(Number.isFinite) : [];
    } catch (error) {
        warn(`could not read the ${objectId} leaders of ${actionTypeName}: ${error}`);
        return [];
    }
}

function writeList(objectId, actionTypeName, leaders) {
    const object = storeObject(objectId);
    if (!object) {
        return;
    }
    try {
        object.write(actionTypeName, leaders.join(','));
        pending.set(`${objectId}|${actionTypeName}`, leaders);
    } catch (error) {
        warn(`could not save ${objectId} ${actionTypeName}: ${error}`);
    }
}

/** Every non-empty list of one object: `[[actionName, [leaderIds]], ...]`. */
function allLists(objectId) {
    const object = storeObject(objectId);
    if (!object) {
        return [];
    }
    const names = new Set(object.getKeys());
    for (const key of pending.keys()) {
        if (key.startsWith(`${objectId}|`)) {
            names.add(key.slice(objectId.length + 1));
        }
    }
    return [...names].map((name) => [name, listFor(objectId, name)]).filter(([, leaders]) => leaders.length > 0);
}
//#endregion

export function isRenewalOn(leaderId, actionTypeName) {
    return listFor(RENEWALS, actionTypeName).includes(leaderId);
}

/** The leaders that switching this action on for `leaderId` would drop, oldest first. */
export function wouldReplace(leaderId, projectData) {
    const others = listFor(RENEWALS, projectData.actionTypeName).filter((id) => id !== leaderId);
    const excess = others.length + 1 - instanceLimit(projectData);
    return excess > 0 ? others.slice(0, excess) : [];
}

/**
 * ⚠️ RENEWAL AND WAITING EXCLUDE EACH OTHER (user's instruction, 2026-10-30): switching one on for a
 * pair drops the other - a renewal starts the action as soon as it can anyway, and a wait is the
 * "just once" choice. Screens redraw the other control on `RowMarksChangedEventName`.
 */
export const RowMarksChangedEventName = 'najane-recurring-row-marks-changed';

/** @returns the state now in force, so a caller that could not save shows the truth. */
export function setRenewal(leaderId, projectData, on) {
    const name = projectData.actionTypeName;
    const dropped = on ? wouldReplace(leaderId, projectData) : [];
    const leaders = listFor(RENEWALS, name).filter((id) => id !== leaderId && !dropped.includes(id));
    if (on) {
        leaders.push(leaderId);
        if (isWaitingOn(leaderId, name)) {
            writeList(WAITING, name, listFor(WAITING, name).filter((id) => id !== leaderId));
        }
    }
    writeList(RENEWALS, name, leaders);
    return isRenewalOn(leaderId, name);
}

/** Every marked action of this game, for the renewal loop: `[[actionName, [leaderIds]], ...]`. */
export function markedRenewals() {
    return allLists(RENEWALS);
}

export function isWaitingOn(leaderId, actionTypeName) {
    return listFor(WAITING, actionTypeName).includes(leaderId);
}

/** @returns the state now in force. */
export function setWaiting(leaderId, actionTypeName, on) {
    const leaders = listFor(WAITING, actionTypeName).filter((id) => id !== leaderId);
    if (on) {
        leaders.push(leaderId);
        if (isRenewalOn(leaderId, actionTypeName)) {
            writeList(RENEWALS, actionTypeName, listFor(RENEWALS, actionTypeName).filter((id) => id !== leaderId));
        }
    }
    writeList(WAITING, actionTypeName, leaders);
    return isWaitingOn(leaderId, actionTypeName);
}

/** Every action waiting for Influence: `[[actionName, [leaderIds]], ...]`. */
export function markedWaits() {
    return allLists(WAITING);
}
