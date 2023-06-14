import { objKeyCheck, readJSON, writeJSON } from "../utils/utils";
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

export function writeState(update: Partial<AppState>) {
    type K = keyof AppState;

    const oldState: WrittenState = readJSON(stateParams.statePath) || {} as any;
    const newState: Partial<WrittenState> = {};

    for (const key in update) {
        const val: any = update[key as K];
        
        if (val instanceof MapState) {
            newState[key as K] = { _t: 'MapState', _v: val.toEntryArr() } as any;
        } else if (val instanceof State) {
            newState[key as K] = { _t: 'State', _v: val.get() } as any;
        } else {
            newState[key as K] = { _t: 'any', _v: val } as any;
        }
    }

    const { ok, missingKeys, val } = objKeyCheck({ ...oldState, ...newState }, { _v: '', chats: '', feeds: '', jobMsgs: '', feedItems: '', users: '' });
    if (!ok)
        throw new Error(`Missing keys in state: [${missingKeys.join(', ')}]`);

    writeJSON(stateParams.statePath, val);
}

/**
 * Reads the state file and returns the state object.
 * If the state file does not exist or the state version
 * is deprecated, default will be used.
 */
export function readState(): AppState {
    const { stateVersion, statePath } = stateParams;

    const ws = readJSON<WrittenState>(statePath);
    const useWS = ws && ws._v._v === stateVersion;
    
    const appState: AppState = {
        _v: stateVersion,
        chats: new MapState(useWS ? ws.chats._v : env.chats),
        feeds: new MapState(useWS ? ws.feeds._v : null),
        jobMsgs: new MapState(useWS ? ws.jobMsgs._v : null),
        feedItems: new MapState(useWS ? ws.feedItems._v : null),
        users: new MapState(useWS ? ws.users._v : env.users),
    };

    return appState;
}
