import { readJSON, time, writeJSON } from "./utils/utils.js";
import { State } from "./state.utils.js";

const statePath = '../data/state.json';

function updateState(update: Partial<AppState>) {
    const state = readJSON<AppState>(statePath) || {} as AppState;
    writeJSON(statePath, { ...state, ...update });
}

const defState: AppState = (() => {
    const state = readJSON<AppState>(statePath);
    const def: AppState = {
        atomURL: null,
        timeParams: {
            freq: time.min(20),
            jobExpiry: time.hrs(3),
            dayStart: 7,
            dayEnd: 22,
        },
    };

    if (!state) updateState(def);
    return state || def;
})();

// -/-/- // atomURL -- // -/-/- //
export const atomURL = new State(defState.atomURL);
atomURL.on('change', (atomURL) => updateState({ atomURL }));

// -/-/- // params -- // -/-/- //
// const defaultParams = ;

export const timeParams = new State(defState.timeParams);
timeParams.on('change', (timeParams) => updateState({ timeParams }));
