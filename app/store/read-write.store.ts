import { objKeyCheck, readJSON, writeJSON } from "../utils/utils";
import { MapState } from "./map-state.store";
import { State } from "./state.store";
import { AppState, stateParams } from "./store.types";
import { UserState } from "./user-state.store";

const stateKeyObj: { [K in keyof AppState]: any } =
{
    _v: '', chats: '', feeds: '', jobMsgs: '', feedItems: '', users: ''
};

type WritableState<T> =
{
    [K in keyof T]: 
        T[K] extends UserState                      ? [string, User][]  :
        T[K] extends MapState<string, infer V>      ? [string, V][]     :
        T[K] extends State<infer V>                 ? V                 :
        T[K] 
};

type WrittenState = WritableState<AppState>;

export function writeState(update: Partial<AppState>) {
    const writtenState: WrittenState = readJSON(stateParams.statePath) || {} as any;

    (Object.keys(update) as (keyof AppState)[]).forEach((key) =>
    {
        const val: any = update[key];

        if (val instanceof UserState)
            writtenState[key] = val.entriesArr() as any;
        else if (val instanceof MapState)
            writtenState[key] = val.entriesArr() as any;
        else if (val instanceof State)
            writtenState[key] = val.get() as any;
        else
            writtenState[key] = val as any;
    });

    const { ok, missingKeys, val } = objKeyCheck(writtenState, stateKeyObj);
    if (!ok) throw new Error(`Missing keys in state: [${missingKeys.join(', ')}]`);

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
    const useWS = ws && ws._v === stateVersion;
    
    const appState: AppState = {
        _v:         stateVersion,
        chats:      new MapState(useWS  ? ws.chats      : null),
        feeds:      new MapState(useWS  ? ws.feeds      : null),
        jobMsgs:    new MapState(useWS  ? ws.jobMsgs    : null),
        feedItems:  new MapState(useWS  ? ws.feedItems  : null),
        users:      new UserState(useWS ? ws.users      : env.users),
    };

    return appState;
}
