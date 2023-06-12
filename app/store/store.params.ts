
const stateVersion = 2;
export const stateParams = {
/** When the state structure changes this number will be changed */
    stateVersion,
    statePath: `../data/state-v${stateVersion}.json`
} as const;