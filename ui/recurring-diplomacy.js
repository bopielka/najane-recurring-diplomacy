/**
 * Entry point (game scope) for Recurring Diplomacy by Najane.
 *
 * Starts the sync toggles in the diplomacy screen, the turn-start renewal loop and its toast
 * (documentation/01-what-the-mod-does.md).
 *
 * ⚠️ `console.log` never reaches UI.log; everything goes through ./support/diagnostics.js.
 */
import { BUILD_STAMP } from './support/build-stamp.js';
import { warn } from './support/diagnostics.js';
import './engine/renewal-loop.js';
import { startRenewalToast } from './screen/renewal-toast.js';
import './screen/sync-toggle.js';

startRenewalToast();
warn(`loaded, build ${BUILD_STAMP}`);
