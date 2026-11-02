/**
 * This mod's rows under the shared "Mods" tab of the options screen.
 *
 * ⚠️ Loads in SHELL scope as well as game scope: the options screen exists in the main menu, where
 * there is no game. Nothing here may touch the game at import time.
 */
import '/core/ui/options/screen-options.js'; // must load before the model is touched
import { CategoryType, Options, OptionType } from '/core/ui/options/model-options.js';
import { CategoryData } from '/core/ui/options/options-helpers.js';
import { AUTOMATION_STOP_TURNS, automationStopIndex, setAutomationStopIndex } from '../engine/age-end-setting.js';
import { flushNajaneOptions, registerNajaneOptions } from './najane-mod-options-registry.js';

// ⚠️ Shared with several community mods - created with ??= and the id "mods", never replaced.
CategoryType['Mods'] = 'mods';
CategoryData[CategoryType.Mods] ??= {
    title: 'LOC_UI_CONTENT_MGR_SUBTITLE',
    description: 'LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION',
};

/**
 * ⚠️ `najane_mods_*` is the heading convention shared by every Najane mod; the heading text is
 * derived as `LOC_OPTIONS_GROUP_<GROUP IN CAPITALS>`, so the tag in text/ must be kept in step.
 */
const GROUP = 'najane_mods_recurring';

/** ⚠️ `sort: 50` is this mod's fixed place: specialists 10, city 20, commerce 30, journal 40. */
registerNajaneOptions({
    sort: 50,
    probeId: 'najane-recurring-automation-stop',
    add: () => {
        Options.addOption({
            category: CategoryType.Mods,
            group: GROUP,
            type: OptionType.Dropdown,
            id: 'najane-recurring-automation-stop',
            initListener: (info) => (info.selectedItemIndex = automationStopIndex()),
            updateListener: (_info, value) => setAutomationStopIndex(value),
            label: 'LOC_OPTIONS_NAJANE_RECURRING_AGE_END',
            description: 'LOC_OPTIONS_NAJANE_RECURRING_AGE_END_DESCRIPTION',
            dropdownItems: AUTOMATION_STOP_TURNS.map((turns) => ({ label: `LOC_OPTIONS_NAJANE_RECURRING_AGE_END_TURNS_${turns}` })),
        });
    },
});

// ⚠️ Every Najane mod registers this same flush; the first one to fire adds all of them.
Options.addInitCallback(flushNajaneOptions);
