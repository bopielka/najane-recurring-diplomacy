/**
 * How many turns before the age ends every sync and hourglass mark is switched off. 10 by default,
 * 0 never. A player preference, not game state, so it is the one thing of this mod stored outside
 * the save.
 *
 * ⚠️ In engine/ because ui/options/ loads in SHELL scope and the renewal loop must not import the
 * options screen. Nothing here may touch the game at import time; the value is read on first ask.
 *
 * ⚠️ `UI.getOption` answers 0 for an option never set, so the dropdown's index is stored plus one.
 * And `UI.setOption` does not reach the disk (measured in Better Commerce, 2026-09-30): the mirror in
 * `modSettings[MOD_ID]` is what persists. Read-merge-write only: other mods share that key, and a
 * second top-level `localStorage` key makes several published mods wipe the whole store.
 */
import { warn } from '../support/diagnostics.js';

const MOD_ID = 'najane-recurring-diplomacy';
const OPTION = 'automationStopTurns';

/** ⚠️ Append only: the index is what is stored. */
export const AUTOMATION_STOP_TURNS = [0, 10, 20, 30];
const DEFAULT_INDEX = 1;
const STORED_OFFSET = 1;

let index = null;

function readStored() {
    let stored = 0;
    try {
        stored = Number(UI.getOption('user', 'Mod', `${MOD_ID}.${OPTION}`)) || 0;
    } catch (error) {
        warn(`could not read option ${OPTION}: ${error}`);
    }
    if (stored) {
        return stored;
    }
    try {
        return Number(JSON.parse(localStorage.getItem('modSettings') || '{}')?.[MOD_ID]?.[OPTION]) || 0;
    } catch (error) {
        return 0;
    }
}

function writeStored(stored) {
    try {
        UI.setOption('user', 'Mod', `${MOD_ID}.${OPTION}`, stored);
        Configuration.getUser().saveCheckpoint();
    } catch (error) {
        warn(`could not save option ${OPTION}: ${error}`);
    }
    try {
        const shared = JSON.parse(localStorage.getItem('modSettings') || '{}');
        shared[MOD_ID] ??= {};
        shared[MOD_ID][OPTION] = stored;
        localStorage.setItem('modSettings', JSON.stringify(shared));
    } catch (error) {
        warn(`could not mirror option ${OPTION}: ${error}`);
    }
}

export function automationStopIndex() {
    if (index === null) {
        const stored = readStored() - STORED_OFFSET;
        index = stored in AUTOMATION_STOP_TURNS ? stored : DEFAULT_INDEX;
    }
    return index;
}

export function setAutomationStopIndex(next) {
    const chosen = Number(next);
    index = chosen in AUTOMATION_STOP_TURNS ? chosen : DEFAULT_INDEX;
    writeStored(index + STORED_OFFSET);
}

export function automationStopTurns() {
    return AUTOMATION_STOP_TURNS[automationStopIndex()];
}
