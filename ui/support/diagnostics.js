/**
 * Logging. The bottom layer: imports nothing from this mod.
 *
 * ⚠️ `console.log` never reaches UI.log - only `console.error` does, so both helpers use it.
 * `log()` is gated on DIAGNOSTICS, which must ship `false`; `warn()` always writes, so anything
 * a player might need to report has to be a `warn`.
 */
export const DIAGNOSTICS = false;

const PREFIX = 'najane-recurring-diplomacy:';

export function log(message) {
    if (DIAGNOSTICS) {
        console.error(`${PREFIX} ${message}`);
    }
}

export function warn(message) {
    console.error(`${PREFIX} ${message}`);
}
