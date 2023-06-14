
const stateVersion = 3;
export const stateParams = {
/** When the state structure changes this number will be changed */
    stateVersion,
    statePath: `../data/state-v${stateVersion}.json`
} as const;