import { readJSON, writeJSON } from "../utils/utils";
import { MapState } from "./map-state.store";
import { State } from "./state.store";
import { stateParams } from "./store.params";
import { AppState } from "./store.types";

type WritableState<T> = {
    [K in keyof T]:
        T[K] extends MapState<any, any>
            ? { _t: 'MapState'; _v: [any, any][] } : 
        T[K] extends State<infer S>
            ? { _t: 'State'; _v: S } : { _t: 'any'; _v: T[K] };
};

type WrittenState = WritableState<AppState>;

export async function writeState(update: Partial<AppState>) {
    type K = keyof AppState;

    const oldState: WrittenState = readJSON(stateParams.statePath) || {} as any;
    const newState: Partial<WrittenState> = {};

    for (const key in update) {
        const val: any = update[key as K];
        
        if (val instanceof MapState) {
            newState[key as K] = { t: 'MapState', v: val.toEntryArr() } as any;
        } else if (val instanceof State) {
            newState[key as K] = { t: 'State', v: val.get() } as any;
        } else {
            newState[key as K] = val;
        }
    }

    writeJSON(stateParams.statePath, { ...oldState, ...newState });
}

/**
 * Reads the state file and returns the state object.
 * If the state file does not exist or the state version
 * is deprecated, default will be used.
 */
export function readState(): AppState {
    const { stateVersion, statePath } = stateParams;

    const writtenState = readJSON<WrittenState>(statePath);
    const useWS = writtenState && writtenState._v._v === stateVersion;
    
    const appState: AppState = {
        _v: stateVersion,
        chats: new MapState(useWS ? writtenState.chats._v : env.chats),
        feeds: new MapState(useWS ? writtenState.feeds._v : null),
        jobMsgs: new MapState(useWS ? writtenState.jobMsgs._v : null),
        feedItems: new MapState(useWS ? writtenState.feedItems._v : null),
        users: new MapState(useWS ? writtenState.users._v : env.users),
    };

    Object.keys(appState).forEach((key) => {
        const item = (appState as any)[key];
        if (item instanceof MapState)
            item.on('change', () => writeState({ [key]: item }));
    });

    return appState;
}
